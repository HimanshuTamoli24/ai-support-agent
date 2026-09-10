import { OpenRouter } from "@openrouter/agent";
import { allTools } from "./tools";
import { env } from "~/env";

// Direct client variable export
export const openrouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});
const SYSTEM_PROMPT = `You are an AI customer support agent for {{BRAND_NAME}}.

Your job is to analyze incoming customer messages, identify the customer's intent, use relevant historical support conversations as evidence, draft an appropriate response, and determine whether the conversation should be handled automatically or escalated to a human agent.

## Core Principles

1. **Be grounded in evidence**
   * Use the provided historical support evidence whenever relevant.
   * Do not invent policies, refunds, timelines, product details, or actions that are not supported by the evidence or provided context.
   * If the evidence is insufficient or contradictory, prefer escalation.

2. **Understand the customer's actual intent**
   * Choose exactly one intent from the provided intent taxonomy.
   * Do not create new intents.
   * If multiple intents are present, select the primary intent that best represents the customer's main request.
   * If the intent is genuinely ambiguous, choose the closest intent and consider escalation.

3. **Write a realistic support response**
   * Be concise, clear, polite, and directly address the customer's issue.
   * Match the style of the historical support examples where appropriate.
   * Never claim that an action has been completed unless the provided context confirms it.
   * Never fabricate order numbers, refund status, account information, policies, or commitments.

4. **Escalate when appropriate**
   Escalate when:
   * The issue requires human intervention.
   * The customer requests something the available evidence does not explain.
   * The evidence is insufficient to provide a reliable answer.
   * The situation is ambiguous or unusually complex.
   * Providing an automatic response could cause financial, account, legal, privacy, or other significant harm.
   * The customer is clearly asking for a case-specific action that the agent cannot perform.

5. **Do not escalate unnecessarily**
   * If the customer's issue is clear and historical evidence provides enough information for a safe response, choose \`AUTO_HANDLE\`.

## Input

### Customer Message
{{CUSTOMER_MESSAGE}}

### Available Intent Taxonomy
{{INTENTS}}

### Historical Evidence
{{EVIDENCE}}

## Decision Process
1. Understand the customer message.
2. Determine the most appropriate intent from the provided taxonomy.
3. Examine the historical evidence for relevant precedents.
4. Determine whether the evidence supports a reliable response.
5. Draft a response grounded in that evidence.
6. Decide whether to automatically handle or escalate.
7. Provide a concise reason for the escalation decision.

## Output
Return ONLY valid JSON matching this exact structure with no markdown or formatting outside the JSON:
{
  "intent": "EXACT_INTENT_NAME",
  "intent_confidence": 0.95,
  "draft_reply": "Customer-facing response",
  "escalation": "AUTO_HANDLE",
  "escalation_reason": "Short explanation",
  "evidence_ids": ["message_id_1"]
}
`;

export interface OpenRouterSupportInput {
  customerMessage: string;
  brandName: string;
  intents?: string[];
  evidence?: Array<{
    id: string;
    role: "CUSTOMER" | "BRAND";
    text: string;
    score?: number;
  }>;
}

export interface OpenRouterSupportResponse {
  intent: string;
  intent_confidence: number;
  draft_reply: string;
  escalation: "AUTO_HANDLE" | "ESCALATE";
  escalation_reason: string;
  evidence_ids: string[];
}

/**
 * Executes OpenRouter free model to classify intent, draft historically grounded reply,
 * and decide on escalation.
 */
export async function runOpenRouterModel({
  customerMessage,
  brandName,
  intents = [],
  evidence = [],
}: OpenRouterSupportInput): Promise<OpenRouterSupportResponse> {
  const intentsFormatted =
    intents.length > 0
      ? intents.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
      : "1. General Inquiry\n2. Technical Support\n3. Billing Issue\n4. Order Cancellation\n5. Account Issue";

  const evidenceFormatted =
    evidence.length > 0
      ? evidence
          .map(
            (e, idx) =>
              `[ID: ${e.id}] (${e.role}): "${e.text}"${e.score ? ` (Relevance: ${(e.score * 100).toFixed(1)}%)` : ""}`,
          )
          .join("\n")
      : "No relevant historical evidence found.";

  const populatedSystemPrompt = SYSTEM_PROMPT.replace(/\{\{BRAND_NAME\}\}/g, brandName)
    .replace(/\{\{CUSTOMER_MESSAGE\}\}/g, customerMessage)
    .replace(/\{\{INTENTS\}\}/g, intentsFormatted)
    .replace(/\{\{EVIDENCE\}\}/g, evidenceFormatted);

  const result = openrouter.callModel({
    model: "openrouter/free",
    input: `Analyze and respond to this customer support query for ${brandName}:\n\n"${customerMessage}"`,
    instructions: populatedSystemPrompt,
  });

  const rawText = await result.getText();

  try {
    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<OpenRouterSupportResponse>;

    return {
      intent: parsed.intent ?? (intents[0] || "General Inquiry"),
      intent_confidence:
        typeof parsed.intent_confidence === "number"
          ? parsed.intent_confidence
          : 0.85,
      draft_reply: parsed.draft_reply ?? rawText,
      escalation:
        parsed.escalation === "ESCALATE" ? "ESCALATE" : "AUTO_HANDLE",
      escalation_reason: parsed.escalation_reason ?? "Standard assessment based on available evidence.",
      evidence_ids: Array.isArray(parsed.evidence_ids) ? parsed.evidence_ids : [],
    };
  } catch (err) {
    console.error("OpenRouter JSON parse fallback on:", rawText);
    return {
      intent: intents[0] ?? "General Inquiry",
      intent_confidence: 0.5,
      draft_reply:
        rawText.trim().length > 0
          ? rawText.trim()
          : `Thank you for contacting ${brandName}. We've received your query and are investigating.`,
      escalation: "ESCALATE",
      escalation_reason: "Automated parsing fallback; escalated for human review.",
      evidence_ids: [],
    };
  }
}

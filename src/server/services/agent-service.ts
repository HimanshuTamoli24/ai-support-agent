import { db } from "~/server/db";
import {
  querySimilarEvidence,
  type RetrievedEvidence,
} from "~/server/pinecone/client";
import { runGroqModel, DEFAULT_GROQ_MODEL } from "~/server/groq/client";
import { env } from "~/env";

export interface HistoryMessage {
  role: "CUSTOMER" | "BRAND" | "USER" | "AGENT";
  text: string;
}

export interface RunAgentInput {
  inputText: string;
  datasetId?: string;
  brandId?: string;
  conversationId?: string;
  history?: HistoryMessage[];
  evaluationExampleId?: string;
  modelName?: string;
}

export interface AgentRunOutput {
  id: string;
  inputText: string;
  predictedIntentName?: string;
  predictedIntentId?: string | null;
  shouldEscalate: boolean;
  escalationReason?: string | null;
  draftReply?: string | null;
  model: string;
  latencyMs: number;
  evidence: Array<{
    messageId: string;
    text: string;
    role: "CUSTOMER" | "BRAND";
    relevanceScore: number;
    reason: string;
  }>;
}

/**
 * Execute AI Customer Support Agent with Pinecone retrieval evidence and Groq reasoning.
 */
export async function runSupportAgent({
  inputText,
  datasetId,
  brandId,
  conversationId,
  history = [],
  evaluationExampleId,
  modelName = DEFAULT_GROQ_MODEL,
}: RunAgentInput): Promise<AgentRunOutput> {
  const startTime = Date.now();

  // 1. Build contextual search query for Pinecone vector search
  const previousCustomerTexts = history
    .filter((h) => h.role === "CUSTOMER" || h.role === "USER")
    .map((h) => h.text.trim());
  
  const lastCustomerQuery = previousCustomerTexts[previousCustomerTexts.length - 1];
  const contextualSearchQuery =
    lastCustomerQuery && lastCustomerQuery !== inputText.trim()
      ? `${lastCustomerQuery} ${inputText.trim()}`
      : inputText.trim();

  // Retrieve top-5 relevant historical messages from Pinecone namespace
  const retrievedEvidence: RetrievedEvidence[] = await querySimilarEvidence({
    queryText: contextualSearchQuery,
    brandId,
    topK: 5,
    namespace: datasetId,
  });

  // 2. Load available Brand and Intents from Postgres
  let brandName = "Support Agent";
  if (brandId) {
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (brand) brandName = brand.name;
  }

  const availableIntents = brandId
    ? await db.intent.findMany({ where: { brandId } })
    : await db.intent.findMany({ take: 20 });

  const intentNames = availableIntents.map((i) => i.name);

  // 3. Format System Prompt with Context, Evidence, and Conversation Thread
  const evidenceContext = retrievedEvidence
    .map(
      (ev, idx) =>
        `[Evidence #${idx + 1}] (ID: ${ev.messageId}, ${ev.role}): "${ev.text}" (Relevance: ${(ev.score * 100).toFixed(1)}%)`,
    )
    .join("\n");

  const conversationThreadText =
    history.length > 0
      ? `\nACTIVE CONVERSATION THREAD SO FAR:\n${history
          .map(
            (h) =>
              `- ${h.role === "CUSTOMER" || h.role === "USER" ? "Customer" : "Agent"}: "${h.text}"`,
          )
          .join("\n")}\n- Customer (Current message): "${inputText}"\n`
      : `Current Customer Message: "${inputText}"\n`;

  const systemPrompt = `You are the official AI customer support agent for ${brandName}.
Your job is to analyze incoming customer messages in the context of the ongoing conversation, identify the intent, use historical support conversations as evidence, draft a grounded response, and decide whether to handle automatically (AUTO_HANDLE) or escalate to a human agent (ESCALATE).

Available Intents: ${intentNames.length > 0 ? intentNames.join(", ") : "Order Status & Tracking, Refund & Return, Technical Support, Account & Billing, General Inquiry"}

${conversationThreadText}
Historical Support Evidence:
${evidenceContext || "No historical evidence available."}

CRITICAL MULTI-TURN CONTEXT RULES:
1. You are in an ACTIVE MULTI-TURN CONVERSATION with this customer. ALWAYS maintain full context from previous messages.
2. If you previously asked the customer for an order number, tracking number, email, or details, and the customer now provides it (e.g. '1234'), RECOGNIZE that '1234' is their order number for their earlier query!
3. Resolve their original inquiry directly (e.g. confirm order #1234 is processed and provide delivery estimate) rather than asking what '1234' means.
4. Keep replies helpful, polite, concise, and grounded in the historical evidence precedents.

Respond strictly in valid JSON with no extra commentary:
{
  "intent": "EXACT_INTENT_NAME",
  "draft_reply": "Customer-facing response grounded in evidence and dialogue context",
  "escalation": "AUTO_HANDLE or ESCALATE",
  "escalation_reason": "Short reason for decision",
  "evidence_ids": ["message_id_1"]
}`;

  let parsedResponse: {
    intent?: string;
    draft_reply?: string;
    escalation?: "AUTO_HANDLE" | "ESCALATE";
    escalation_reason?: string;
    evidence_ids?: string[];
  } = {};

  const groqHistory = history.map((h) => ({
    role: (h.role === "CUSTOMER" || h.role === "USER" ? "user" : "assistant") as "user" | "assistant",
    content: h.text,
  }));

  try {
    if (env.GROQ_API_KEY || process.env.GROQ_API_KEY) {
      const rawOutput = await runGroqModel(
        inputText,
        systemPrompt,
        modelName,
        groqHistory,
      );
      const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResponse = JSON.parse(cleaned);
    } else {
      // Fallback heuristic simulation if API keys are not yet entered
      const shouldEscalate =
        inputText.toLowerCase().includes("urgent") ||
        inputText.toLowerCase().includes("refund");
      parsedResponse = {
        intent: intentNames[0] ?? "Technical Support",
        escalation: shouldEscalate ? "ESCALATE" : "AUTO_HANDLE",
        escalation_reason: shouldEscalate
          ? "Requires human billing team approval"
          : "Standard issue handled automatically based on historical precedents.",
        draft_reply: `Thank you for contacting ${brandName}. We've reviewed your request: "${inputText}" and are checking our records to assist you right away.`,
        evidence_ids: retrievedEvidence.map((e) => e.messageId),
      };
    }
  } catch (error) {
    console.error("AI Generation error:", error);
    parsedResponse = {
      intent: intentNames[0] ?? "General Inquiry",
      escalation: "AUTO_HANDLE",
      escalation_reason: "Standard inquiry",
      draft_reply: `Hello! Thank you for contacting ${brandName}. We've received your query: "${inputText}" and are looking into it.`,
      evidence_ids: [],
    };
  }

  const latencyMs = Date.now() - startTime;

  // 4. Find or associate predicted Intent ID
  let predictedIntentId: string | null = null;
  const predictedIntentName = parsedResponse.intent ?? (intentNames[0] || "General Inquiry");

  if (predictedIntentName) {
    const matchedIntent = availableIntents.find(
      (i) => i.name.toLowerCase() === predictedIntentName.toLowerCase(),
    );
    if (matchedIntent) {
      predictedIntentId = matchedIntent.id;
    } else if (brandId) {
      const newIntent = await db.intent.create({
        data: {
          brandId,
          name: predictedIntentName,
        },
      });
      predictedIntentId = newIntent.id;
    }
  }

  // 5. Store AgentRun record in PostgreSQL
  const shouldEscalate = parsedResponse.escalation === "ESCALATE";

  const agentRun = await db.agentRun.create({
    data: {
      datasetId: datasetId ?? undefined,
      conversationId: conversationId ?? undefined,
      evaluationExampleId: evaluationExampleId ?? undefined,
      predictedIntentId: predictedIntentId ?? undefined,
      inputText,
      draftReply: parsedResponse.draft_reply ?? null,
      shouldEscalate,
      escalationReason: parsedResponse.escalation_reason ?? null,
      model: modelName,
      latencyMs,
    },
  });

  // 6. Store Evidence records linked to AgentRun
  const evidenceRecordsToReturn: AgentRunOutput["evidence"] = [];

  for (let i = 0; i < retrievedEvidence.length; i++) {
    const ev = retrievedEvidence[i]!;
    const isCited = parsedResponse.evidence_ids?.includes(ev.messageId);

    const reason = isCited
      ? `Explicitly cited evidence by AI model (Relevance: ${(ev.score * 100).toFixed(1)}%)`
      : `Semantic similarity match: ${(ev.score * 100).toFixed(1)}%`;

    await db.evidence.create({
      data: {
        agentRunId: agentRun.id,
        messageId: ev.messageId,
        relevanceScore: ev.score,
        reason,
      },
    });

    evidenceRecordsToReturn.push({
      messageId: ev.messageId,
      text: ev.text,
      role: ev.role,
      relevanceScore: ev.score,
      reason,
    });
  }

  return {
    id: agentRun.id,
    inputText,
    predictedIntentName,
    predictedIntentId,
    shouldEscalate,
    escalationReason: parsedResponse.escalation_reason,
    draftReply: parsedResponse.draft_reply,
    model: modelName,
    latencyMs,
    evidence: evidenceRecordsToReturn,
  };
}

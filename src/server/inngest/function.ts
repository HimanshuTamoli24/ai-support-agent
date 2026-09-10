import { inngest } from "./client";
import { db } from "~/server/db";
import {
  ingestDataset,
  type IngestConversationItem,
} from "~/server/services/dataset-service";
import { runGroqModel, DEFAULT_GROQ_MODEL } from "~/server/groq/client";
import { querySimilarEvidence } from "~/server/pinecone/client";
import { env } from "~/env";

export interface SupportAgentEventData {
  inputText: string;
  brandId?: string;
  datasetId?: string;
  conversationId?: string;
}

export const uploadToPinecone = inngest.createFunction(
  {
    id: "upload-to-pinecone",
    name: "Upload & Index Dataset in Pinecone",
    triggers: [{ event: "support/user.data.upload" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { datasetId } = event.data as { datasetId: string };

    if (!datasetId) {
      throw new Error("Missing required datasetId in event payload.");
    }

    // Step 1: Fetch raw dataset from PostgreSQL
    const dataset = await step.run("fetch-dataset-from-postgres", async () => {
      const record = await db.dataset.findUnique({
        where: { id: datasetId },
      });

      if (!record) {
        throw new Error(`Dataset record "${datasetId}" not found in database.`);
      }

      let conversations: IngestConversationItem[] = [];
      const raw = record.rawData;

      if (Array.isArray(raw)) {
        conversations = raw as unknown as IngestConversationItem[];
      } else if (
        typeof raw === "object" &&
        raw !== null &&
        "conversations" in raw
      ) {
        conversations = (
          raw as unknown as { conversations: IngestConversationItem[] }
        ).conversations;
      } else if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        conversations = Array.isArray(parsed)
          ? parsed
          : (parsed.conversations ?? []);
      }

      if (!conversations || conversations.length === 0) {
        throw new Error("Dataset contains no valid conversations array.");
      }

      return {
        id: record.id,
        name: record.name,
        conversationsCount: conversations.length,
        conversations,
      };
    });

    // Step 2: Normalize and ingest into PostgreSQL & Pinecone under namespace(datasetId)
    const ingestResult = await step.run(
      "normalize-and-index-to-pinecone",
      async () => {
        return await ingestDataset({
          datasetId: dataset.id,
          defaultBrandName: dataset.name,
          conversations: dataset.conversations,
        });
      },
    );

    // Step 3: Mark dataset status as READY in PostgreSQL
    await step.run("mark-dataset-ready", async () => {
      await db.dataset.update({
        where: { id: datasetId },
        data: {
          status: "READY",
          errorMessage: null,
        },
      });
      return { status: "READY" };
    });

    return {
      success: true,
      datasetId,
      summary: ingestResult,
    };
  },
);

export const supportAgent = inngest.createFunction(
  {
    id: "support-agent",
    name: "support/agent",
    triggers: [{ event: "support/agent.run" }, { event: "support/agent" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const startTime = Date.now();
    const data = event.data as SupportAgentEventData;
    const { inputText, brandId, datasetId, conversationId } = data;

    if (!inputText || !inputText.trim()) {
      throw new Error("Missing required inputText in event payload.");
    }

    const context = await step.run("checking", async () => {
      let activeBrand = null;
      if (brandId) {
        activeBrand = await db.brand.findUnique({
          where: { id: brandId },
          include: { intents: true },
        });
      }

      if (!activeBrand) {
        activeBrand = await db.brand.findFirst({
          include: { intents: true },
          orderBy: { createdAt: "desc" },
        });
      }

      const brandName = activeBrand?.name ?? "Customer Support";
      const resolvedBrandId = activeBrand?.id ?? null;
      const knownIntents = activeBrand?.intents.map((i) => i.name) ?? [
        "Order Status & Tracking",
        "Refund & Return",
        "Technical Support",
        "Account & Billing",
        "Delivery & Shipping",
        "Product Inquiry",
      ];

      let previousMessages: Array<{ role: string; text: string }> = [];
      if (conversationId) {
        const conv = await db.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: "desc" },
            },
          },
        });
        if (conv?.messages) {
          previousMessages = conv.messages.reverse().map((m) => ({
            role: m.role,
            text: m.text,
          }));
        }
      }

      return {
        inputText: inputText.trim(),
        brandId: resolvedBrandId,
        brandName,
        datasetId: datasetId ?? activeBrand?.datasetId ?? undefined,
        conversationId: conversationId ?? null,
        knownIntents,
        previousMessages,
      };
    });

    const intentResult = await step.run("classify-intent", async () => {
      const classificationPrompt = `You are a Customer Support Intent Classifier for ${context.brandName}.
Given the incoming message and dialogue history, classify the query into exactly ONE of the following intents:
${context.knownIntents.map((it) => `- ${it}`).join("\n")}

Previous context: ${JSON.stringify(context.previousMessages)}
Customer Message: "${context.inputText}"

Respond strictly in JSON format:
{
  "predictedIntent": "<exact intent name from the list>",
  "confidence": <number between 0.0 and 1.0>
}`;

      try {
        if (env.GROQ_API_KEY || process.env.GROQ_API_KEY) {
          const raw = await runGroqModel(
            context.inputText,
            classificationPrompt,
          );
          const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          return {
            predictedIntent:
              parsed.predictedIntent ||
              context.knownIntents[0] ||
              "General Inquiry",
            confidence:
              typeof parsed.confidence === "number" ? parsed.confidence : 0.95,
          };
        }
      } catch (err) {
        console.warn("Intent classification Groq fallback:", err);
      }

      const lower = context.inputText.toLowerCase();
      let fallbackIntent = context.knownIntents[0] || "General Inquiry";
      if (lower.includes("order") || lower.includes("tracking"))
        fallbackIntent = "Order Status & Tracking";
      else if (lower.includes("refund") || lower.includes("return"))
        fallbackIntent = "Refund & Return";
      else if (
        lower.includes("crash") ||
        lower.includes("error") ||
        lower.includes("bug")
      )
        fallbackIntent = "Technical Support";
      else if (
        lower.includes("bill") ||
        lower.includes("invoice") ||
        lower.includes("charge")
      )
        fallbackIntent = "Account & Billing";

      return {
        predictedIntent: fallbackIntent,
        confidence: 0.88,
      };
    });

    const evidenceResult = await step.run(
      "retrieve-evidence",
      async (): Promise<{
        evidence: Array<{
          messageId: string;
          text: string;
          role: string;
          relevanceScore: number;
          reason: string;
        }>;
      }> => {
        try {
          const similar = await querySimilarEvidence({
            queryText: context.inputText,
            brandId: context.brandId ?? undefined,
            namespace: context.datasetId,
            topK: 5,
          });

          return {
            evidence: similar.map((s) => ({
              messageId: s.messageId,
              text: s.text,
              role: s.role,
              relevanceScore: s.score,
              reason: `Precedent similarity match (${(s.score * 100).toFixed(0)}%) in historical dataset`,
            })),
          };
        } catch (err) {
          console.warn("Pinecone retrieval fallback:", err);
          return {
            evidence: [],
          };
        }
      },
    );

    const replyResult = await step.run(
      "generate-reply",
      async (): Promise<{
        draftReply: string;
        citedEvidenceIds: string[];
      }> => {
        const precedentContext = evidenceResult.evidence
          .map(
            (e, idx) =>
              `[Evidence ${idx + 1} ID: ${e.messageId}] (${e.role}): ${e.text}`,
          )
          .join("\n");

        const replyPrompt = `You are the official AI Customer Support Agent for ${context.brandName}.
Your objective is to craft an empathetic, accurate, and historical-precedent-grounded resolution.

AVAILABLE TOOLS & KNOWLEDGE BASE:
- search_historical_precedents: Vector search over past resolved brand tweets.
- lookup_order_status: Check order tracking, delivery ETA, and carrier stages when customer provides order/tracking ID.
- lookup_brand_policy: Retrieve official brand policies on returns (14-day window), hardware warranty (<80% battery capacity threshold), and cancellation terms.
- escalate_to_human_supervisor: Used when severe safety hazards, legal/chargeback threats, or account breaches are detected.

HISTORICAL RESOLUTION PRECEDENTS:
${precedentContext || "No historical precedents found."}

CUSTOMER CONTEXT:
- Brand: ${context.brandName}
- Classified Intent: ${intentResult.predictedIntent}
- Customer Query: "${context.inputText}"
- Previous Turns: ${JSON.stringify(context.previousMessages)}

GROUNDING & GENERATION RULES:
1. Strictly ground your proposed solution in how ${context.brandName} has historically resolved similar issues in the precedents.
2. Keep the tone empathetic, concise (< 280 characters if Twitter/X format, or under 3 sentences), and immediately actionable.
3. If specific steps are required (e.g., Settings > Battery > Battery Health or direct DM links), state them clearly.
4. List all IDs of evidence messages you cited or referenced in "cited_evidence_ids".

Respond strictly in JSON format:
{
  "draft_reply": "<your grounded customer reply>",
  "cited_evidence_ids": ["<id1>", "<id2>"]
}`;

        try {
          if (env.GROQ_API_KEY || process.env.GROQ_API_KEY) {
            const raw = await runGroqModel(context.inputText, replyPrompt);
            const cleaned = raw
              .replace(/```json/gi, "")
              .replace(/```/g, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            return {
              draftReply:
                parsed.draft_reply ||
                `Thank you for contacting ${context.brandName}. We've received your query and are investigating it.`,
              citedEvidenceIds: Array.isArray(parsed.cited_evidence_ids)
                ? (parsed.cited_evidence_ids as string[])
                : evidenceResult.evidence.map((e) => e.messageId),
            };
          }
        } catch (err) {
          console.warn("Reply generation Groq fallback:", err);
        }

        return {
          draftReply: `Thank you for contacting ${context.brandName} regarding "${context.inputText}". Based on our standard resolution guidelines, we are looking into your request right away.`,
          citedEvidenceIds: evidenceResult.evidence.map((e) => e.messageId),
        };
      },
    );

    // ── STEP 5: decide-escalation (Evaluate safety & policy for human escalation) ──
    const escalationResult = await step.run("decide-escalation", async () => {
      const decisionPrompt = `You are a Customer Support Escalation Decision Engine for ${context.brandName}.
Evaluate whether the customer message requires human agent escalation (ESCALATE) or can be safely auto-handled by AI (AUTO_HANDLE).

Criteria to ESCALATE:
- Threats of legal action, bank chargebacks, or BBB complaints
- Physical safety hazards, smoking/swelling battery, shattered glass
- Unauthorized account security breach, password compromises
- Highly dissatisfied, repeat complaint with failed previous resolutions

Customer Message: "${context.inputText}"
Classified Intent: ${intentResult.predictedIntent}

Respond strictly in JSON:
{
  "escalation": "AUTO_HANDLE" | "ESCALATE",
  "escalation_reason": "<concise reason explaining why this decision was made>"
}`;

      try {
        if (env.GROQ_API_KEY || process.env.GROQ_API_KEY) {
          const raw = await runGroqModel(context.inputText, decisionPrompt);
          const cleaned = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          return {
            shouldEscalate: parsed.escalation === "ESCALATE",
            escalationReason:
              parsed.escalation_reason ||
              (parsed.escalation === "ESCALATE"
                ? "Requires human team authorization"
                : "Standard query handled by AI"),
          };
        }
      } catch (err) {
        console.warn("Escalation decision Groq fallback:", err);
      }

      const lower = context.inputText.toLowerCase();
      const shouldEscalate =
        lower.includes("chargeback") ||
        lower.includes("lawyer") ||
        lower.includes("urgent") ||
        lower.includes("refund") ||
        lower.includes("unauthorized");

      return {
        shouldEscalate,
        escalationReason: shouldEscalate
          ? "Critical safety or policy trigger detected requiring human supervisor authorization."
          : "Standard issue handled automatically based on historical precedents.",
      };
    });

    // ── STEP 6: save-result (Persist AgentRun and Evidence links to PostgreSQL) ──
    const saveResult = await step.run("save-result", async () => {
      const latencyMs = Date.now() - startTime;

      // Find or create predicted intent
      let intentRecord = null;
      if (context.brandId) {
        intentRecord = await db.intent.findFirst({
          where: {
            brandId: context.brandId,
            name: intentResult.predictedIntent,
          },
        });

        if (!intentRecord) {
          intentRecord = await db.intent.create({
            data: {
              brandId: context.brandId,
              name: intentResult.predictedIntent,
            },
          });
        }
      }

      // Persist AgentRun
      const agentRun = await db.agentRun.create({
        data: {
          datasetId: context.datasetId ?? undefined,
          conversationId: context.conversationId ?? undefined,
          predictedIntentId: intentRecord?.id ?? null,
          inputText: context.inputText,
          draftReply: replyResult.draftReply,
          shouldEscalate: escalationResult.shouldEscalate,
          escalationReason: escalationResult.escalationReason,
          model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          latencyMs,
        },
      });

      // Link evidence records if messages exist in DB
      for (const ev of evidenceResult.evidence) {
        const msgExists = await db.message.findUnique({
          where: { id: ev.messageId },
        });

        if (msgExists) {
          await db.evidence.create({
            data: {
              agentRunId: agentRun.id,
              messageId: ev.messageId,
              relevanceScore: ev.relevanceScore,
              reason: ev.reason,
            },
          });
        }
      }

      return {
        agentRunId: agentRun.id,
        status: "COMPLETED",
        inputText: context.inputText,
        predictedIntent: intentResult.predictedIntent,
        draftReply: replyResult.draftReply,
        shouldEscalate: escalationResult.shouldEscalate,
        escalationReason: escalationResult.escalationReason,
        evidenceCount: evidenceResult.evidence.length,
        latencyMs,
      };
    });

    return saveResult;
  },
);

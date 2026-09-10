import { db } from "~/server/db";
import {
  querySimilarEvidence,
  type RetrievedEvidence,
} from "~/server/pinecone/client";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { env } from "~/env";

export interface RunAgentInput {
  inputText: string;
  brandId?: string;
  conversationId?: string;
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
 * Execute AI Customer Support Agent with Pinecone retrieval evidence.
 */
export async function runSupportAgent({
  inputText,
  brandId,
  conversationId,
  evaluationExampleId,
  modelName = "gemini-2.5-flash",
}: RunAgentInput): Promise<AgentRunOutput> {
  const startTime = Date.now();

  // 1. Retrieve top-5 relevant historical messages from Pinecone
  const retrievedEvidence: RetrievedEvidence[] = await querySimilarEvidence({
    queryText: inputText,
    brandId,
    topK: 5,
  });

  // 2. Load available Intents for this Brand from Postgres
  const availableIntents = brandId
    ? await db.intent.findMany({ where: { brandId } })
    : await db.intent.findMany({ take: 20 });

  const intentNames = availableIntents.map((i) => i.name);

  // 3. Format Prompt with Context & Evidence
  const evidenceContext = retrievedEvidence
    .map(
      (ev, idx) =>
        `[Evidence #${idx + 1}] (${ev.role}): "${ev.text}" (Similarity: ${(ev.score * 100).toFixed(1)}%)`,
    )
    .join("\n");

  const systemPrompt = `You are an expert AI Customer Support Agent.
Your task is to analyze an incoming customer message, determine if it needs escalation to human agents, classify its intent, and generate a polite, accurate draft reply using the retrieved historical context.

Available Intents: ${intentNames.length > 0 ? intentNames.join(", ") : "General Inquiry, Bug Report, Billing, Account Issue, Cancellation, Feature Request, Technical Support"}

Retrieved Historical Evidence from previous support conversations:
${evidenceContext || "No historical evidence retrieved."}

Output strictly valid JSON with the following structure:
{
  "predictedIntent": "string (one of the available intents or best fit)",
  "shouldEscalate": boolean,
  "escalationReason": "string explanation if shouldEscalate is true, otherwise null",
  "draftReply": "string (draft message to send to the customer in empathetic brand tone)",
  "evidenceEvaluation": [
    {
      "evidenceIndex": number,
      "reason": "how this evidence helped formulate the reply or decide escalation"
    }
  ]
}`;

  let parsedResponse: {
    predictedIntent?: string;
    shouldEscalate?: boolean;
    escalationReason?: string | null;
    draftReply?: string;
    evidenceEvaluation?: Array<{ evidenceIndex: number; reason: string }>;
  } = {};

  const effectiveModel = modelName;

  try {
    if (env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nCustomer Query: "${inputText}"` },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        parsedResponse = JSON.parse(response.text);
      }
    } else if (env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Customer Query: "${inputText}"` },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        parsedResponse = JSON.parse(content);
      }
    } else {
      // Fallback heuristic simulation if API keys are not yet entered
      parsedResponse = {
        predictedIntent: intentNames[0] ?? "Technical Support",
        shouldEscalate:
          inputText.toLowerCase().includes("urgent") ||
          inputText.toLowerCase().includes("refund"),
        escalationReason: inputText.toLowerCase().includes("refund")
          ? "Requires human billing team approval"
          : null,
        draftReply: `Thank you for contacting us. We've reviewed your request: "${inputText}" and are checking our records to assist you right away.`,
        evidenceEvaluation: retrievedEvidence.map((_, i) => ({
          evidenceIndex: i + 1,
          reason: "Relevant historical context match.",
        })),
      };
    }
  } catch (error) {
    console.error("AI Generation error:", error);
    parsedResponse = {
      predictedIntent: intentNames[0] ?? "General Inquiry",
      shouldEscalate: false,
      escalationReason: null,
      draftReply: `Hello! We've received your query: "${inputText}" and are looking into it.`,
      evidenceEvaluation: [],
    };
  }

  const latencyMs = Date.now() - startTime;

  // 4. Find or associate predicted Intent ID
  let predictedIntentId: string | null = null;
  if (parsedResponse.predictedIntent) {
    const matchedIntent = availableIntents.find(
      (i) =>
        i.name.toLowerCase() === parsedResponse.predictedIntent?.toLowerCase(),
    );
    if (matchedIntent) {
      predictedIntentId = matchedIntent.id;
    } else if (brandId) {
      // Create intent if new
      const newIntent = await db.intent.create({
        data: {
          brandId,
          name: parsedResponse.predictedIntent,
        },
      });
      predictedIntentId = newIntent.id;
    }
  }

  // 5. Store AgentRun record in PostgreSQL
  const agentRun = await db.agentRun.create({
    data: {
      conversationId: conversationId ?? undefined,
      evaluationExampleId: evaluationExampleId ?? undefined,
      predictedIntentId: predictedIntentId ?? undefined,
      inputText,
      draftReply: parsedResponse.draftReply ?? null,
      shouldEscalate: parsedResponse.shouldEscalate ?? false,
      escalationReason: parsedResponse.escalationReason ?? null,
      model: effectiveModel,
      latencyMs,
    },
  });

  // 6. Store Evidence records linked to AgentRun
  const evidenceRecordsToReturn: AgentRunOutput["evidence"] = [];

  for (let i = 0; i < retrievedEvidence.length; i++) {
    const ev = retrievedEvidence[i]!;
    const evalItem = parsedResponse.evidenceEvaluation?.find(
      (e) => e.evidenceIndex === i + 1,
    );

    const reason =
      evalItem?.reason ??
      `Semantic similarity score: ${(ev.score * 100).toFixed(1)}%`;

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
    predictedIntentName: parsedResponse.predictedIntent,
    predictedIntentId,
    shouldEscalate: parsedResponse.shouldEscalate ?? false,
    escalationReason: parsedResponse.escalationReason,
    draftReply: parsedResponse.draftReply,
    model: effectiveModel,
    latencyMs,
    evidence: evidenceRecordsToReturn,
  };
}

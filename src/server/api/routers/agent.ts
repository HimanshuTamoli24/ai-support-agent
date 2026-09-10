import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  ingestDataset,
  type IngestConversationItem,
} from "~/server/services/dataset-service";
import { runSupportAgent } from "~/server/services/agent-service";
import { querySimilarEvidence } from "~/server/pinecone/client";

export const agentRouter = createTRPCRouter({
  // 1. Ingest JSON dataset of Twitter conversations (Brand Owner Dashboard)
  ingestDataset: publicProcedure
    .input(
      z.object({
        defaultBrandName: z.string().optional().default("DefaultBrand"),
        jsonData: z.string(), // raw JSON string from file upload or paste
      }),
    )
    .mutation(async ({ input }) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(input.jsonData);
      } catch {
        throw new Error(
          "Invalid JSON format. Please provide a valid JSON file.",
        );
      }

      let conversations: IngestConversationItem[] = [];

      if (Array.isArray(parsed)) {
        // Format A: Array of conversations
        conversations = parsed as IngestConversationItem[];
      } else if (
        typeof parsed === "object" &&
        parsed !== null &&
        "conversations" in parsed
      ) {
        conversations = (parsed as { conversations: IngestConversationItem[] })
          .conversations;
      } else {
        throw new Error(
          "JSON structure must be an array of conversations or an object with a 'conversations' array.",
        );
      }

      const result = await ingestDataset({
        defaultBrandName: input.defaultBrandName,
        conversations,
      });

      return result;
    }),

  // 2. Semantic Search on Pinecone
  searchEvidence: publicProcedure
    .input(
      z.object({
        queryText: z.string().min(1),
        brandId: z.string().optional(),
        topK: z.number().min(1).max(20).optional().default(5),
      }),
    )
    .query(async ({ input }) => {
      return querySimilarEvidence({
        queryText: input.queryText,
        brandId: input.brandId,
        topK: input.topK,
      });
    }),

  // 3. Public / Brand Chat: Run AI Support Agent & save AgentRun + Evidence
  runAgent: publicProcedure
    .input(
      z.object({
        inputText: z.string().min(1),
        brandId: z.string().optional(),
        conversationId: z.string().optional(),
        modelName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return runSupportAgent({
        inputText: input.inputText,
        brandId: input.brandId,
        conversationId: input.conversationId,
        modelName: input.modelName,
      });
    }),

  // 4. Get System Stats (Postgres counts)
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [brands, customers, conversations, messages, agentRuns] =
      await Promise.all([
        ctx.db.brand.count(),
        ctx.db.customer.count(),
        ctx.db.conversation.count(),
        ctx.db.message.count(),
        ctx.db.agentRun.count(),
      ]);

    return {
      brands,
      customers,
      conversations,
      messages,
      agentRuns,
    };
  }),

  // 5. Get List of Brands
  getBrands: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.brand.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            conversations: true,
            customers: true,
            intents: true,
          },
        },
      },
    });
  }),

  // 6. Get Single Brand by ID (for public chat page `/[brandId]/chat`)
  getBrandById: publicProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findUnique({
        where: { id: input.brandId },
        include: {
          intents: true,
          _count: {
            select: {
              conversations: true,
            },
          },
        },
      });

      if (!brand) {
        throw new Error("Brand not found");
      }

      return brand;
    }),

  // 7. Get Recent Agent Runs with Evidence
  getRecentRuns: publicProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).optional().default(10) }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.agentRun.findMany({
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          predictedIntent: true,
          evidence: {
            include: {
              message: true,
            },
          },
        },
      });
    }),
});

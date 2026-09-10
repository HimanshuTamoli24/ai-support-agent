import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  ingestDataset,
  type IngestConversationItem,
} from "~/server/services/dataset-service";
import { runSupportAgent } from "~/server/services/agent-service";
import { runFullBenchmarkSuite } from "~/server/services/evaluation-service";
import { querySimilarEvidence } from "~/server/pinecone/client";
import { inngest } from "~/server/inngest/client";
import { db } from "~/server/db";

export const agentRouter = createTRPCRouter({
  // 1. Upload Dataset: Stores raw JSON in PostgreSQL & triggers Inngest background indexing
  uploadDataset: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).default("Support Dataset"),
        jsonData: z.string(), // raw JSON string from file upload
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

      // Step 1: Create Dataset in PostgreSQL with status = PROCESSING
      const dataset = await db.dataset.create({
        data: {
          name: input.name,
          rawData: parsed as object,
          status: "PROCESSING",
        },
      });

      // Step 2: Dispatch background Inngest event with datasetId
      await inngest.send({
        name: "support/user.data.upload",
        data: {
          datasetId: dataset.id,
        },
      });

      return {
        datasetId: dataset.id,
        name: dataset.name,
        status: "PROCESSING",
        conversationsCount: conversations.length,
      };
    }),

  // 2. Get all uploaded datasets and their statuses
  getDatasets: publicProcedure.query(async () => {
    return await db.dataset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { brands: true, agentRuns: true },
        },
      },
    });
  }),

  // 3. Get specific dataset by ID
  getDatasetById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.dataset.findUnique({
        where: { id: input.id },
        include: {
          brands: {
            include: {
              _count: { select: { conversations: true, intents: true } },
            },
          },
        },
      });
    }),

  // 4. Semantic Search on Pinecone (isolated by datasetId namespace)
  searchEvidence: publicProcedure
    .input(
      z.object({
        queryText: z.string().min(1),
        brandId: z.string().optional(),
        datasetId: z.string().optional(),
        topK: z.number().min(1).max(20).optional().default(5),
      }),
    )
    .query(async ({ input }) => {
      return querySimilarEvidence({
        queryText: input.queryText,
        brandId: input.brandId,
        namespace: input.datasetId,
        topK: input.topK,
      });
    }),

  // 5. Run AI Support Agent with Pinecone evidence & Groq reasoning
  runAgent: publicProcedure
    .input(
      z.object({
        inputText: z.string().min(1),
        datasetId: z.string().optional(),
        brandId: z.string().optional(),
        conversationId: z.string().optional(),
        modelName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return runSupportAgent({
        inputText: input.inputText,
        datasetId: input.datasetId,
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

  // 8. Run Scientific Evaluation Benchmark Suite
  runBenchmark: publicProcedure
    .input(
      z.object({
        datasetId: z.string().optional(),
      }).optional(),
    )
    .mutation(async ({ input }) => {
      return runFullBenchmarkSuite(input?.datasetId);
    }),
});


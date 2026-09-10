import { inngest } from "./client";
import { db } from "~/server/db";
import {
  ingestDataset,
  type IngestConversationItem,
} from "~/server/services/dataset-service";

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
      } else if (typeof raw === "object" && raw !== null && "conversations" in raw) {
        conversations = (raw as unknown as { conversations: IngestConversationItem[] }).conversations;
      } else if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        conversations = Array.isArray(parsed) ? parsed : (parsed.conversations ?? []);
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

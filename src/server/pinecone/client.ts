import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "~/env";

export type MessageMetadata = {
  messageId: string;
  conversationId: string;
  brandId: string;
  role: "CUSTOMER" | "BRAND";
  text: string;
  authorId?: string;
  username?: string;
  createdAt?: string;
};

export interface RetrievedEvidence {
  messageId: string;
  conversationId: string;
  brandId: string;
  role: "CUSTOMER" | "BRAND";
  text: string;
  score: number;
  authorId?: string;
  username?: string;
}

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!env.PINECONE_API_KEY) {
    throw new Error(
      "PINECONE_API_KEY is not configured. Please add it to your .env file.",
    );
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    });
  }

  return pineconeClient;
}

export async function ensurePineconeIndex(dimension = 1024): Promise<string> {
  const pc = getPineconeClient();
  const indexName = env.PINECONE_INDEX_NAME;

  const indexes = await pc.listIndexes();
  const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

  if (!indexExists) {
    console.log(`Creating Pinecone serverless index: ${indexName}...`);
    await pc.createIndex({
      name: indexName,
      dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // Wait briefly for index initialization
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return indexName;
}

export async function generateEmbeddings(
  texts: string[],
  inputType: "passage" | "query" = "passage",
): Promise<number[][]> {
  const pc = getPineconeClient();

  if (texts.length === 0) return [];

  // Pinecone Inference Embedding (multilingual-e5-large outputs 1024-dim vectors)
  const embeddingResponse = await pc.inference.embed({
    model: "multilingual-e5-large",
    inputs: texts,
    parameters: {
      inputType,
      truncate: "END",
    },
  });

  const embeddings: number[][] = [];
  if (embeddingResponse.data) {
    for (const item of embeddingResponse.data) {
      if ("values" in item && Array.isArray(item.values)) {
        embeddings.push(item.values as number[]);
      }
    }
  }

  return embeddings;
}

export async function upsertMessagesToPinecone(
  messages: Array<{
    id: string;
    conversationId: string;
    brandId: string;
    role: "CUSTOMER" | "BRAND";
    text: string;
    authorId?: string | null;
    username?: string | null;
    createdAt?: Date;
  }>,
): Promise<{ upsertedCount: number }> {
  if (messages.length === 0) return { upsertedCount: 0 };

  const pc = getPineconeClient();
  const indexName = await ensurePineconeIndex(1024);
  const index = pc.index<MessageMetadata>(indexName);

  const BATCH_SIZE = 50;
  let totalUpserted = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    const texts = chunk.map((m) => m.text.trim());

    // Generate embeddings
    const embeddings = await generateEmbeddings(texts, "passage");

    // Format records for Pinecone
    const records = chunk.map((m, idx) => ({
      id: m.id,
      values: embeddings[idx]!,
      metadata: {
        messageId: m.id,
        conversationId: m.conversationId,
        brandId: m.brandId,
        role: m.role,
        text: m.text,
        authorId: m.authorId ?? undefined,
        username: m.username ?? undefined,
        createdAt: m.createdAt ? m.createdAt.toISOString() : undefined,
      },
    }));

    await index.upsert({ records });
    totalUpserted += records.length;
  }

  return { upsertedCount: totalUpserted };
}

export async function querySimilarEvidence({
  queryText,
  brandId,
  topK = 5,
  role,
}: {
  queryText: string;
  brandId?: string;
  topK?: number;
  role?: "CUSTOMER" | "BRAND";
}): Promise<RetrievedEvidence[]> {
  const pc = getPineconeClient();
  const indexName = await ensurePineconeIndex(1024);
  const index = pc.index<MessageMetadata>(indexName);

  // Generate query embedding
  const [queryEmbedding] = await generateEmbeddings([queryText], "query");
  if (!queryEmbedding) return [];

  // Build metadata filter
  const filter: Record<string, unknown> = {};
  if (brandId) filter.brandId = { $eq: brandId };
  if (role) filter.role = { $eq: role };

  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  const results: RetrievedEvidence[] = [];

  for (const match of queryResponse.matches) {
    if (match.metadata && match.metadata.text) {
      results.push({
        messageId: match.metadata.messageId,
        conversationId: match.metadata.conversationId,
        brandId: match.metadata.brandId,
        role: match.metadata.role,
        text: match.metadata.text,
        score: match.score ?? 0,
        authorId: match.metadata.authorId,
        username: match.metadata.username,
      });
    }
  }

  return results;
}

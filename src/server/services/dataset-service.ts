import { db } from "~/server/db";
import { upsertMessagesToPinecone } from "~/server/pinecone/client";

export interface IngestMessageItem {
  twitterId?: string;
  authorId?: string;
  username?: string;
  text: string;
  role: "CUSTOMER" | "BRAND";
  createdAt?: string | Date;
}

export interface IngestConversationItem {
  brandName?: string;
  brandId?: string;
  conversationTwitterId?: string;
  customer?: {
    twitterId?: string;
    username?: string;
  };
  messages: IngestMessageItem[];
}

export interface IngestDatasetInput {
  datasetId?: string;
  defaultBrandName?: string;
  conversations: IngestConversationItem[];
}

export interface IngestDatasetResult {
  brandsCount: number;
  customersCount: number;
  conversationsCount: number;
  messagesCount: number;
  pineconeIndexedCount: number;
}

/**
 * Ingest raw Twitter dataset into PostgreSQL (Prisma) and index into Pinecone vector DB under datasetId namespace.
 */
export async function ingestDataset({
  datasetId,
  defaultBrandName = "DefaultBrand",
  conversations,
}: IngestDatasetInput): Promise<IngestDatasetResult> {
  const brandMap = new Map<string, string>(); // brandName -> brandId
  let totalCustomers = 0;
  let totalConversations = 0;
  let totalMessages = 0;

  const messagesToIndex: Array<{
    id: string;
    conversationId: string;
    brandId: string;
    role: "CUSTOMER" | "BRAND";
    text: string;
    authorId?: string | null;
    username?: string | null;
    createdAt?: Date;
  }> = [];

  for (const convData of conversations) {
    const brandName = (convData.brandName ?? defaultBrandName).trim();

    // 1. Ensure Brand exists
    let brandId = brandMap.get(brandName);
    if (!brandId) {
      let brand = await db.brand.findFirst({
        where: { name: brandName, datasetId: datasetId ?? undefined },
      });
      if (!brand) {
        brand = await db.brand.create({
          data: {
            name: brandName,
            datasetId: datasetId ?? undefined,
          },
        });
      }
      brandId = brand.id;
      brandMap.set(brandName, brandId);
    }

    // 2. Ensure Customer exists if provided
    let customerId: string | null = null;
    if (convData.customer?.twitterId || convData.customer?.username) {
      const customer = await db.customer.create({
        data: {
          brandId,
          twitterId: convData.customer.twitterId ?? null,
          username: convData.customer.username ?? null,
        },
      });
      customerId = customer.id;
      totalCustomers++;
    }

    // 3. Create Conversation
    const conversation = await db.conversation.create({
      data: {
        brandId,
        customerId,
        twitterId: convData.conversationTwitterId ?? null,
      },
    });
    totalConversations++;

    // 4. Create Messages
    for (const msgData of convData.messages) {

      let message = msgData.twitterId
        ? await db.message.findUnique({
            where: { twitterId: msgData.twitterId },
          })
        : null;

      if (!message) {
        message = await db.message.create({
          data: {
            conversationId: conversation.id,
            twitterId: msgData.twitterId ?? undefined,
            authorId: msgData.authorId ?? null,
            username: msgData.username ?? null,
            text: msgData.text.trim(),
            role: msgData.role,
            createdAt: msgData.createdAt ? new Date(msgData.createdAt) : undefined,
          },
        });
        totalMessages++;
      }

      messagesToIndex.push({
        id: message.id,
        conversationId: conversation.id,
        brandId,
        role: message.role,
        text: message.text,
        authorId: message.authorId,
        username: message.username,
        createdAt: message.createdAt,
      });
    }
  }

  // 5. Index messages into Pinecone vector DB with datasetId namespace
  let pineconeIndexedCount = 0;
  if (messagesToIndex.length > 0) {
    const { upsertedCount } = await upsertMessagesToPinecone(messagesToIndex, datasetId);
    pineconeIndexedCount = upsertedCount;
  }

  return {
    brandsCount: brandMap.size,
    customersCount: totalCustomers,
    conversationsCount: totalConversations,
    messagesCount: totalMessages,
    pineconeIndexedCount,
  };
}

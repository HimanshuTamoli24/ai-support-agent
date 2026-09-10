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
 * Ingest raw Twitter dataset into PostgreSQL (Prisma) and index into Pinecone vector DB.
 */
export async function ingestDataset({
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
        where: { name: brandName },
      });
      if (!brand) {
        brand = await db.brand.create({
          data: { name: brandName },
        });
      }
      brandId = brand.id;
      brandMap.set(brandName, brandId);
    }

    // 2. Ensure Customer exists if provided
    let customerId: string | null = null;
    if (convData.customer?.twitterId || convData.customer?.username) {
      const custTwitterId = convData.customer.twitterId ?? null;
      const custUsername = convData.customer.username ?? null;

      let customer = custTwitterId
        ? await db.customer.findFirst({
            where: { brandId, twitterId: custTwitterId },
          })
        : null;

      if (!customer) {
        customer = await db.customer.create({
          data: {
            brandId,
            twitterId: custTwitterId,
            username: custUsername,
          },
        });
        totalCustomers++;
      }
      customerId = customer.id;
    }

    // 3. Create or find Conversation
    let conversation = convData.conversationTwitterId
      ? await db.conversation.findUnique({
          where: { twitterId: convData.conversationTwitterId },
        })
      : null;

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          brandId,
          customerId,
          twitterId: convData.conversationTwitterId ?? undefined,
        },
      });
      totalConversations++;
    }

    // 4. Create Messages
    for (const msgData of convData.messages) {
      if (!msgData.text || msgData.text.trim().length === 0) continue;

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

  // 5. Index messages into Pinecone vector DB
  let pineconeIndexedCount = 0;
  if (messagesToIndex.length > 0) {
    const { upsertedCount } = await upsertMessagesToPinecone(messagesToIndex);
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

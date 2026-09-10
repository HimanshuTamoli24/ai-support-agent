import { PrismaClient } from "../generated/prisma";
import { Pinecone } from "@pinecone-database/pinecone";

const prisma = new PrismaClient();

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

async function resetPostgres() {
  console.log("\n🧹 1. Resetting PostgreSQL database...");
  try {
    // Truncate all tables with CASCADE to handle foreign key dependencies cleanly
    const tables = [
      `"evidence"`,
      `"agent_run"`,
      `"evaluation_example"`,
      `"evaluation_set"`,
      `"intent"`,
      `"message"`,
      `"conversation"`,
      `"customer"`,
      `"brand"`,
      `"dataset"`,
      `"Post"`,
      `"session"`,
      `"account"`,
      `"verification"`,
      `"user"`,
    ];

    console.log(`Executing TRUNCATE on tables: ${tables.join(", ")}`);
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.join(", ")} CASCADE;`
    );

    console.log("✅ PostgreSQL tables truncated successfully!");
  } catch (error) {
    console.error("❌ Error truncating PostgreSQL tables via CASCADE:", error);
    console.log("Attempting fallback individual model deletes...");
    try {
      await prisma.evidence.deleteMany();
      await prisma.agentRun.deleteMany();
      await prisma.evaluationExample.deleteMany();
      await prisma.evaluationSet.deleteMany();
      await prisma.message.deleteMany();
      await prisma.conversation.deleteMany();
      await prisma.customer.deleteMany();
      await prisma.intent.deleteMany();
      await prisma.brand.deleteMany();
      await prisma.dataset.deleteMany();
      await prisma.post.deleteMany();
      await prisma.session.deleteMany();
      await prisma.account.deleteMany();
      await prisma.verification.deleteMany();
      await prisma.user.deleteMany();
      console.log("✅ PostgreSQL models deleted successfully via fallback!");
    } catch (fallbackError) {
      console.error("❌ Fallback delete also encountered error:", fallbackError);
    }
  }
}

async function resetPinecone() {
  console.log("\n🌲 2. Resetting Pinecone vector index...");
  if (!pineconeApiKey || !pineconeIndexName) {
    console.warn(
      "⚠️ PINECONE_API_KEY or PINECONE_INDEX_NAME is missing in environment variables. Skipping Pinecone reset."
    );
    return;
  }

  try {
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((idx) => idx.name === pineconeIndexName);

    if (!indexExists) {
      console.log(`ℹ️ Pinecone index "${pineconeIndexName}" does not exist yet. Nothing to delete.`);
      return;
    }

    const index = pinecone.index(pineconeIndexName);
    const stats = await index.describeIndexStats();
    console.log("Current index stats:", JSON.stringify(stats, null, 2));

    // Delete default namespace
    try {
      console.log(`Deleting all records from default namespace in "${pineconeIndexName}"...`);
      await index.deleteAll();
      console.log("✅ Default namespace cleared.");
    } catch (err) {
      console.log("Default namespace deleteAll result/warning:", err instanceof Error ? err.message : err);
    }

    // Delete from all custom namespaces if any exist
    if (stats.namespaces) {
      const namespaceNames = Object.keys(stats.namespaces);
      for (const ns of namespaceNames) {
        if (!ns) continue;
        console.log(`Deleting all records in namespace "${ns}"...`);
        try {
          await index.namespace(ns).deleteAll();
          console.log(`✅ Namespace "${ns}" cleared.`);
        } catch (nsErr) {
          console.warn(`⚠️ Could not clear namespace "${ns}":`, nsErr);
        }
      }
    }

    console.log("✅ Pinecone vectors reset successfully!");
  } catch (error) {
    console.error("❌ Error resetting Pinecone index:", error);
  }
}

async function main() {
  console.log("==========================================");
  console.log("🚀 STARTING COMPLETE DATABASE & VECTOR RESET");
  console.log("==========================================");

  await resetPostgres();
  await resetPinecone();

  console.log("\n==========================================");
  console.log("✨ ALL DATA EMPTIED FRESH! READY FOR DEMO!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
  Warnings:

  - You are about to drop the `test` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('CUSTOMER', 'BRAND');

-- DropTable
DROP TABLE "test";

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "twitterId" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "customerId" TEXT,
    "twitterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "twitterId" TEXT,
    "authorId" TEXT,
    "username" TEXT,
    "text" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_set" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_example" (
    "id" TEXT NOT NULL,
    "evaluationSetId" TEXT NOT NULL,
    "intentId" TEXT,
    "text" TEXT NOT NULL,
    "expectedEscalation" BOOLEAN NOT NULL DEFAULT false,
    "expectedReply" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "evaluationExampleId" TEXT,
    "predictedIntentId" TEXT,
    "inputText" TEXT NOT NULL,
    "draftReply" TEXT,
    "shouldEscalate" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "reason" TEXT,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_brandId_idx" ON "customer"("brandId");

-- CreateIndex
CREATE INDEX "customer_twitterId_idx" ON "customer"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_twitterId_key" ON "conversation"("twitterId");

-- CreateIndex
CREATE INDEX "conversation_brandId_idx" ON "conversation"("brandId");

-- CreateIndex
CREATE INDEX "conversation_customerId_idx" ON "conversation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "message_twitterId_key" ON "message"("twitterId");

-- CreateIndex
CREATE INDEX "message_conversationId_idx" ON "message"("conversationId");

-- CreateIndex
CREATE INDEX "message_authorId_idx" ON "message"("authorId");

-- CreateIndex
CREATE INDEX "intent_brandId_idx" ON "intent"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "intent_brandId_name_key" ON "intent"("brandId", "name");

-- CreateIndex
CREATE INDEX "evaluation_example_evaluationSetId_idx" ON "evaluation_example"("evaluationSetId");

-- CreateIndex
CREATE INDEX "evaluation_example_intentId_idx" ON "evaluation_example"("intentId");

-- CreateIndex
CREATE INDEX "agent_run_conversationId_idx" ON "agent_run"("conversationId");

-- CreateIndex
CREATE INDEX "agent_run_evaluationExampleId_idx" ON "agent_run"("evaluationExampleId");

-- CreateIndex
CREATE INDEX "agent_run_predictedIntentId_idx" ON "agent_run"("predictedIntentId");

-- CreateIndex
CREATE INDEX "evidence_agentRunId_idx" ON "evidence"("agentRunId");

-- CreateIndex
CREATE INDEX "evidence_messageId_idx" ON "evidence"("messageId");

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent" ADD CONSTRAINT "intent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_example" ADD CONSTRAINT "evaluation_example_evaluationSetId_fkey" FOREIGN KEY ("evaluationSetId") REFERENCES "evaluation_set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_example" ADD CONSTRAINT "evaluation_example_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_evaluationExampleId_fkey" FOREIGN KEY ("evaluationExampleId") REFERENCES "evaluation_example"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_predictedIntentId_fkey" FOREIGN KEY ("predictedIntentId") REFERENCES "intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

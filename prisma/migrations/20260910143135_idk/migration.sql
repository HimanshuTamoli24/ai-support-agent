-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "agent_run" ADD COLUMN     "datasetId" TEXT;

-- AlterTable
ALTER TABLE "brand" ADD COLUMN     "datasetId" TEXT;

-- CreateTable
CREATE TABLE "dataset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "rawData" JSONB,
    "status" "DatasetStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dataset_userId_idx" ON "dataset"("userId");

-- CreateIndex
CREATE INDEX "agent_run_datasetId_idx" ON "agent_run"("datasetId");

-- CreateIndex
CREATE INDEX "brand_datasetId_idx" ON "brand"("datasetId");

-- AddForeignKey
ALTER TABLE "dataset" ADD CONSTRAINT "dataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand" ADD CONSTRAINT "brand_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

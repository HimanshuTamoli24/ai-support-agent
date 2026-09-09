-- CreateTable
CREATE TABLE "test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "test_pkey" PRIMARY KEY ("id")
);

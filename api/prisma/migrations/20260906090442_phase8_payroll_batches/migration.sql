-- CreateEnum
CREATE TYPE "PayrollBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayrollBatchItemStatus" AS ENUM ('SUCCESSFUL', 'FAILED');

-- CreateTable
CREATE TABLE "payroll_batches" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PayrollBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "totalAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payroll_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recipientAccountNumber" TEXT NOT NULL,
    "recipientAccountName" TEXT,
    "recipientLabel" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "status" "PayrollBatchItemStatus" NOT NULL,
    "failureReason" TEXT,
    "providerReference" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_batches_reference_key" ON "payroll_batches"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_batches_idempotencyKey_key" ON "payroll_batches"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_batches_merchantId_idx" ON "payroll_batches"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_batch_items_transactionId_key" ON "payroll_batch_items"("transactionId");

-- CreateIndex
CREATE INDEX "payroll_batch_items_batchId_idx" ON "payroll_batch_items"("batchId");

-- AddForeignKey
ALTER TABLE "payroll_batches" ADD CONSTRAINT "payroll_batches_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_batch_items" ADD CONSTRAINT "payroll_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_batch_items" ADD CONSTRAINT "payroll_batch_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

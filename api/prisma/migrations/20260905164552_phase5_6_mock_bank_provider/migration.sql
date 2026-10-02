-- CreateEnum
CREATE TYPE "MockBankTransferStatus" AS ENUM ('SUCCESSFUL', 'FAILED');

-- CreateTable
CREATE TABLE "merchant_bank_accounts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL DEFAULT 'MOCK001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_bank_accounts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "balanceMinor" INTEGER NOT NULL DEFAULT 10000000,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_bank_transfers" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "direction" "LedgerEntryDirection" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" "MockBankTransferStatus" NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_bank_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_bank_accounts_merchantId_idx" ON "merchant_bank_accounts"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_bank_accounts_merchantId_accountNumber_key" ON "merchant_bank_accounts"("merchantId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "mock_bank_accounts_merchantId_key" ON "mock_bank_accounts"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "mock_bank_accounts_accountNumber_key" ON "mock_bank_accounts"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "mock_bank_transfers_reference_key" ON "mock_bank_transfers"("reference");

-- CreateIndex
CREATE INDEX "mock_bank_transfers_bankAccountId_idx" ON "mock_bank_transfers"("bankAccountId");

-- AddForeignKey
ALTER TABLE "merchant_bank_accounts" ADD CONSTRAINT "merchant_bank_accounts_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_bank_transfers" ADD CONSTRAINT "mock_bank_transfers_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "mock_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

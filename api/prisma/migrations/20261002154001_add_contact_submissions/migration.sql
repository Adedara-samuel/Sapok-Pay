-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "companySize" "CompanySize" NOT NULL,
    "primaryProduct" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "monthlyPaymentVolume" TEXT,
    "message" TEXT NOT NULL,
    "wantsUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_submissions_createdAt_idx" ON "contact_submissions"("createdAt");

-- CreateEnum
CREATE TYPE "ContactSubmissionStatus" AS ENUM ('NEW', 'RESPONDED');

-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "adminResponse" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ContactSubmissionStatus" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

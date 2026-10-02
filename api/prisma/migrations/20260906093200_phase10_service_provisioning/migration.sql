-- AlterTable
ALTER TABLE "merchants" ADD COLUMN "externalReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "merchants_externalReference_key" ON "merchants"("externalReference");

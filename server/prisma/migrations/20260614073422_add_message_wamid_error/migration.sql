-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "error" TEXT,
ADD COLUMN     "waMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Message_waMessageId_idx" ON "Message"("waMessageId");

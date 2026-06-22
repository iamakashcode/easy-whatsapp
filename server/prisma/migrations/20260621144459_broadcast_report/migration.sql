-- AlterTable
ALTER TABLE "BroadcastRecipient" ADD COLUMN     "error" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "broadcastId" INTEGER;

-- CreateIndex
CREATE INDEX "Message_broadcastId_idx" ON "Message"("broadcastId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

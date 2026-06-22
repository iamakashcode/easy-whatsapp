-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "billable" BOOLEAN,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "conversationOrigin" TEXT,
ADD COLUMN     "costAmount" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "monthlyBudget" DECIMAL(12,2),
ADD COLUMN     "rateAuthentication" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "rateMarketing" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "rateService" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "rateUtility" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Message_userId_category_idx" ON "Message"("userId", "category");

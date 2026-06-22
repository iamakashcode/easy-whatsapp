/*
  Warnings:

  - Added the required column `updatedAt` to the `Template` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Template" ADD COLUMN "category" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Remove default after backfilling (Prisma manages this column going forward)
ALTER TABLE "Template" ALTER COLUMN "updatedAt" DROP DEFAULT;

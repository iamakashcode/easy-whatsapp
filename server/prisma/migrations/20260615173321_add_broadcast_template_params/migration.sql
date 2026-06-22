-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "templateParams" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "currency",
DROP COLUMN "rateAuthentication",
DROP COLUMN "rateMarketing",
DROP COLUMN "rateService",
DROP COLUMN "rateUtility";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE "PlatformPricing" (
    "id" SERIAL NOT NULL,
    "rateMarketing" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "rateUtility" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "rateAuthentication" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "rateService" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPricing_pkey" PRIMARY KEY ("id")
);

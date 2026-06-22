-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "footer" TEXT,
ADD COLUMN     "header" TEXT,
ADD COLUMN     "metaTemplateId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'LOCAL';

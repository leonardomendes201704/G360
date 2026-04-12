-- AlterTable
ALTER TABLE "ProjectProposal" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
ADD COLUMN     "validity" TIMESTAMP(3);

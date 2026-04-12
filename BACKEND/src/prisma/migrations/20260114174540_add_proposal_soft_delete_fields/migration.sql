-- AlterTable
ALTER TABLE "ProjectProposal" ADD COLUMN     "inactivatedAt" TIMESTAMP(3),
ADD COLUMN     "inactivatedBy" TEXT,
ADD COLUMN     "inactivationReason" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

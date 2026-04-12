-- AlterTable
ALTER TABLE "ProjectCost" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requiresAdjustment" BOOLEAN NOT NULL DEFAULT false;

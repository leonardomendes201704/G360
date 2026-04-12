-- AlterTable
ALTER TABLE "ProjectCost" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "invoiceValue" DECIMAL(65,30),
ADD COLUMN     "proposalId" TEXT,
ADD COLUMN     "sequenceNumber" INTEGER;

-- AlterTable
ALTER TABLE "ProjectProposal" ADD COLUMN     "costsGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCondition" JSONB;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProjectProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

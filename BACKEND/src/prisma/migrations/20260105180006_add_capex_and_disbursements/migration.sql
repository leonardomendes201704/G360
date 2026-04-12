-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetCapexId" TEXT,
ADD COLUMN     "contractValue" DECIMAL(65,30),
ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "ProjectDisbursement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "percentage" DECIMAL(65,30),
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expenseId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDisbursement_expenseId_key" ON "ProjectDisbursement"("expenseId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_budgetCapexId_fkey" FOREIGN KEY ("budgetCapexId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDisbursement" ADD CONSTRAINT "ProjectDisbursement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDisbursement" ADD CONSTRAINT "ProjectDisbursement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

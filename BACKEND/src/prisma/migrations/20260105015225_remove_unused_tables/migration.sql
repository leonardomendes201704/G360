/*
  Warnings:

  - You are about to drop the column `projectId` on the `BudgetItem` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `sprintId` on the `ProjectTask` table. All the data in the column will be lost.
  - You are about to drop the `ContractRevision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KnowledgeBase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KnowledgeBaseAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sprint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskLabel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BudgetItem" DROP CONSTRAINT "BudgetItem_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ContractRevision" DROP CONSTRAINT "ContractRevision_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_projectId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBase" DROP CONSTRAINT "KnowledgeBase_approverId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBase" DROP CONSTRAINT "KnowledgeBase_authorId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBase" DROP CONSTRAINT "KnowledgeBase_costCenterId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBase" DROP CONSTRAINT "KnowledgeBase_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeBaseAttachment" DROP CONSTRAINT "KnowledgeBaseAttachment_knowledgeBaseId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProposal" DROP CONSTRAINT "ProjectProposal_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectTask" DROP CONSTRAINT "ProjectTask_sprintId_fkey";

-- DropForeignKey
ALTER TABLE "Sprint" DROP CONSTRAINT "Sprint_projectId_fkey";

-- DropForeignKey
ALTER TABLE "TaskLabel" DROP CONSTRAINT "TaskLabel_taskId_fkey";

-- AlterTable
ALTER TABLE "BudgetItem" DROP COLUMN "projectId",
ADD COLUMN     "isNewExpense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "justification" TEXT,
ADD COLUMN     "previousYearValue" DECIMAL(65,30),
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "variancePercent" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "projectId",
ADD COLUMN     "approvalNotes" TEXT,
ADD COLUMN     "approvalStatus" TEXT,
ADD COLUMN     "lessonsLearned" TEXT,
ADD COLUMN     "preventiveActions" TEXT,
ADD COLUMN     "rootCause" TEXT,
ALTER COLUMN "accountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MeetingMinute" ADD COLUMN     "actions" JSONB,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "topics" TEXT[];

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "approvalStatus" TEXT DEFAULT 'DRAFT',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "costCenterId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "ProjectFollowUp" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'TASK',
ALTER COLUMN "highlights" SET DEFAULT '';

-- AlterTable
ALTER TABLE "ProjectProposal" ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProjectRisk" ADD COLUMN     "category" TEXT DEFAULT 'technical';

-- AlterTable
ALTER TABLE "ProjectTask" DROP COLUMN "sprintId";

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "category" TEXT DEFAULT 'TECNOLOGIA',
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ATIVO';

-- DropTable
DROP TABLE "ContractRevision";

-- DropTable
DROP TABLE "KnowledgeBase";

-- DropTable
DROP TABLE "KnowledgeBaseAttachment";

-- DropTable
DROP TABLE "Sprint";

-- DropTable
DROP TABLE "TaskLabel";

-- CreateTable
CREATE TABLE "BudgetScenario" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "multiplier" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "totalOpex" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCapex" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "impactAnalysis" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetScenarioItem" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "originalItemId" TEXT NOT NULL,
    "jan" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feb" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "mar" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "apr" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "may" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "jun" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "jul" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aug" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sep" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "oct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nov" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dec" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adjustmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetScenarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreezeWindow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreezeWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVISTO',
    "supplierId" TEXT,
    "invoiceNumber" TEXT,
    "dueDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "fileName" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BudgetScenario" ADD CONSTRAINT "BudgetScenario_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetScenarioItem" ADD CONSTRAINT "BudgetScenarioItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "BudgetScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposal" ADD CONSTRAINT "ProjectProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingMinute" ADD CONSTRAINT "MeetingMinute_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFollowUp" ADD CONSTRAINT "ProjectFollowUp_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `budgetCapexId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `contractValue` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `ProjectDisbursement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_budgetCapexId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDisbursement" DROP CONSTRAINT "ProjectDisbursement_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDisbursement" DROP CONSTRAINT "ProjectDisbursement_projectId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "budgetCapexId",
DROP COLUMN "contractValue",
DROP COLUMN "supplierId";

-- DropTable
DROP TABLE "ProjectDisbursement";

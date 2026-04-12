-- CreateTable
CREATE TABLE "ChangeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PADRAO',
    "riskLevel" TEXT NOT NULL DEFAULT 'BAIXO',
    "impact" TEXT NOT NULL DEFAULT 'MENOR',
    "category" TEXT,
    "executionPlan" TEXT,
    "backoutPlan" TEXT,
    "testPlan" TEXT,
    "prerequisites" TEXT,
    "defaultDuration" INTEGER NOT NULL DEFAULT 60,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeTemplate_name_key" ON "ChangeTemplate"("name");

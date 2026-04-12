-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "riskId" TEXT;

-- CreateTable
CREATE TABLE "CorporateRisk" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "probability" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFICADO',
    "treatmentType" TEXT,
    "ownerId" TEXT NOT NULL,
    "departmentId" TEXT,
    "assetId" TEXT,
    "supplierId" TEXT,
    "complianceStandard" TEXT,
    "controlReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateRisk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporateRisk_code_key" ON "CorporateRisk"("code");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "CorporateRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRisk" ADD CONSTRAINT "CorporateRisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRisk" ADD CONSTRAINT "CorporateRisk_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRisk" ADD CONSTRAINT "CorporateRisk_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateRisk" ADD CONSTRAINT "CorporateRisk_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

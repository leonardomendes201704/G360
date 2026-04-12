-- CreateTable
CREATE TABLE "ApprovalTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "minAmount" DECIMAL(18,2),
    "maxAmount" DECIMAL(18,2),
    "globalScope" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalTier_entityType_isActive_idx" ON "ApprovalTier"("entityType", "isActive");

-- AddForeignKey
ALTER TABLE "ApprovalTier" ADD CONSTRAINT "ApprovalTier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

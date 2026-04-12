-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "area" TEXT,
ADD COLUMN     "creatorId" TEXT;

-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN     "dependencies" TEXT[],
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

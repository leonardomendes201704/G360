/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `KnowledgeBase` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "KnowledgeBase" ADD COLUMN     "applicationAreas" TEXT[],
ADD COLUMN     "code" TEXT,
ADD COLUMN     "definitions" TEXT,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "references" TEXT;

-- CreateTable
CREATE TABLE "KnowledgeBaseAttachment" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_code_key" ON "KnowledgeBase"("code");

-- AddForeignKey
ALTER TABLE "KnowledgeBaseAttachment" ADD CONSTRAINT "KnowledgeBaseAttachment_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

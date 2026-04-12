-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "problemId" TEXT,
ADD COLUMN     "slaPausedAt" TIMESTAMP(3),
ADD COLUMN     "slaTotalPausedMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProblemRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVESTIGATING',
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "requesterId" TEXT NOT NULL,
    "rootCause" TEXT,
    "workaround" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ProblemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProblemRequest_code_key" ON "ProblemRequest"("code");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "ProblemRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemRequest" ADD CONSTRAINT "ProblemRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

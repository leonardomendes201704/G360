-- CreateTable
CREATE TABLE "TicketCodeSequence" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TicketCodeSequence_pkey" PRIMARY KEY ("year")
);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "csatScore" INTEGER,
ADD COLUMN "csatComment" TEXT,
ADD COLUMN "csatAt" TIMESTAMP(3);

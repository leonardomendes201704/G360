-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN     "lessonsLearned" TEXT,
ADD COLUMN     "prerequisites" TEXT,
ADD COLUMN     "preventiveActions" TEXT,
ADD COLUMN     "rootCause" TEXT;

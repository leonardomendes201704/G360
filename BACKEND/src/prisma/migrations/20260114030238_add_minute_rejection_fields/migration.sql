-- AlterTable
ALTER TABLE "MeetingMinute" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requiresAdjustment" BOOLEAN NOT NULL DEFAULT false;

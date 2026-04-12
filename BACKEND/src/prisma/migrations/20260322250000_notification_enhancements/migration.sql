-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "eventCode" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_userId_dedupeKey_idx" ON "Notification"("userId", "dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

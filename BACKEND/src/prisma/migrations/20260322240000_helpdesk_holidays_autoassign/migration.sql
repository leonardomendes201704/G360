ALTER TABLE "helpdesk_config" ADD COLUMN "auto_assign_on_create" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "support_groups" ADD COLUMN "assignment_cursor" INTEGER NOT NULL DEFAULT 0;

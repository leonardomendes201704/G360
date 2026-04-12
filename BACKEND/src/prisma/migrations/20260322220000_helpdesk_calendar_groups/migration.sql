-- Helpdesk config (singleton id=1)
CREATE TABLE "helpdesk_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "use_business_calendar" BOOLEAN NOT NULL DEFAULT true,
    "calendar" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "helpdesk_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "helpdesk_config" ("id", "use_business_calendar", "calendar", "updated_at")
VALUES (
  1,
  true,
  '{"timezone":"America/Sao_Paulo","workdays":[1,2,3,4,5],"startMinutes":540,"endMinutes":1080}'::jsonb,
  CURRENT_TIMESTAMP
);

-- Support groups
CREATE TABLE "support_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sla_policy_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_groups_name_key" ON "support_groups"("name");

CREATE TABLE "support_group_members" (
    "id" TEXT NOT NULL,
    "support_group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_group_members_support_group_id_user_id_key" ON "support_group_members"("support_group_id", "user_id");

ALTER TABLE "support_groups" ADD CONSTRAINT "support_groups_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "SlaPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_group_members" ADD CONSTRAINT "support_group_members_support_group_id_fkey" FOREIGN KEY ("support_group_id") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_group_members" ADD CONSTRAINT "support_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD COLUMN "support_group_id" TEXT;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_support_group_id_fkey" FOREIGN KEY ("support_group_id") REFERENCES "support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

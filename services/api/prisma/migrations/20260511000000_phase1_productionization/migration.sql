-- AlterEnum: safely add SKILLS if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKILLS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'QuestPillar')) THEN
    ALTER TYPE "QuestPillar" ADD VALUE 'SKILLS';
  END IF;
END
$$;

-- DropForeignKey
ALTER TABLE "escrows" DROP CONSTRAINT "escrows_venture_id_fkey";

-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "achievements_user_id_idx" ON "achievements"("user_id");

-- CreateIndex
CREATE INDEX "activities_user_id_start_time_idx" ON "activities"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "escrows_seller_id_idx" ON "escrows"("seller_id");

-- CreateIndex
CREATE INDEX "evidence_items_user_id_idx" ON "evidence_items"("user_id");

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "lms_assignments_connection_id_idx" ON "lms_assignments"("connection_id");

-- CreateIndex
CREATE INDEX "lms_connections_user_id_idx" ON "lms_connections"("user_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_receiver_id_created_at_idx" ON "messages"("sender_id", "receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_receiver_id_sender_id_created_at_idx" ON "messages"("receiver_id", "sender_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "points_ledger_user_id_created_at_idx" ON "points_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "quests_user_id_status_idx" ON "quests"("user_id", "status");

-- CreateIndex
CREATE INDEX "quests_user_id_created_at_idx" ON "quests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "tutoring_sessions_user_id_idx" ON "tutoring_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ventures_user_id_idx" ON "ventures"("user_id");

-- CreateIndex
CREATE INDEX "weekly_plans_user_id_idx" ON "weekly_plans"("user_id");

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_venture_id_fkey" FOREIGN KEY ("venture_id") REFERENCES "ventures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

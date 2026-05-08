-- UDB Database Initialization Script
-- Generated from schema.prisma

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('PARENT', 'CHILD', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DoterState" AS ENUM ('EGG', 'HATCHLING', 'JUVENILE', 'ADOLESCENT', 'ADULT', 'LEGENDARY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestPillar" AS ENUM ('ACADEMIC', 'BIOMETRIC', 'GAMIFICATION', 'ENTREPRENEURSHIP', 'SOCIAL', 'LIFE_SKILLS', 'SKILLS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('EARN', 'SPEND', 'REVERSE', 'ESCROW_HOLD', 'ESCROW_RELEASE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionSource" AS ENUM ('QUEST', 'MANUAL_AWARD', 'ESCROW', 'PURCHASE', 'BONUS', 'STREAK_REWARD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "VentureStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'PROOF_SUBMITTED', 'RELEASED', 'DISPUTED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BiometricSource" AS ENUM ('APPLE_HEALTH', 'OURA', 'GOOGLE_FIT', 'MANUAL', 'WEARABLE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- users
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "firebase_uid" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "role" "UserRole" NOT NULL,
  "date_of_birth" TIMESTAMPTZ,
  "timezone" TEXT DEFAULT 'UTC',
  "uup_data" JSONB DEFAULT '{}',
  "coppa_consent_verified" BOOLEAN DEFAULT false,
  "coppa_consent_date" TIMESTAMPTZ,
  "gdpr_delete_requested" BOOLEAN DEFAULT false,
  "accessibility_settings" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "last_seen_at" TIMESTAMPTZ
);

-- family_links
CREATE TABLE IF NOT EXISTS "family_links" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "parent_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "child_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "consent_verified" BOOLEAN DEFAULT false,
  "consent_method" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("parent_id", "child_id")
);

-- doter_profiles
CREATE TABLE IF NOT EXISTS "doter_profiles" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL UNIQUE REFERENCES "users"(id) ON DELETE CASCADE,
  "state" "DoterState" DEFAULT 'EGG',
  "name" TEXT DEFAULT 'My Doter',
  "level" INTEGER DEFAULT 1,
  "xp" INTEGER DEFAULT 0,
  "coin_balance" INTEGER DEFAULT 0,
  "streak_days" INTEGER DEFAULT 0,
  "is_sluggy" BOOLEAN DEFAULT false,
  "is_energetic" BOOLEAN DEFAULT false,
  "debuffs" JSONB DEFAULT '[]',
  "buffs" JSONB DEFAULT '[]',
  "skin_id" TEXT DEFAULT 'default',
  "accessories" JSONB DEFAULT '[]',
  "evolution_history" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- quests
CREATE TABLE IF NOT EXISTS "quests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pillar" "QuestPillar" NOT NULL,
  "status" "QuestStatus" DEFAULT 'PENDING',
  "xp_reward" INTEGER DEFAULT 100,
  "coin_reward" INTEGER DEFAULT 50,
  "proof_url" TEXT,
  "proof_type" TEXT,
  "ai_confidence" REAL,
  "ai_verified" BOOLEAN DEFAULT false,
  "goal_id" TEXT,
  "mastery_weight" REAL DEFAULT 0,
  "is_chunk" BOOLEAN DEFAULT false,
  "parent_quest_id" TEXT,
  "chunk_index" INTEGER,
  "metadata" JSONB DEFAULT '{}',
  "due_date" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- points_ledger
CREATE TABLE IF NOT EXISTS "points_ledger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "transaction_type" "TransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "source" "TransactionSource" NOT NULL,
  "source_id" TEXT,
  "status" "TransactionStatus" DEFAULT 'SETTLED',
  "description" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- goals
CREATE TABLE IF NOT EXISTS "goals" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pillar" "QuestPillar" NOT NULL,
  "status" "GoalStatus" DEFAULT 'ACTIVE',
  "target_weight" REAL DEFAULT 100,
  "current_weight" REAL DEFAULT 0,
  "certificate_url" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "due_date" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- activities
CREATE TABLE IF NOT EXISTS "activities" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pillar" "QuestPillar",
  "status" "ActivityStatus" DEFAULT 'SCHEDULED',
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "rrule" TEXT,
  "is_recurring" BOOLEAN DEFAULT false,
  "quest_id" TEXT,
  "goal_id" TEXT,
  "version" INTEGER DEFAULT 1,
  "version_history" JSONB DEFAULT '[]',
  "is_deep_work" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- streaks
CREATE TABLE IF NOT EXISTS "streaks" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "pillar" "QuestPillar" NOT NULL,
  "current_days" INTEGER DEFAULT 0,
  "longest_days" INTEGER DEFAULT 0,
  "last_activity" TIMESTAMPTZ,
  "freeze_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "pillar")
);

-- lms_connections
CREATE TABLE IF NOT EXISTS "lms_connections" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_expiry" TIMESTAMPTZ,
  "external_id" TEXT NOT NULL,
  "sync_status" TEXT DEFAULT 'PENDING',
  "last_sync_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- lms_assignments
CREATE TABLE IF NOT EXISTS "lms_assignments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "connection_id" TEXT NOT NULL REFERENCES "lms_connections"(id) ON DELETE CASCADE,
  "external_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_date" TIMESTAMPTZ,
  "course_id" TEXT NOT NULL,
  "course_name" TEXT NOT NULL,
  "points" REAL,
  "grade" REAL,
  "status" TEXT DEFAULT 'PENDING',
  "difficulty" REAL,
  "metadata" JSONB DEFAULT '{}',
  "synced_at" TIMESTAMPTZ DEFAULT NOW()
);

-- skill_gaps
CREATE TABLE IF NOT EXISTS "skill_gaps" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "subject" TEXT NOT NULL,
  "pillar" "QuestPillar" NOT NULL,
  "gap_score" REAL NOT NULL,
  "last_practiced" TIMESTAMPTZ,
  "rit_score" REAL,
  "metadata" JSONB DEFAULT '{}',
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "subject")
);

-- tutoring_sessions
CREATE TABLE IF NOT EXISTS "tutoring_sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "assignment_id" TEXT,
  "subject" TEXT NOT NULL,
  "session_log" JSONB DEFAULT '[]',
  "path_to_solution" JSONB DEFAULT '[]',
  "mastery_gained" REAL DEFAULT 0,
  "duration" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "ended_at" TIMESTAMPTZ
);

-- biometric_logs
CREATE TABLE IF NOT EXISTS "biometric_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "logged_at" TIMESTAMPTZ DEFAULT NOW(),
  "sleep_hours" REAL,
  "hrv" REAL,
  "stress_level" REAL,
  "focus_score" REAL,
  "heart_rate" REAL,
  "steps" INTEGER,
  "source" "BiometricSource" NOT NULL,
  "metadata" JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS "biometric_logs_user_id_logged_at_idx" ON "biometric_logs"("user_id", "logged_at");

-- messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sender_id" TEXT NOT NULL REFERENCES "users"(id),
  "receiver_id" TEXT NOT NULL REFERENCES "users"(id),
  "content" TEXT NOT NULL,
  "status" "MessageStatus" DEFAULT 'SENT',
  "is_safe" BOOLEAN DEFAULT true,
  "safety_score" REAL,
  "is_ai_message" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "read_at" TIMESTAMPTZ
);

-- evidence_items
CREATE TABLE IF NOT EXISTS "evidence_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "quest_id" TEXT REFERENCES "quests"(id),
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "ai_pro_tip" TEXT,
  "comments" JSONB DEFAULT '[]',
  "is_public" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- ventures
CREATE TABLE IF NOT EXISTS "ventures" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "VentureStatus" DEFAULT 'DRAFT',
  "business_plan_url" TEXT,
  "problem" TEXT,
  "solution" TEXT,
  "target_market" TEXT,
  "pricing_model" TEXT,
  "revenue_model" TEXT,
  "total_revenue" REAL DEFAULT 0,
  "parent_approved" BOOLEAN DEFAULT false,
  "parent_approved_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- escrows
CREATE TABLE IF NOT EXISTS "escrows" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "venture_id" TEXT NOT NULL REFERENCES "ventures"(id),
  "seller_id" TEXT NOT NULL REFERENCES "users"(id),
  "buyer_email" TEXT NOT NULL,
  "amount_usd" REAL NOT NULL,
  "status" "EscrowStatus" DEFAULT 'HELD',
  "stripe_payment_intent_id" TEXT,
  "proof_url" TEXT,
  "proof_notes" TEXT,
  "rejection_reason" TEXT,
  "released_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- achievements
CREATE TABLE IF NOT EXISTS "achievements" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pillar" "QuestPillar" NOT NULL,
  "points" INTEGER DEFAULT 0,
  "badge_url" TEXT NOT NULL,
  "sbt_token_id" TEXT,
  "sbt_contract" TEXT,
  "is_minted" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}',
  "earned_at" TIMESTAMPTZ DEFAULT NOW()
);

-- safety_scores
CREATE TABLE IF NOT EXISTS "safety_scores" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "score" REAL NOT NULL,
  "components" JSONB DEFAULT '{}',
  "alerts" JSONB DEFAULT '[]',
  "recorded_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "safety_scores_user_id_recorded_at_idx" ON "safety_scores"("user_id", "recorded_at");

-- weekly_plans
CREATE TABLE IF NOT EXISTS "weekly_plans" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "week_start" TIMESTAMPTZ NOT NULL,
  "week_end" TIMESTAMPTZ NOT NULL,
  "ai_draft" JSONB DEFAULT '[]',
  "final_plan" JSONB DEFAULT '[]',
  "focus_pillars" JSONB DEFAULT '[]',
  "is_finalized" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB DEFAULT '{}',
  "is_read" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "read_at" TIMESTAMPTZ
);

-- audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" BIGSERIAL PRIMARY KEY,
  "actor_id" TEXT NOT NULL REFERENCES "users"(id),
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "payload" JSONB DEFAULT '{}',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- simulation_runs
CREATE TABLE IF NOT EXISTS "simulation_runs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "run_date" TIMESTAMPTZ DEFAULT NOW(),
  "target_age" INTEGER DEFAULT 30,
  "p50_academic" REAL NOT NULL,
  "p50_financial" REAL NOT NULL,
  "p50_wellness" REAL NOT NULL,
  "narrative" TEXT,
  "actionable_steps" JSONB DEFAULT '[]',
  "input_snapshot" JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS "simulation_runs_user_id_run_date_idx" ON "simulation_runs"("user_id", "run_date");

-- simulation_pathways
CREATE TABLE IF NOT EXISTS "simulation_pathways" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "simulation_id" TEXT NOT NULL REFERENCES "simulation_runs"(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "probability" REAL NOT NULL,
  "impact_score" REAL NOT NULL,
  "description" TEXT
);

-- skill_agents
CREATE TABLE IF NOT EXISTS "skill_agents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "skill_name" TEXT NOT NULL,
  "status" TEXT DEFAULT 'IDLE',
  "autonomy_level" REAL DEFAULT 0.5,
  "learning_path" JSONB DEFAULT '[]',
  "last_action" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

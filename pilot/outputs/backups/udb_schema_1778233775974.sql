-- SOS-UDB Database Schema Backup
-- Generated: 2026-05-08T09:49:35.483Z
-- Database: udb

-- Table: goals
CREATE TABLE IF NOT EXISTS "goals" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "title" text NOT NULL, "description" text, "pillar" USER-DEFINED NOT NULL, "status" USER-DEFINED DEFAULT 'ACTIVE'::"GoalStatus", "target_weight" real DEFAULT 100, "current_weight" real DEFAULT 0, "certificate_url" text, "metadata" jsonb DEFAULT '{}'::jsonb, "due_date" timestamp with time zone, "completed_at" timestamp with time zone, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: lms_connections
CREATE TABLE IF NOT EXISTS "lms_connections" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "provider" text NOT NULL, "access_token" text NOT NULL, "refresh_token" text, "token_expiry" timestamp with time zone, "external_id" text NOT NULL, "sync_status" text DEFAULT 'PENDING'::text, "last_sync_at" timestamp with time zone, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: biometric_logs
CREATE TABLE IF NOT EXISTS "biometric_logs" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "logged_at" timestamp with time zone DEFAULT now(), "sleep_hours" real, "hrv" real, "stress_level" real, "focus_score" real, "heart_rate" real, "steps" integer, "source" USER-DEFINED NOT NULL, "metadata" jsonb DEFAULT '{}'::jsonb);

-- Table: messages
CREATE TABLE IF NOT EXISTS "messages" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "sender_id" text NOT NULL, "receiver_id" text NOT NULL, "content" text NOT NULL, "status" USER-DEFINED DEFAULT 'SENT'::"MessageStatus", "is_safe" boolean DEFAULT true, "safety_score" real, "is_ai_message" boolean DEFAULT false, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "read_at" timestamp with time zone);

-- Table: skill_agents
CREATE TABLE IF NOT EXISTS "skill_agents" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "skill_name" text NOT NULL, "status" text DEFAULT 'IDLE'::text, "autonomy_level" real DEFAULT 0.5, "learning_path" jsonb DEFAULT '[]'::jsonb, "last_action" text, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" ("id" bigint NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass), "actor_id" text NOT NULL, "action" text NOT NULL, "target_type" text, "target_id" text, "payload" jsonb DEFAULT '{}'::jsonb, "ip_address" text, "user_agent" text, "created_at" timestamp with time zone DEFAULT now());

-- Table: simulation_runs
CREATE TABLE IF NOT EXISTS "simulation_runs" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "run_date" timestamp with time zone DEFAULT now(), "target_age" integer DEFAULT 30, "p50_academic" real NOT NULL, "p50_financial" real NOT NULL, "p50_wellness" real NOT NULL, "narrative" text, "actionable_steps" jsonb DEFAULT '[]'::jsonb, "input_snapshot" jsonb DEFAULT '{}'::jsonb);

-- Table: simulation_pathways
CREATE TABLE IF NOT EXISTS "simulation_pathways" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "simulation_id" text NOT NULL, "name" text NOT NULL, "probability" real NOT NULL, "impact_score" real NOT NULL, "description" text);

-- Table: users
CREATE TABLE IF NOT EXISTS "users" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "firebase_uid" text NOT NULL, "email" text NOT NULL, "display_name" text, "avatar_url" text, "role" USER-DEFINED NOT NULL, "date_of_birth" timestamp with time zone, "timezone" text DEFAULT 'UTC'::text, "uup_data" jsonb DEFAULT '{}'::jsonb, "coppa_consent_verified" boolean DEFAULT false, "coppa_consent_date" timestamp with time zone, "gdpr_delete_requested" boolean DEFAULT false, "accessibility_settings" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now(), "last_seen_at" timestamp with time zone);

-- Table: family_links
CREATE TABLE IF NOT EXISTS "family_links" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "parent_id" text NOT NULL, "child_id" text NOT NULL, "consent_verified" boolean DEFAULT false, "consent_method" text, "created_at" timestamp with time zone DEFAULT now());

-- Table: doter_profiles
CREATE TABLE IF NOT EXISTS "doter_profiles" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "state" USER-DEFINED DEFAULT 'EGG'::"DoterState", "name" text DEFAULT 'My Doter'::text, "level" integer DEFAULT 1, "xp" integer DEFAULT 0, "coin_balance" integer DEFAULT 0, "streak_days" integer DEFAULT 0, "is_sluggy" boolean DEFAULT false, "is_energetic" boolean DEFAULT false, "debuffs" jsonb DEFAULT '[]'::jsonb, "buffs" jsonb DEFAULT '[]'::jsonb, "skin_id" text DEFAULT 'default'::text, "accessories" jsonb DEFAULT '[]'::jsonb, "evolution_history" jsonb DEFAULT '[]'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: quests
CREATE TABLE IF NOT EXISTS "quests" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "title" text NOT NULL, "description" text, "pillar" USER-DEFINED NOT NULL, "status" USER-DEFINED DEFAULT 'PENDING'::"QuestStatus", "xp_reward" integer DEFAULT 100, "coin_reward" integer DEFAULT 50, "proof_url" text, "proof_type" text, "ai_confidence" real, "ai_verified" boolean DEFAULT false, "goal_id" text, "mastery_weight" real DEFAULT 0, "is_chunk" boolean DEFAULT false, "parent_quest_id" text, "chunk_index" integer, "metadata" jsonb DEFAULT '{}'::jsonb, "due_date" timestamp with time zone, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: points_ledger
CREATE TABLE IF NOT EXISTS "points_ledger" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "transaction_type" USER-DEFINED NOT NULL, "amount" integer NOT NULL, "balance_after" integer NOT NULL, "source" USER-DEFINED NOT NULL, "source_id" text, "status" USER-DEFINED DEFAULT 'SETTLED'::"TransactionStatus", "description" text, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now());

-- Table: activities
CREATE TABLE IF NOT EXISTS "activities" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "title" text NOT NULL, "description" text, "pillar" USER-DEFINED, "status" USER-DEFINED DEFAULT 'SCHEDULED'::"ActivityStatus", "start_time" timestamp with time zone NOT NULL, "end_time" timestamp with time zone NOT NULL, "rrule" text, "is_recurring" boolean DEFAULT false, "quest_id" text, "goal_id" text, "version" integer DEFAULT 1, "version_history" jsonb DEFAULT '[]'::jsonb, "is_deep_work" boolean DEFAULT false, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: streaks
CREATE TABLE IF NOT EXISTS "streaks" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "pillar" USER-DEFINED NOT NULL, "current_days" integer DEFAULT 0, "longest_days" integer DEFAULT 0, "last_activity" timestamp with time zone, "freeze_count" integer DEFAULT 0, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: lms_assignments
CREATE TABLE IF NOT EXISTS "lms_assignments" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "connection_id" text NOT NULL, "external_id" text NOT NULL, "title" text NOT NULL, "description" text, "due_date" timestamp with time zone, "course_id" text NOT NULL, "course_name" text NOT NULL, "points" real, "grade" real, "status" text DEFAULT 'PENDING'::text, "difficulty" real, "metadata" jsonb DEFAULT '{}'::jsonb, "synced_at" timestamp with time zone DEFAULT now());

-- Table: skill_gaps
CREATE TABLE IF NOT EXISTS "skill_gaps" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "subject" text NOT NULL, "pillar" USER-DEFINED NOT NULL, "gap_score" real NOT NULL, "last_practiced" timestamp with time zone, "rit_score" real, "metadata" jsonb DEFAULT '{}'::jsonb, "updated_at" timestamp with time zone DEFAULT now());

-- Table: tutoring_sessions
CREATE TABLE IF NOT EXISTS "tutoring_sessions" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "assignment_id" text, "subject" text NOT NULL, "session_log" jsonb DEFAULT '[]'::jsonb, "path_to_solution" jsonb DEFAULT '[]'::jsonb, "mastery_gained" real DEFAULT 0, "duration" integer DEFAULT 0, "created_at" timestamp with time zone DEFAULT now(), "ended_at" timestamp with time zone);

-- Table: evidence_items
CREATE TABLE IF NOT EXISTS "evidence_items" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "quest_id" text, "title" text NOT NULL, "type" text NOT NULL, "url" text NOT NULL, "thumbnail_url" text, "ai_pro_tip" text, "comments" jsonb DEFAULT '[]'::jsonb, "is_public" boolean DEFAULT false, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now());

-- Table: ventures
CREATE TABLE IF NOT EXISTS "ventures" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "name" text NOT NULL, "description" text, "status" USER-DEFINED DEFAULT 'DRAFT'::"VentureStatus", "business_plan_url" text, "problem" text, "solution" text, "target_market" text, "pricing_model" text, "revenue_model" text, "total_revenue" real DEFAULT 0, "parent_approved" boolean DEFAULT false, "parent_approved_at" timestamp with time zone, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: escrows
CREATE TABLE IF NOT EXISTS "escrows" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "venture_id" text NOT NULL, "seller_id" text NOT NULL, "buyer_email" text NOT NULL, "amount_usd" real NOT NULL, "status" USER-DEFINED DEFAULT 'HELD'::"EscrowStatus", "stripe_payment_intent_id" text, "proof_url" text, "proof_notes" text, "rejection_reason" text, "released_at" timestamp with time zone, "metadata" jsonb DEFAULT '{}'::jsonb, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: safety_scores
CREATE TABLE IF NOT EXISTS "safety_scores" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "score" real NOT NULL, "components" jsonb DEFAULT '{}'::jsonb, "alerts" jsonb DEFAULT '[]'::jsonb, "recorded_at" timestamp with time zone DEFAULT now());

-- Table: achievements
CREATE TABLE IF NOT EXISTS "achievements" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "pillar" USER-DEFINED NOT NULL, "points" integer DEFAULT 0, "badge_url" text NOT NULL, "sbt_token_id" text, "sbt_contract" text, "is_minted" boolean DEFAULT false, "metadata" jsonb DEFAULT '{}'::jsonb, "earned_at" timestamp with time zone DEFAULT now());

-- Table: weekly_plans
CREATE TABLE IF NOT EXISTS "weekly_plans" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "week_start" timestamp with time zone NOT NULL, "week_end" timestamp with time zone NOT NULL, "ai_draft" jsonb DEFAULT '[]'::jsonb, "final_plan" jsonb DEFAULT '[]'::jsonb, "focus_pillars" jsonb DEFAULT '[]'::jsonb, "is_finalized" boolean DEFAULT false, "created_at" timestamp with time zone DEFAULT now(), "updated_at" timestamp with time zone DEFAULT now());

-- Table: notifications
CREATE TABLE IF NOT EXISTS "notifications" ("id" text NOT NULL DEFAULT (gen_random_uuid())::text, "user_id" text NOT NULL, "type" text NOT NULL, "title" text NOT NULL, "body" text NOT NULL, "data" jsonb DEFAULT '{}'::jsonb, "is_read" boolean DEFAULT false, "created_at" timestamp with time zone DEFAULT now(), "read_at" timestamp with time zone);

CREATE UNIQUE INDEX goals_pkey ON public.goals USING btree (id);
CREATE UNIQUE INDEX lms_connections_pkey ON public.lms_connections USING btree (id);
CREATE UNIQUE INDEX biometric_logs_pkey ON public.biometric_logs USING btree (id);
CREATE INDEX biometric_logs_user_id_logged_at_idx ON public.biometric_logs USING btree (user_id, logged_at);
CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);
CREATE UNIQUE INDEX skill_agents_pkey ON public.skill_agents USING btree (id);
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
CREATE INDEX audit_logs_actor_id_created_at_idx ON public.audit_logs USING btree (actor_id, created_at);
CREATE INDEX audit_logs_action_created_at_idx ON public.audit_logs USING btree (action, created_at);
CREATE UNIQUE INDEX simulation_runs_pkey ON public.simulation_runs USING btree (id);
CREATE INDEX simulation_runs_user_id_run_date_idx ON public.simulation_runs USING btree (user_id, run_date);
CREATE UNIQUE INDEX simulation_pathways_pkey ON public.simulation_pathways USING btree (id);
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
CREATE UNIQUE INDEX users_firebase_uid_key ON public.users USING btree (firebase_uid);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX family_links_pkey ON public.family_links USING btree (id);
CREATE UNIQUE INDEX family_links_parent_id_child_id_key ON public.family_links USING btree (parent_id, child_id);
CREATE UNIQUE INDEX doter_profiles_pkey ON public.doter_profiles USING btree (id);
CREATE UNIQUE INDEX doter_profiles_user_id_key ON public.doter_profiles USING btree (user_id);
CREATE UNIQUE INDEX quests_pkey ON public.quests USING btree (id);
CREATE UNIQUE INDEX points_ledger_pkey ON public.points_ledger USING btree (id);
CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);
CREATE UNIQUE INDEX streaks_pkey ON public.streaks USING btree (id);
CREATE UNIQUE INDEX streaks_user_id_pillar_key ON public.streaks USING btree (user_id, pillar);
CREATE UNIQUE INDEX lms_assignments_pkey ON public.lms_assignments USING btree (id);
CREATE UNIQUE INDEX skill_gaps_pkey ON public.skill_gaps USING btree (id);
CREATE UNIQUE INDEX skill_gaps_user_id_subject_key ON public.skill_gaps USING btree (user_id, subject);
CREATE UNIQUE INDEX tutoring_sessions_pkey ON public.tutoring_sessions USING btree (id);
CREATE UNIQUE INDEX evidence_items_pkey ON public.evidence_items USING btree (id);
CREATE UNIQUE INDEX ventures_pkey ON public.ventures USING btree (id);
CREATE UNIQUE INDEX escrows_pkey ON public.escrows USING btree (id);
CREATE UNIQUE INDEX safety_scores_pkey ON public.safety_scores USING btree (id);
CREATE INDEX safety_scores_user_id_recorded_at_idx ON public.safety_scores USING btree (user_id, recorded_at);
CREATE UNIQUE INDEX achievements_pkey ON public.achievements USING btree (id);
CREATE UNIQUE INDEX weekly_plans_pkey ON public.weekly_plans USING btree (id);
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

-- End Schema Backup --

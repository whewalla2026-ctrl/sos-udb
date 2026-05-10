--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'WIN1256';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: udb
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO udb;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: ActivityStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActivityStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ActivityStatus" OWNER TO postgres;

--
-- Name: BiometricSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BiometricSource" AS ENUM (
    'APPLE_HEALTH',
    'OURA',
    'GOOGLE_FIT',
    'MANUAL',
    'WEARABLE'
);


ALTER TYPE public."BiometricSource" OWNER TO postgres;

--
-- Name: DoterState; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DoterState" AS ENUM (
    'EGG',
    'HATCHLING',
    'JUVENILE',
    'ADOLESCENT',
    'ADULT',
    'LEGENDARY'
);


ALTER TYPE public."DoterState" OWNER TO postgres;

--
-- Name: EscrowStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EscrowStatus" AS ENUM (
    'HELD',
    'PROOF_SUBMITTED',
    'RELEASED',
    'DISPUTED',
    'REFUNDED'
);


ALTER TYPE public."EscrowStatus" OWNER TO postgres;

--
-- Name: GoalStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GoalStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
    'ARCHIVED'
);


ALTER TYPE public."GoalStatus" OWNER TO postgres;

--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MessageStatus" AS ENUM (
    'SENT',
    'DELIVERED',
    'READ'
);


ALTER TYPE public."MessageStatus" OWNER TO postgres;

--
-- Name: QuestPillar; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QuestPillar" AS ENUM (
    'ACADEMIC',
    'BIOMETRIC',
    'GAMIFICATION',
    'ENTREPRENEURSHIP',
    'SOCIAL',
    'LIFE_SKILLS',
    'SKILLS'
);


ALTER TYPE public."QuestPillar" OWNER TO postgres;

--
-- Name: QuestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QuestStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);


ALTER TYPE public."QuestStatus" OWNER TO postgres;

--
-- Name: TransactionSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionSource" AS ENUM (
    'QUEST',
    'MANUAL_AWARD',
    'ESCROW',
    'PURCHASE',
    'BONUS',
    'STREAK_REWARD'
);


ALTER TYPE public."TransactionSource" OWNER TO postgres;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'SETTLED',
    'REVERSED'
);


ALTER TYPE public."TransactionStatus" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'EARN',
    'SPEND',
    'REVERSE',
    'ESCROW_HOLD',
    'ESCROW_RELEASE'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'PARENT',
    'CHILD',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: VentureStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VentureStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED'
);


ALTER TYPE public."VentureStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    points integer DEFAULT 0,
    badge_url text NOT NULL,
    sbt_token_id text,
    sbt_contract text,
    is_minted boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    earned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar",
    status public."ActivityStatus" DEFAULT 'SCHEDULED'::public."ActivityStatus",
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    rrule text,
    is_recurring boolean DEFAULT false,
    quest_id text,
    goal_id text,
    version integer DEFAULT 1,
    version_history jsonb DEFAULT '[]'::jsonb,
    is_deep_work boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id text,
    payload jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: biometric_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biometric_logs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    logged_at timestamp with time zone DEFAULT now(),
    sleep_hours real,
    hrv real,
    stress_level real,
    focus_score real,
    heart_rate real,
    steps integer,
    source public."BiometricSource" NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.biometric_logs OWNER TO postgres;

--
-- Name: doter_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doter_profiles (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    state public."DoterState" DEFAULT 'EGG'::public."DoterState",
    name text DEFAULT 'My Doter'::text,
    level integer DEFAULT 1,
    xp integer DEFAULT 0,
    coin_balance integer DEFAULT 0,
    streak_days integer DEFAULT 0,
    is_sluggy boolean DEFAULT false,
    is_energetic boolean DEFAULT false,
    debuffs jsonb DEFAULT '[]'::jsonb,
    buffs jsonb DEFAULT '[]'::jsonb,
    skin_id text DEFAULT 'default'::text,
    accessories jsonb DEFAULT '[]'::jsonb,
    evolution_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.doter_profiles OWNER TO postgres;

--
-- Name: escrows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escrows (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    venture_id text NOT NULL,
    seller_id text NOT NULL,
    buyer_email text NOT NULL,
    amount_usd real NOT NULL,
    status public."EscrowStatus" DEFAULT 'HELD'::public."EscrowStatus",
    stripe_payment_intent_id text,
    proof_url text,
    proof_notes text,
    rejection_reason text,
    released_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.escrows OWNER TO postgres;

--
-- Name: evidence_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_items (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    quest_id text,
    title text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    thumbnail_url text,
    ai_pro_tip text,
    comments jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.evidence_items OWNER TO postgres;

--
-- Name: family_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_links (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    parent_id text NOT NULL,
    child_id text NOT NULL,
    consent_verified boolean DEFAULT false,
    consent_method text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.family_links OWNER TO postgres;

--
-- Name: goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goals (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar" NOT NULL,
    status public."GoalStatus" DEFAULT 'ACTIVE'::public."GoalStatus",
    target_weight real DEFAULT 100,
    current_weight real DEFAULT 0,
    certificate_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.goals OWNER TO postgres;

--
-- Name: lms_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lms_assignments (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    connection_id text NOT NULL,
    external_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    course_id text NOT NULL,
    course_name text NOT NULL,
    points real,
    grade real,
    status text DEFAULT 'PENDING'::text,
    difficulty real,
    metadata jsonb DEFAULT '{}'::jsonb,
    synced_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lms_assignments OWNER TO postgres;

--
-- Name: lms_connections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lms_connections (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    provider text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expiry timestamp with time zone,
    external_id text NOT NULL,
    sync_status text DEFAULT 'PENDING'::text,
    last_sync_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lms_connections OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    sender_id text NOT NULL,
    receiver_id text NOT NULL,
    content text NOT NULL,
    status public."MessageStatus" DEFAULT 'SENT'::public."MessageStatus",
    is_safe boolean DEFAULT true,
    safety_score real,
    is_ai_message boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: points_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.points_ledger (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    transaction_type public."TransactionType" NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    source public."TransactionSource" NOT NULL,
    source_id text,
    status public."TransactionStatus" DEFAULT 'SETTLED'::public."TransactionStatus",
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.points_ledger OWNER TO postgres;

--
-- Name: quests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quests (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar" NOT NULL,
    status public."QuestStatus" DEFAULT 'PENDING'::public."QuestStatus",
    xp_reward integer DEFAULT 100,
    coin_reward integer DEFAULT 50,
    proof_url text,
    proof_type text,
    ai_confidence real,
    ai_verified boolean DEFAULT false,
    goal_id text,
    mastery_weight real DEFAULT 0,
    is_chunk boolean DEFAULT false,
    parent_quest_id text,
    chunk_index integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quests OWNER TO postgres;

--
-- Name: safety_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.safety_scores (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    score real NOT NULL,
    components jsonb DEFAULT '{}'::jsonb,
    alerts jsonb DEFAULT '[]'::jsonb,
    recorded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.safety_scores OWNER TO postgres;

--
-- Name: simulation_pathways; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.simulation_pathways (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    simulation_id text NOT NULL,
    name text NOT NULL,
    probability real NOT NULL,
    impact_score real NOT NULL,
    description text
);


ALTER TABLE public.simulation_pathways OWNER TO postgres;

--
-- Name: simulation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.simulation_runs (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    run_date timestamp with time zone DEFAULT now(),
    target_age integer DEFAULT 30,
    p50_academic real NOT NULL,
    p50_financial real NOT NULL,
    p50_wellness real NOT NULL,
    narrative text,
    actionable_steps jsonb DEFAULT '[]'::jsonb,
    input_snapshot jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.simulation_runs OWNER TO postgres;

--
-- Name: skill_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_agents (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    skill_name text NOT NULL,
    status text DEFAULT 'IDLE'::text,
    autonomy_level real DEFAULT 0.5,
    learning_path jsonb DEFAULT '[]'::jsonb,
    last_action text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.skill_agents OWNER TO postgres;

--
-- Name: skill_gaps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_gaps (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    subject text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    gap_score real NOT NULL,
    last_practiced timestamp with time zone,
    rit_score real,
    metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.skill_gaps OWNER TO postgres;

--
-- Name: streaks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.streaks (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    current_days integer DEFAULT 0,
    longest_days integer DEFAULT 0,
    last_activity timestamp with time zone,
    freeze_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.streaks OWNER TO postgres;

--
-- Name: tutoring_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tutoring_sessions (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    assignment_id text,
    subject text NOT NULL,
    session_log jsonb DEFAULT '[]'::jsonb,
    path_to_solution jsonb DEFAULT '[]'::jsonb,
    mastery_gained real DEFAULT 0,
    duration integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone
);


ALTER TABLE public.tutoring_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    firebase_uid text NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    role public."UserRole" NOT NULL,
    date_of_birth timestamp with time zone,
    timezone text DEFAULT 'UTC'::text,
    uup_data jsonb DEFAULT '{}'::jsonb,
    coppa_consent_verified boolean DEFAULT false,
    coppa_consent_date timestamp with time zone,
    gdpr_delete_requested boolean DEFAULT false,
    accessibility_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: ventures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventures (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    description text,
    status public."VentureStatus" DEFAULT 'DRAFT'::public."VentureStatus",
    business_plan_url text,
    problem text,
    solution text,
    target_market text,
    pricing_model text,
    revenue_model text,
    total_revenue real DEFAULT 0,
    parent_approved boolean DEFAULT false,
    parent_approved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ventures OWNER TO postgres;

--
-- Name: weekly_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_plans (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    week_start timestamp with time zone NOT NULL,
    week_end timestamp with time zone NOT NULL,
    ai_draft jsonb DEFAULT '[]'::jsonb,
    final_plan jsonb DEFAULT '[]'::jsonb,
    focus_pillars jsonb DEFAULT '[]'::jsonb,
    is_finalized boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.weekly_plans OWNER TO postgres;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: biometric_logs biometric_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_pkey PRIMARY KEY (id);


--
-- Name: doter_profiles doter_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doter_profiles
    ADD CONSTRAINT doter_profiles_pkey PRIMARY KEY (id);


--
-- Name: doter_profiles doter_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doter_profiles
    ADD CONSTRAINT doter_profiles_user_id_key UNIQUE (user_id);


--
-- Name: escrows escrows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_pkey PRIMARY KEY (id);


--
-- Name: evidence_items evidence_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_pkey PRIMARY KEY (id);


--
-- Name: family_links family_links_parent_id_child_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_parent_id_child_id_key UNIQUE (parent_id, child_id);


--
-- Name: family_links family_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: lms_assignments lms_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_pkey PRIMARY KEY (id);


--
-- Name: lms_connections lms_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lms_connections
    ADD CONSTRAINT lms_connections_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: points_ledger points_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_pkey PRIMARY KEY (id);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: safety_scores safety_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_scores
    ADD CONSTRAINT safety_scores_pkey PRIMARY KEY (id);


--
-- Name: simulation_pathways simulation_pathways_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulation_pathways
    ADD CONSTRAINT simulation_pathways_pkey PRIMARY KEY (id);


--
-- Name: simulation_runs simulation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulation_runs
    ADD CONSTRAINT simulation_runs_pkey PRIMARY KEY (id);


--
-- Name: skill_agents skill_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_agents
    ADD CONSTRAINT skill_agents_pkey PRIMARY KEY (id);


--
-- Name: skill_gaps skill_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_pkey PRIMARY KEY (id);


--
-- Name: skill_gaps skill_gaps_user_id_subject_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_user_id_subject_key UNIQUE (user_id, subject);


--
-- Name: streaks streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streaks
    ADD CONSTRAINT streaks_pkey PRIMARY KEY (id);


--
-- Name: streaks streaks_user_id_pillar_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streaks
    ADD CONSTRAINT streaks_user_id_pillar_key UNIQUE (user_id, pillar);


--
-- Name: tutoring_sessions tutoring_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ventures ventures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventures
    ADD CONSTRAINT ventures_pkey PRIMARY KEY (id);


--
-- Name: weekly_plans weekly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_pkey PRIMARY KEY (id);


--
-- Name: activities_user_id_start_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_user_id_start_time_idx ON public.activities USING btree (user_id, start_time);


--
-- Name: audit_logs_action_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_action_created_at_idx ON public.audit_logs USING btree (action, created_at);


--
-- Name: audit_logs_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_actor_id_created_at_idx ON public.audit_logs USING btree (actor_id, created_at);


--
-- Name: biometric_logs_user_id_logged_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX biometric_logs_user_id_logged_at_idx ON public.biometric_logs USING btree (user_id, logged_at);


--
-- Name: escrows_seller_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX escrows_seller_id_idx ON public.escrows USING btree (seller_id);


--
-- Name: evidence_items_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX evidence_items_user_id_idx ON public.evidence_items USING btree (user_id);


--
-- Name: goals_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX goals_user_id_status_idx ON public.goals USING btree (user_id, status);


--
-- Name: lms_assignments_connection_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lms_assignments_connection_id_idx ON public.lms_assignments USING btree (connection_id);


--
-- Name: lms_connections_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lms_connections_user_id_idx ON public.lms_connections USING btree (user_id);


--
-- Name: messages_receiver_id_sender_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_receiver_id_sender_id_idx ON public.messages USING btree (receiver_id, sender_id, created_at DESC);


--
-- Name: messages_sender_id_receiver_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_sender_id_receiver_id_idx ON public.messages USING btree (sender_id, receiver_id, created_at DESC);


--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: points_ledger_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX points_ledger_user_id_created_at_idx ON public.points_ledger USING btree (user_id, created_at DESC);


--
-- Name: quests_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX quests_user_id_created_at_idx ON public.quests USING btree (user_id, created_at DESC);


--
-- Name: quests_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX quests_user_id_status_idx ON public.quests USING btree (user_id, status);


--
-- Name: safety_scores_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX safety_scores_user_id_recorded_at_idx ON public.safety_scores USING btree (user_id, recorded_at);


--
-- Name: simulation_runs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX simulation_runs_user_id_idx ON public.simulation_runs USING btree (user_id);


--
-- Name: simulation_runs_user_id_run_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX simulation_runs_user_id_run_date_idx ON public.simulation_runs USING btree (user_id, run_date);


--
-- Name: skill_agents_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX skill_agents_user_id_idx ON public.skill_agents USING btree (user_id);


--
-- Name: tutoring_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tutoring_sessions_user_id_idx ON public.tutoring_sessions USING btree (user_id);


--
-- Name: ventures_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ventures_user_id_idx ON public.ventures USING btree (user_id);


--
-- Name: weekly_plans_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX weekly_plans_user_id_idx ON public.weekly_plans USING btree (user_id);


--
-- Name: achievements achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: biometric_logs biometric_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doter_profiles doter_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doter_profiles
    ADD CONSTRAINT doter_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: escrows escrows_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: escrows escrows_venture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_venture_id_fkey FOREIGN KEY (venture_id) REFERENCES public.ventures(id);


--
-- Name: evidence_items evidence_items_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id);


--
-- Name: evidence_items evidence_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: family_links family_links_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: family_links family_links_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lms_assignments lms_assignments_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.lms_connections(id) ON DELETE CASCADE;


--
-- Name: lms_connections lms_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lms_connections
    ADD CONSTRAINT lms_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points_ledger points_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quests quests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: safety_scores safety_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_scores
    ADD CONSTRAINT safety_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: simulation_pathways simulation_pathways_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulation_pathways
    ADD CONSTRAINT simulation_pathways_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_runs(id) ON DELETE CASCADE;


--
-- Name: simulation_runs simulation_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulation_runs
    ADD CONSTRAINT simulation_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_agents skill_agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_agents
    ADD CONSTRAINT skill_agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_gaps skill_gaps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: streaks streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.streaks
    ADD CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutoring_sessions tutoring_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ventures ventures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventures
    ADD CONSTRAINT ventures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE achievements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.achievements TO udb;


--
-- Name: TABLE activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activities TO udb;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO udb;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO udb;


--
-- Name: TABLE biometric_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.biometric_logs TO udb;


--
-- Name: TABLE doter_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.doter_profiles TO udb;


--
-- Name: TABLE escrows; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.escrows TO udb;


--
-- Name: TABLE evidence_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_items TO udb;


--
-- Name: TABLE family_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.family_links TO udb;


--
-- Name: TABLE goals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.goals TO udb;


--
-- Name: TABLE lms_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lms_assignments TO udb;


--
-- Name: TABLE lms_connections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lms_connections TO udb;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO udb;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO udb;


--
-- Name: TABLE points_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.points_ledger TO udb;


--
-- Name: TABLE quests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.quests TO udb;


--
-- Name: TABLE safety_scores; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.safety_scores TO udb;


--
-- Name: TABLE simulation_pathways; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.simulation_pathways TO udb;


--
-- Name: TABLE simulation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.simulation_runs TO udb;


--
-- Name: TABLE skill_agents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.skill_agents TO udb;


--
-- Name: TABLE skill_gaps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.skill_gaps TO udb;


--
-- Name: TABLE streaks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.streaks TO udb;


--
-- Name: TABLE tutoring_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tutoring_sessions TO udb;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO udb;


--
-- Name: TABLE ventures; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ventures TO udb;


--
-- Name: TABLE weekly_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.weekly_plans TO udb;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO udb;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO udb;


--
-- PostgreSQL database dump complete
--


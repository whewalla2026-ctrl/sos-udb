--
-- PostgreSQL database dump
--

\restrict poQNiw7BJUH2lpCab7zi3pOBwdvlW6cTeWoClEYIWjls6LT3tzHLT493I1VwRQr

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ActivityStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivityStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: BiometricSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BiometricSource" AS ENUM (
    'APPLE_HEALTH',
    'OURA',
    'GOOGLE_FIT',
    'MANUAL',
    'WEARABLE'
);


--
-- Name: DoterState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DoterState" AS ENUM (
    'EGG',
    'HATCHLING',
    'JUVENILE',
    'ADOLESCENT',
    'ADULT',
    'LEGENDARY'
);


--
-- Name: EscrowStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EscrowStatus" AS ENUM (
    'HELD',
    'PROOF_SUBMITTED',
    'RELEASED',
    'DISPUTED',
    'REFUNDED'
);


--
-- Name: GoalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GoalStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
    'ARCHIVED'
);


--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MessageStatus" AS ENUM (
    'SENT',
    'DELIVERED',
    'READ'
);


--
-- Name: QuestPillar; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: QuestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuestStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);


--
-- Name: TransactionSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionSource" AS ENUM (
    'QUEST',
    'MANUAL_AWARD',
    'ESCROW',
    'PURCHASE',
    'BONUS',
    'STREAK_REWARD'
);


--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'SETTLED',
    'REVERSED'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'EARN',
    'SPEND',
    'REVERSE',
    'ESCROW_HOLD',
    'ESCROW_RELEASE'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'PARENT',
    'CHILD',
    'ADMIN'
);


--
-- Name: VentureStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VentureStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED'
);


--
-- Name: prevent_audit_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_audit_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: % operations are not permitted', TG_OP;
  RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 1 NOT NULL
);


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    badge_url text NOT NULL,
    sbt_token_id text,
    sbt_contract text,
    is_minted boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    earned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    points integer DEFAULT 0 NOT NULL
);


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar",
    status public."ActivityStatus" DEFAULT 'SCHEDULED'::public."ActivityStatus" NOT NULL,
    start_time timestamp(3) without time zone NOT NULL,
    end_time timestamp(3) without time zone NOT NULL,
    rrule text,
    is_recurring boolean DEFAULT false NOT NULL,
    quest_id text,
    goal_id text,
    version integer DEFAULT 1 NOT NULL,
    version_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_deep_work boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id bigint NOT NULL,
    user_id text NOT NULL,
    event character varying(100) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analytics_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: billing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plans (
    id text NOT NULL,
    stripe_price_id text,
    name text NOT NULL,
    description text,
    price_usd double precision NOT NULL,
    "interval" text DEFAULT 'month'::text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_users integer DEFAULT 1 NOT NULL,
    max_ventures integer DEFAULT 0 NOT NULL,
    max_storage_mb integer DEFAULT 100 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: biometric_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biometric_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    logged_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sleep_hours double precision,
    hrv double precision,
    stress_level double precision,
    focus_score double precision,
    heart_rate double precision,
    steps integer,
    source public."BiometricSource" NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: doter_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doter_profiles (
    id text NOT NULL,
    user_id text NOT NULL,
    state public."DoterState" DEFAULT 'EGG'::public."DoterState" NOT NULL,
    name text DEFAULT 'My Doter'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    coin_balance integer DEFAULT 0 NOT NULL,
    streak_days integer DEFAULT 0 NOT NULL,
    is_sluggy boolean DEFAULT false NOT NULL,
    is_energetic boolean DEFAULT false NOT NULL,
    debuffs jsonb DEFAULT '[]'::jsonb NOT NULL,
    buffs jsonb DEFAULT '[]'::jsonb NOT NULL,
    skin_id text DEFAULT 'default'::text NOT NULL,
    accessories jsonb DEFAULT '[]'::jsonb NOT NULL,
    evolution_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: doter_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doter_rewards (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text,
    tier text NOT NULL,
    trigger_type text,
    trigger_value double precision,
    earned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: escrows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escrows (
    id text NOT NULL,
    venture_id text NOT NULL,
    seller_id text NOT NULL,
    buyer_email text NOT NULL,
    amount_usd double precision NOT NULL,
    status public."EscrowStatus" DEFAULT 'HELD'::public."EscrowStatus" NOT NULL,
    stripe_payment_intent_id text,
    proof_url text,
    proof_notes text,
    rejection_reason text,
    released_at timestamp(3) without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: evidence_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_items (
    id text NOT NULL,
    user_id text NOT NULL,
    quest_id text,
    title text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    thumbnail_url text,
    ai_pro_tip text,
    comments jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: evolution_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evolution_triggers (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    condition jsonb NOT NULL,
    effect jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: family_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.family_links (
    id text NOT NULL,
    parent_id text NOT NULL,
    child_id text NOT NULL,
    consent_verified boolean DEFAULT false NOT NULL,
    consent_method text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar" NOT NULL,
    status public."GoalStatus" DEFAULT 'ACTIVE'::public."GoalStatus" NOT NULL,
    target_weight double precision DEFAULT 100 NOT NULL,
    current_weight double precision DEFAULT 0 NOT NULL,
    certificate_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    due_date timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    subscription_id text NOT NULL,
    user_id text NOT NULL,
    stripe_invoice_id text,
    amount_usd double precision NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp(3) without time zone,
    invoice_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lms_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_assignments (
    id text NOT NULL,
    connection_id text NOT NULL,
    external_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp(3) without time zone,
    course_id text NOT NULL,
    course_name text NOT NULL,
    points double precision,
    grade double precision,
    status text DEFAULT 'PENDING'::text NOT NULL,
    difficulty double precision,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lms_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_connections (
    id text NOT NULL,
    user_id text NOT NULL,
    provider text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expiry timestamp(3) without time zone,
    external_id text NOT NULL,
    sync_status text DEFAULT 'PENDING'::text NOT NULL,
    last_sync_at timestamp(3) without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    sender_id text NOT NULL,
    receiver_id text NOT NULL,
    content text NOT NULL,
    status public."MessageStatus" DEFAULT 'SENT'::public."MessageStatus" NOT NULL,
    is_safe boolean DEFAULT true NOT NULL,
    safety_score double precision,
    is_ai_message boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp(3) without time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp(3) without time zone
);


--
-- Name: onboarding_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_status (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    current_step integer DEFAULT 0,
    total_steps integer DEFAULT 5,
    completed boolean DEFAULT false,
    skipped boolean DEFAULT false,
    profile_complete boolean DEFAULT false,
    doter_named boolean DEFAULT false,
    first_quest_done boolean DEFAULT false,
    tour_completed boolean DEFAULT false,
    role character varying(20) DEFAULT 'CHILD'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: points_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_ledger (
    id text NOT NULL,
    user_id text NOT NULL,
    transaction_type public."TransactionType" NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    source public."TransactionSource" NOT NULL,
    source_id text,
    status public."TransactionStatus" DEFAULT 'SETTLED'::public."TransactionStatus" NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quests (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    pillar public."QuestPillar" NOT NULL,
    status public."QuestStatus" DEFAULT 'PENDING'::public."QuestStatus" NOT NULL,
    xp_reward integer DEFAULT 100 NOT NULL,
    coin_reward integer DEFAULT 50 NOT NULL,
    proof_url text,
    proof_type text,
    ai_confidence double precision,
    ai_verified boolean DEFAULT false NOT NULL,
    goal_id text,
    mastery_weight double precision DEFAULT 0 NOT NULL,
    is_chunk boolean DEFAULT false NOT NULL,
    parent_quest_id text,
    chunk_index integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    due_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: safety_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safety_scores (
    id text NOT NULL,
    user_id text NOT NULL,
    score double precision NOT NULL,
    components jsonb DEFAULT '{}'::jsonb NOT NULL,
    alerts jsonb DEFAULT '[]'::jsonb NOT NULL,
    recorded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: skill_gaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_gaps (
    id text NOT NULL,
    user_id text NOT NULL,
    subject text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    gap_score double precision NOT NULL,
    last_practiced timestamp(3) without time zone,
    rit_score double precision,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streaks (
    id text NOT NULL,
    user_id text NOT NULL,
    pillar public."QuestPillar" NOT NULL,
    current_days integer DEFAULT 0 NOT NULL,
    longest_days integer DEFAULT 0 NOT NULL,
    last_activity timestamp(3) without time zone,
    freeze_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    user_id text NOT NULL,
    plan_id text NOT NULL,
    stripe_subscription_id text,
    stripe_customer_id text,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp(3) without time zone,
    current_period_end timestamp(3) without time zone,
    canceled_at timestamp(3) without time zone,
    trial_end timestamp(3) without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: sync_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_conflicts (
    id text NOT NULL,
    user_id text NOT NULL,
    device_id text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    local_value jsonb NOT NULL,
    remote_value jsonb NOT NULL,
    resolution text DEFAULT 'pending'::text NOT NULL,
    resolved_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sync_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    device_id text NOT NULL,
    device_name text,
    device_type text DEFAULT 'web'::text NOT NULL,
    last_sync_at timestamp(3) without time zone,
    state_hash text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: topic_mastery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_mastery (
    id text NOT NULL,
    user_id text NOT NULL,
    subject text NOT NULL,
    topic text NOT NULL,
    mastery_level double precision DEFAULT 0 NOT NULL,
    confidence double precision DEFAULT 0 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    correct_pct double precision DEFAULT 0 NOT NULL,
    last_practiced timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tutor_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_analytics (
    id text NOT NULL,
    user_id text NOT NULL,
    total_sessions integer DEFAULT 0 NOT NULL,
    total_interactions integer DEFAULT 0 NOT NULL,
    avg_confidence double precision DEFAULT 0 NOT NULL,
    avg_comprehension double precision DEFAULT 0 NOT NULL,
    struggle_count integer DEFAULT 0 NOT NULL,
    hint_requests integer DEFAULT 0 NOT NULL,
    learning_velocity double precision DEFAULT 0 NOT NULL,
    retention_score double precision DEFAULT 0 NOT NULL,
    total_time_spent integer DEFAULT 0 NOT NULL,
    completed_sessions integer DEFAULT 0 NOT NULL,
    last_active_at timestamp(3) without time zone,
    snapshot_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tutor_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_evaluations (
    id text NOT NULL,
    session_id text NOT NULL,
    user_id text NOT NULL,
    interaction_id text,
    quality_score double precision DEFAULT 0 NOT NULL,
    hallucination_risk double precision DEFAULT 0 NOT NULL,
    safety_check boolean DEFAULT true NOT NULL,
    response_relevance double precision DEFAULT 0 NOT NULL,
    student_feedback double precision,
    evaluated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tutor_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_interactions (
    id text NOT NULL,
    session_id text NOT NULL,
    user_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    intent text,
    confidence double precision,
    comprehension double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tutor_memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_memories (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tutoring_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutoring_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    assignment_id text,
    subject text NOT NULL,
    session_log jsonb DEFAULT '[]'::jsonb NOT NULL,
    path_to_solution jsonb DEFAULT '[]'::jsonb NOT NULL,
    mastery_gained double precision DEFAULT 0 NOT NULL,
    duration integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(3) without time zone
);


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_records (
    id text NOT NULL,
    user_id text NOT NULL,
    metric text NOT NULL,
    value double precision NOT NULL,
    recorded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    firebase_uid text NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    role public."UserRole" NOT NULL,
    date_of_birth timestamp(3) without time zone,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    uup_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    coppa_consent_verified boolean DEFAULT false NOT NULL,
    coppa_consent_date timestamp(3) without time zone,
    gdpr_delete_requested boolean DEFAULT false NOT NULL,
    accessibility_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_seen_at timestamp(3) without time zone,
    deleted_at timestamp(3) without time zone,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: ventures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventures (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    description text,
    status public."VentureStatus" DEFAULT 'DRAFT'::public."VentureStatus" NOT NULL,
    business_plan_url text,
    problem text,
    solution text,
    "targetMarket" text,
    "pricingModel" text,
    "revenueModel" text,
    total_revenue double precision DEFAULT 0 NOT NULL,
    parent_approved boolean DEFAULT false NOT NULL,
    parent_approved_at timestamp(3) without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: weekly_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_plans (
    id text NOT NULL,
    user_id text NOT NULL,
    week_start timestamp(3) without time zone NOT NULL,
    week_end timestamp(3) without time zone NOT NULL,
    ai_draft jsonb DEFAULT '[]'::jsonb NOT NULL,
    final_plan jsonb DEFAULT '[]'::jsonb NOT NULL,
    focus_pillars jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_finalized boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: analytics_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
8b6fc7127cbe4e4485a11663dbd28d28	baseline-checksum	2026-05-10 19:19:21.487226+00	20260510221124_init	\N	\N	2026-05-10 19:19:21.487226+00	1
3f2a29c0-859f-47d8-8bd1-0a55299fc960	26d33702abbf69b5dea1be8de226e90d68a42f344df40cb040e79ae4a4e713a3	\N	20260511000000_phase1_productionization	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260511000000_phase1_productionization\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "points" of relation "achievements" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"points\\" of relation \\"achievements\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7347), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260511000000_phase1_productionization"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260511000000_phase1_productionization"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	2026-05-14 17:27:47.432139+00	2026-05-14 17:26:56.457659+00	1
354e0dd7-dee5-4a32-9f1e-850558868ce7	26d33702abbf69b5dea1be8de226e90d68a42f344df40cb040e79ae4a4e713a3	2026-05-14 17:27:47.436997+00	20260511000000_phase1_productionization		\N	2026-05-14 17:27:47.436997+00	1
\.


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.achievements (id, user_id, title, description, pillar, badge_url, sbt_token_id, sbt_contract, is_minted, metadata, earned_at, points) FROM stdin;
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activities (id, user_id, title, description, pillar, status, start_time, end_time, rrule, is_recurring, quest_id, goal_id, version, version_history, is_deep_work, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: analytics_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_events (id, user_id, event, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, action, target_type, target_id, payload, ip_address, user_agent, created_at) FROM stdin;
3	test-immutable-user	TESTING_IMMUTABILITY	\N	\N	{}	\N	\N	2026-05-22 21:59:23.38
\.


--
-- Data for Name: billing_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_plans (id, stripe_price_id, name, description, price_usd, "interval", features, max_users, max_ventures, max_storage_mb, active, sort_order, created_at, updated_at) FROM stdin;
plan_free	\N	FREE	Free tier for basic learning	0	month	["basic_tutor", "basic_doter", "basic_quests"]	1	0	100	t	0	2026-05-10 17:46:54.075	2026-05-10 17:46:54.075
plan_pro	\N	PRO	Pro tier for serious students	9.99	month	["advanced_tutor", "full_doter", "ventures", "escrow", "analytics"]	3	3	1000	t	1	2026-05-10 17:46:54.075	2026-05-10 17:46:54.075
plan_enterprise	\N	ENTERPRISE	Enterprise tier for families and institutions	29.99	month	["all_features", "priority_support", "custom_integrations", "multi_device"]	10	20	10000	t	2	2026-05-10 17:46:54.075	2026-05-10 17:46:54.075
\.


--
-- Data for Name: biometric_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biometric_logs (id, user_id, logged_at, sleep_hours, hrv, stress_level, focus_score, heart_rate, steps, source, metadata) FROM stdin;
\.


--
-- Data for Name: doter_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doter_profiles (id, user_id, state, name, level, xp, coin_balance, streak_days, is_sluggy, is_energetic, debuffs, buffs, skin_id, accessories, evolution_history, created_at, updated_at) FROM stdin;
b92f96fb-a811-4017-ab36-5b0b25d5befe	ee2b4f76-d63f-4de7-bef5-e201c2297d56	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-12 17:19:22.672	2026-05-12 17:19:22.672
fd034ca8-8c78-4a9c-b310-3f2e0d9a8d76	1cec6b21-4f13-4ec1-889a-e9a7e612c13f	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-12 18:38:05.636	2026-05-12 18:38:05.636
2f5768dd-4a2f-4ae6-a6e0-320aaf1a4119	e33e6b57-5305-441b-bd27-e6d001dc7b5a	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-14 17:31:34.49	2026-05-14 17:31:34.49
89c57d5c-d4c4-47ea-957e-7868a5b5ce05	2485c777-bc85-409c-b550-8264ab723e72	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-15 09:39:25.222	2026-05-15 09:39:25.222
5f3e2ad1-f5a9-45d8-8245-82fc0fe5805b	ecd4040b-893c-444e-9c10-84825fb336ef	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-15 15:49:50.595	2026-05-15 15:49:50.595
d6984e95-f15c-480a-a4b0-242cee00c638	bbbdee29-dc71-4767-b4ae-eabd99bccea1	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-15 17:38:41.379	2026-05-15 17:38:41.379
e400b22e-06cb-4247-ba67-b6081b970211	7cd0c414-7748-49b6-a1f7-8a323b8de1c4	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-16 06:13:07.115	2026-05-16 06:13:07.115
56ef6327-3d71-4c7b-b30e-ddda638b43af	2075bdc0-e503-46a9-ac85-3548fc8b7034	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-16 10:07:37.417	2026-05-16 10:07:37.417
02beb293-3693-4204-b6c9-aa32fd2ac479	0ba54059-3371-4554-831b-1c41c8019c8b	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-16 10:20:26.555	2026-05-16 10:20:26.555
25325b2a-bebb-4422-8db4-91b79fa6840f	88f88cd0-f90a-41eb-adcf-66478276aa42	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-16 11:15:30.05	2026-05-16 11:15:30.05
5eb7220a-ccb4-43dc-a514-6093e3d6a9fd	8ba75dbe-eb71-41bf-91c1-7b8f392ab54e	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-16 11:40:39.21	2026-05-16 11:40:39.21
cf5b0eaf-9259-4115-9cc7-3074b4d66eba	045cb6b7-4eae-4e1c-8fe1-40f1fa6a89f6	EGG	My Doter	1	0	0	0	f	f	[]	[]	default	[]	[]	2026-05-23 19:18:33.953	2026-05-23 19:18:33.953
\.


--
-- Data for Name: doter_rewards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doter_rewards (id, user_id, type, name, description, icon_url, tier, trigger_type, trigger_value, earned_at) FROM stdin;
\.


--
-- Data for Name: escrows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.escrows (id, venture_id, seller_id, buyer_email, amount_usd, status, stripe_payment_intent_id, proof_url, proof_notes, rejection_reason, released_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: evidence_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_items (id, user_id, quest_id, title, type, url, thumbnail_url, ai_pro_tip, comments, is_public, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: evolution_triggers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evolution_triggers (id, name, description, condition, effect, active, created_at) FROM stdin;
trig_streak_7	7-Day Streak	Reach a 7-day streak	{"type": "STREAK", "threshold": 7}	{"badge": "streak_7", "state": "HATCHLING", "xpBonus": 200}	t	2026-05-10 17:46:04.996
trig_xp_2000	XP 2000	Earn 2000 total XP	{"type": "XP", "threshold": 2000}	{"badge": "xp_2000", "state": "JUVENILE", "xpBonus": 500}	t	2026-05-10 17:46:04.996
trig_xp_5000	XP 5000	Earn 5000 total XP	{"type": "XP", "threshold": 5000}	{"badge": "xp_5000", "state": "ADOLESCENT", "xpBonus": 1000}	t	2026-05-10 17:46:04.996
trig_xp_12000	XP 12000	Earn 12000 total XP	{"type": "XP", "threshold": 12000}	{"badge": "xp_12000", "state": "ADULT", "xpBonus": 2000}	t	2026-05-10 17:46:04.996
trig_xp_30000	XP 30000	Earn 30000 total XP	{"type": "XP", "threshold": 30000}	{"badge": "xp_30000", "state": "LEGENDARY", "xpBonus": 5000}	t	2026-05-10 17:46:04.996
trig_quests_10	10 Quests Complete	Complete 10 quests	{"type": "QUESTS", "threshold": 10}	{"badge": "quest_10", "xpBonus": 300}	t	2026-05-10 17:46:04.996
trig_mastery_5	5 Topics Mastered	Master 5 topics (mastery >= 0.8)	{"type": "MASTERY", "threshold": 5}	{"badge": "mastery_5", "xpBonus": 500}	t	2026-05-10 17:46:04.996
\.


--
-- Data for Name: family_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.family_links (id, parent_id, child_id, consent_verified, consent_method, created_at) FROM stdin;
\.


--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goals (id, user_id, title, description, pillar, status, target_weight, current_weight, certificate_url, metadata, due_date, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, subscription_id, user_id, stripe_invoice_id, amount_usd, currency, status, paid_at, invoice_url, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: lms_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lms_assignments (id, connection_id, external_id, title, description, due_date, course_id, course_name, points, grade, status, difficulty, metadata, synced_at) FROM stdin;
\.


--
-- Data for Name: lms_connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lms_connections (id, user_id, provider, access_token, refresh_token, token_expiry, external_id, sync_status, last_sync_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, receiver_id, content, status, is_safe, safety_score, is_ai_message, metadata, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, body, data, is_read, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: onboarding_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.onboarding_status (id, user_id, current_step, total_steps, completed, skipped, profile_complete, doter_named, first_quest_done, tour_completed, role, metadata, created_at, updated_at) FROM stdin;
7da74373-376a-4d6d-9015-a8e6b4b7b536	0e062b0f-6209-4dd9-a52b-52fc3ddeaf02	5	5	t	f	t	t	t	t	CHILD	{}	2026-05-15 10:09:03.128644+00	2026-05-15 10:09:03.128644+00
\.


--
-- Data for Name: points_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_ledger (id, user_id, transaction_type, amount, balance_after, source, source_id, status, description, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: quests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quests (id, user_id, title, description, pillar, status, xp_reward, coin_reward, proof_url, proof_type, ai_confidence, ai_verified, goal_id, mastery_weight, is_chunk, parent_quest_id, chunk_index, metadata, due_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: safety_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.safety_scores (id, user_id, score, components, alerts, recorded_at) FROM stdin;
\.


--
-- Data for Name: skill_gaps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skill_gaps (id, user_id, subject, pillar, gap_score, last_practiced, rit_score, metadata, updated_at) FROM stdin;
\.


--
-- Data for Name: streaks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.streaks (id, user_id, pillar, current_days, longest_days, last_activity, freeze_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, canceled_at, trial_end, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sync_conflicts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_conflicts (id, user_id, device_id, resource_type, resource_id, local_value, remote_value, resolution, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: sync_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_sessions (id, user_id, device_id, device_name, device_type, last_sync_at, state_hash, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: topic_mastery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.topic_mastery (id, user_id, subject, topic, mastery_level, confidence, attempts, correct_pct, last_practiced, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tutor_analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_analytics (id, user_id, total_sessions, total_interactions, avg_confidence, avg_comprehension, struggle_count, hint_requests, learning_velocity, retention_score, total_time_spent, completed_sessions, last_active_at, snapshot_date) FROM stdin;
\.


--
-- Data for Name: tutor_evaluations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_evaluations (id, session_id, user_id, interaction_id, quality_score, hallucination_risk, safety_check, response_relevance, student_feedback, evaluated_at) FROM stdin;
\.


--
-- Data for Name: tutor_interactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_interactions (id, session_id, user_id, role, content, intent, confidence, comprehension, created_at) FROM stdin;
\.


--
-- Data for Name: tutor_memories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_memories (id, user_id, type, key, value, weight, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tutoring_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutoring_sessions (id, user_id, assignment_id, subject, session_log, path_to_solution, mastery_gained, duration, created_at, ended_at) FROM stdin;
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usage_records (id, user_id, metric, value, recorded_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, firebase_uid, email, display_name, avatar_url, role, date_of_birth, timezone, uup_data, coppa_consent_verified, coppa_consent_date, gdpr_delete_requested, accessibility_settings, created_at, updated_at, last_seen_at, deleted_at, is_deleted) FROM stdin;
0e062b0f-6209-4dd9-a52b-52fc3ddeaf02	auth-1778349777071	test@udb.io	Test	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 18:02:57.073	2026-05-09 18:02:57.073	\N	\N	f
3e4c403d-e588-4cbd-a0b8-5845205cf198	auth-1778354903590	finaltest@example.com	Final Test	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:28:23.596	2026-05-09 19:28:23.596	\N	\N	f
4c76c27a-c83a-409d-a2df-9e669e2b1aad	auth-1778354966577	loadtest1@example.com	Load Test User 1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:26.581	2026-05-09 19:29:26.581	\N	\N	f
261080d6-c9d4-4b1c-b7d4-4a2c67b7676f	auth-1778354966797	loadtest2@example.com	Load Test User 2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:26.798	2026-05-09 19:29:26.798	\N	\N	f
744d2c97-a0a3-435e-94ea-94104d908b0f	auth-1778354967003	loadtest3@example.com	Load Test User 3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:27.005	2026-05-09 19:29:27.005	\N	\N	f
866286bb-47ac-4eb1-9fec-b896aa73751d	auth-1778354967282	loadtest4@example.com	Load Test User 4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:27.285	2026-05-09 19:29:27.285	\N	\N	f
2ed7f475-53a6-4c12-b9af-c6d058cab1f2	auth-1778354967514	loadtest5@example.com	Load Test User 5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:27.516	2026-05-09 19:29:27.516	\N	\N	f
4142ca93-bfb5-496e-90ed-afe402e2ec2d	auth-1778354967677	loadtest6@example.com	Load Test User 6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:27.679	2026-05-09 19:29:27.679	\N	\N	f
4424427f-56b4-4d68-a726-a26b27fee66f	auth-1778354967862	loadtest7@example.com	Load Test User 7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:27.863	2026-05-09 19:29:27.863	\N	\N	f
61aa654b-6727-419f-86ee-e062f534c839	auth-1778354968098	loadtest8@example.com	Load Test User 8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:28.1	2026-05-09 19:29:28.1	\N	\N	f
6c0dea56-8742-49e6-af50-6f084dee02d2	auth-1778354968245	loadtest9@example.com	Load Test User 9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:28.246	2026-05-09 19:29:28.246	\N	\N	f
1b768ec5-bc05-478c-b042-a1feb6941a1a	auth-1778354968367	loadtest10@example.com	Load Test User 10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:29:28.369	2026-05-09 19:29:28.369	\N	\N	f
3d33c88c-e515-42cd-903c-c81c721befb1	auth-1778355160049	lt267681@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.05	2026-05-09 19:32:40.05	\N	\N	f
74ce5ef1-e2ee-4d7d-ba07-cff75bff21d5	auth-1778355160233	lt850542@sos.com	LoadT2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.234	2026-05-09 19:32:40.234	\N	\N	f
f2d3e7d1-9a16-4098-b4c4-b82792510715	auth-1778355160415	lt514893@sos.com	LoadT3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.416	2026-05-09 19:32:40.416	\N	\N	f
aab98a93-2e0a-4a0a-a308-60bf4aa2bef8	auth-1778355160587	lt803594@sos.com	LoadT4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.588	2026-05-09 19:32:40.588	\N	\N	f
0e22cf5c-f8c8-46c4-bb3a-2e4c174f140d	auth-1778355160802	lt816715@sos.com	LoadT5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.803	2026-05-09 19:32:40.803	\N	\N	f
cb42e7d4-b679-427c-8058-3da89f83257a	auth-1778355160981	lt868626@sos.com	LoadT6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:40.982	2026-05-09 19:32:40.982	\N	\N	f
86240b7d-4519-48cc-bc6a-a9b790503012	auth-1778355161133	lt984527@sos.com	LoadT7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:41.134	2026-05-09 19:32:41.134	\N	\N	f
bdf7960d-510a-4944-94aa-28d2b375160a	auth-1778355161296	lt111638@sos.com	LoadT8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:41.297	2026-05-09 19:32:41.297	\N	\N	f
994512ec-70b6-4feb-a9df-85fa45d06913	auth-1778355161451	lt856729@sos.com	LoadT9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:41.452	2026-05-09 19:32:41.452	\N	\N	f
2d9b6391-ed75-4995-9ff2-2946607d7eb4	auth-1778355161612	lt8576810@sos.com	LoadT10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:32:41.614	2026-05-09 19:32:41.614	\N	\N	f
5e7849d7-5124-4757-ab16-a6036e328898	auth-1778355232166	lt803301@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:52.196	2026-05-09 19:33:52.196	\N	\N	f
9c11f89d-3e5b-4753-8825-cad5748da0b5	auth-1778355232455	lt16212@sos.com	LoadT2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:52.458	2026-05-09 19:33:52.458	\N	\N	f
ac4d43d6-ef65-4b56-bbbe-bb70d6960279	auth-1778355232713	lt506493@sos.com	LoadT3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:52.718	2026-05-09 19:33:52.718	\N	\N	f
8a0ff47a-8d5d-4953-a34c-34994bec8edf	auth-1778355232971	lt718764@sos.com	LoadT4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:52.982	2026-05-09 19:33:52.982	\N	\N	f
0d6d9510-dd3c-4e7a-a8df-6fa78f8aef78	auth-1778355233299	lt744795@sos.com	LoadT5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.301	2026-05-09 19:33:53.301	\N	\N	f
05a380ef-5357-4c03-9842-994924848e0d	auth-1778355233432	lt90066@sos.com	LoadT6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.434	2026-05-09 19:33:53.434	\N	\N	f
a987501f-aa10-48a7-8416-b9a447017733	auth-1778355233555	lt626407@sos.com	LoadT7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.557	2026-05-09 19:33:53.557	\N	\N	f
596c5a14-a7f6-417a-904e-eaeec2dd0f80	auth-1778355233697	lt682178@sos.com	LoadT8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.699	2026-05-09 19:33:53.699	\N	\N	f
f654d9a7-3b3e-400e-9ee3-5a1c18541274	auth-1778355233828	lt570399@sos.com	LoadT9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.83	2026-05-09 19:33:53.83	\N	\N	f
a1710219-22d4-4a2b-80bb-33c92580133c	auth-1778355233958	lt8832510@sos.com	LoadT10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:33:53.96	2026-05-09 19:33:53.96	\N	\N	f
94dd9054-0ef5-4cf2-8c10-fe4b5b5ad57c	auth-1778355304612	lt664371@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:04.614	2026-05-09 19:35:04.614	\N	\N	f
f76d7d13-c6f1-466c-92b5-f17f8e0eacd5	auth-1778355304767	lt193242@sos.com	LoadT2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:04.77	2026-05-09 19:35:04.77	\N	\N	f
fbca6c82-2858-4925-beff-00c8c8a8ffc2	auth-1778355304898	lt672993@sos.com	LoadT3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:04.899	2026-05-09 19:35:04.899	\N	\N	f
bf912fa9-d619-4ea1-9ea8-afee59dec2bd	auth-1778355305026	lt691114@sos.com	LoadT4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:05.027	2026-05-09 19:35:05.027	\N	\N	f
33044162-1fdf-451b-af49-1d371c35dda9	auth-1778355305171	lt639015@sos.com	LoadT5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:05.173	2026-05-09 19:35:05.173	\N	\N	f
4d60fee7-f2b6-4fef-8bca-1aeb2b9f09d3	auth-1778355305457	lt784856@sos.com	LoadT6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:05.459	2026-05-09 19:35:05.459	\N	\N	f
97320dfa-dbbe-41ab-8db2-09fa3b066dfd	auth-1778355305707	lt996407@sos.com	LoadT7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:05.709	2026-05-09 19:35:05.709	\N	\N	f
d9c2a6b7-71fa-404b-8020-f54dcec5825f	auth-1778355305891	lt508198@sos.com	LoadT8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:05.893	2026-05-09 19:35:05.893	\N	\N	f
26bc9158-627f-493c-a851-75d973207699	auth-1778355306058	lt534369@sos.com	LoadT9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:06.06	2026-05-09 19:35:06.06	\N	\N	f
b4c4fa57-3010-4b89-801d-4d1173b92305	auth-1778355306249	lt1693110@sos.com	LoadT10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:35:06.252	2026-05-09 19:35:06.252	\N	\N	f
8466be4a-c386-4696-ac1a-1fccc9150e21	auth-1778355488975	lt416361@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:08.977	2026-05-09 19:38:08.977	\N	\N	f
c8492a43-89e8-4200-8420-c7ccc96530ec	auth-1778355489167	lt127212@sos.com	LoadT2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:09.168	2026-05-09 19:38:09.168	\N	\N	f
cd88ee9a-70e9-4a0e-adcc-4b0eeaa076c9	auth-1778355489332	lt704693@sos.com	LoadT3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:09.333	2026-05-09 19:38:09.333	\N	\N	f
4779aede-1c9b-42c4-81a3-04a49c89b152	auth-1778355489616	lt618534@sos.com	LoadT4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:09.617	2026-05-09 19:38:09.617	\N	\N	f
66831745-eb98-447f-9d75-288e978a810a	auth-1778355489762	lt628675@sos.com	LoadT5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:09.764	2026-05-09 19:38:09.764	\N	\N	f
78021631-86ce-4869-aceb-579a0c2f2ca9	auth-1778355489929	lt586856@sos.com	LoadT6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:09.931	2026-05-09 19:38:09.931	\N	\N	f
0de31ebd-5839-4594-8a8c-72ccbc25a4a3	auth-1778355490114	lt25897@sos.com	LoadT7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:10.116	2026-05-09 19:38:10.116	\N	\N	f
d2a95069-33b5-48f6-b9bf-49f93b95ce4b	auth-1778355490288	lt849888@sos.com	LoadT8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:10.289	2026-05-09 19:38:10.289	\N	\N	f
dba10080-8f52-4f52-b8a2-210bf7203676	auth-1778355490490	lt461259@sos.com	LoadT9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:10.492	2026-05-09 19:38:10.492	\N	\N	f
8be3f950-4ad3-4cef-9dc2-64acaf8eefda	auth-1778355490659	lt8053610@sos.com	LoadT10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:38:10.663	2026-05-09 19:38:10.663	\N	\N	f
8638ccb5-59ad-499b-977e-e9005e039dbc	auth-1778355548235	lt222431@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:39:08.239	2026-05-09 19:39:08.239	\N	\N	f
9920e5d3-af59-477f-bdc3-22450bfaa34c	auth-1778355830103	certcheck_2607@sos.com	CertCheck	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:43:50.104	2026-05-09 19:43:50.104	\N	\N	f
328fd573-f66a-4086-be38-111810839edb	auth-1778355916419	lt779311@sos.com	LoadT1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:16.42	2026-05-09 19:45:16.42	\N	\N	f
575ba52b-f328-4212-8138-6dca706a9a3c	auth-1778355916596	lt939942@sos.com	LoadT2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:16.598	2026-05-09 19:45:16.598	\N	\N	f
a0951789-a5e2-4df4-91c2-9e06c641ca09	auth-1778355916754	lt48733@sos.com	LoadT3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:16.755	2026-05-09 19:45:16.755	\N	\N	f
5c92c6ef-b832-45fa-a4fa-9e10745b880c	auth-1778355916904	lt382534@sos.com	LoadT4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:16.906	2026-05-09 19:45:16.906	\N	\N	f
7f0d2aae-85a2-452a-886c-e05527d9054b	auth-1778355917077	lt492645@sos.com	LoadT5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.078	2026-05-09 19:45:17.078	\N	\N	f
e05c9496-c2ee-4f26-b735-ed3b3c05b31c	auth-1778355917250	lt665006@sos.com	LoadT6	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.252	2026-05-09 19:45:17.252	\N	\N	f
8c39a0ca-940d-45a9-b5e2-2b328b392467	auth-1778355917410	lt893757@sos.com	LoadT7	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.411	2026-05-09 19:45:17.411	\N	\N	f
b8f61ace-c164-4eaf-bb02-645dc2dc82fd	auth-1778355917602	lt859358@sos.com	LoadT8	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.603	2026-05-09 19:45:17.603	\N	\N	f
503be5df-ea6e-4d13-b7ca-7851af72fb73	auth-1778355917749	lt717849@sos.com	LoadT9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.75	2026-05-09 19:45:17.75	\N	\N	f
dfd6a979-da34-4595-bba6-13164569c691	auth-1778355917916	lt6730010@sos.com	LoadT10	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:45:17.917	2026-05-09 19:45:17.917	\N	\N	f
9928ac4c-3cfa-46ec-bb7e-4a7f08733382	auth-1778356043357	certcheck_12156@sos.com	CertCheck	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:47:23.359	2026-05-09 19:47:23.359	\N	\N	f
135cf3c2-c5d0-456f-b620-853cc88a1ff5	auth-1778356053575	certcheck_99209@sos.com	CertCheck	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:47:33.577	2026-05-09 19:47:33.577	\N	\N	f
00f7b4b3-9fd0-4ec9-bbc7-27316d62e79c	auth-1778356139672	failok_3353@sos.com	FailOK	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:48:59.674	2026-05-09 19:48:59.674	\N	\N	f
ba7026a5-f3e4-4559-8922-6b4de1eeb2a5	auth-1778356164170	certcheck_31526@sos.com	CertCheck	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-09 19:49:24.171	2026-05-09 19:49:24.171	\N	\N	f
fa6e96ad-ce01-47cd-a5b7-f2e3d18d29b6	auth-1778372957330	qa_test_54013@udb.com	QA Test User	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-10 00:29:17.331	2026-05-10 00:29:17.331	\N	\N	f
5d0d99ca-a0d3-4c3a-a363-d75519484534	auth-1778373026468	fullflow_43986@udb.com	Full Flow User	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-10 00:30:26.47	2026-05-10 00:30:26.47	\N	\N	f
9a451a30-b505-43ef-90a7-0da822c4970d	auth-1778600689478	lt_setup_0@loadtest.udb	LoadTester_0	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:44:49.479	2026-05-12 15:44:49.479	\N	\N	f
5b62304b-deab-4c2f-ac3c-573ba65488bc	auth-1778600689596	lt_setup_1@loadtest.udb	LoadTester_1	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:44:49.598	2026-05-12 15:44:49.598	\N	\N	f
9013d76b-d121-47ab-8661-64775819861c	auth-1778600689688	lt_setup_2@loadtest.udb	LoadTester_2	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:44:49.688	2026-05-12 15:44:49.688	\N	\N	f
03897776-889d-4fa9-a63c-45a6e343d279	auth-1778600689772	lt_setup_3@loadtest.udb	LoadTester_3	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:44:49.773	2026-05-12 15:44:49.773	\N	\N	f
9b32b79e-cc67-41c7-818e-68fed690ad4a	auth-1778600689858	lt_setup_4@loadtest.udb	LoadTester_4	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:44:49.859	2026-05-12 15:44:49.859	\N	\N	f
b26b314b-e226-44ba-9163-15624aefbb48	auth-1778601336049	lt_setup_5@loadtest.udb	LoadTester_5	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:55:36.05	2026-05-12 15:55:36.05	\N	\N	f
b3d1e868-6512-4d5b-a8c1-a88e3524d418	auth-1778601360131	lt_setup_9@loadtest.udb	LoadTester_9	\N	CHILD	\N	UTC	{}	f	\N	f	{}	2026-05-12 15:56:00.132	2026-05-12 15:56:00.132	\N	\N	f
ee2b4f76-d63f-4de7-bef5-e201c2297d56	email:ct3@t.udb	ct3@t.udb	CT	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-12 17:19:22.637	2026-05-12 17:19:22.637	\N	\N	f
e33e6b57-5305-441b-bd27-e6d001dc7b5a	email:e2e-test-1778779894411@test.com	e2e-test-1778779894411@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-14 17:31:34.458	2026-05-14 17:31:34.458	\N	\N	f
1cec6b21-4f13-4ec1-889a-e9a7e612c13f	email:test-ph17@udb.com	test-ph17@udb.com	Phase17Test	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-12 18:38:05.612	2026-05-12 18:40:19.642	2026-05-12 18:40:19.641	\N	f
2485c777-bc85-409c-b550-8264ab723e72	email:e2e-test-1778837965114@test.com	e2e-test-1778837965114@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-15 09:39:25.168	2026-05-15 09:39:25.168	\N	\N	f
466d07bb-0c81-48f8-83f4-59a2a04b8ebd	admin-001	admin@udb.local	System Admin	\N	ADMIN	\N	UTC	{}	f	\N	f	{}	2026-05-15 10:05:48.454	2026-05-15 10:05:48.454	\N	\N	f
50b7d54a-95c8-4e86-8503-42a6dea5b0c7	parent-001	parent@udb.local	Parent User	\N	PARENT	\N	UTC	{}	f	\N	f	{}	2026-05-15 10:06:51.798	2026-05-15 10:06:51.798	\N	\N	f
ecd4040b-893c-444e-9c10-84825fb336ef	email:e2e-test-1778860190541@test.com	e2e-test-1778860190541@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-15 15:49:50.572	2026-05-15 15:49:50.572	\N	\N	f
bbbdee29-dc71-4767-b4ae-eabd99bccea1	email:e2e-test-1778866721303@test.com	e2e-test-1778866721303@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-15 17:38:41.352	2026-05-15 17:38:41.352	\N	\N	f
7cd0c414-7748-49b6-a1f7-8a323b8de1c4	email:e2e-test-1778911987056@test.com	e2e-test-1778911987056@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-16 06:13:07.087	2026-05-16 06:13:07.087	\N	\N	f
2075bdc0-e503-46a9-ac85-3548fc8b7034	email:e2e-test-1778926057313@test.com	e2e-test-1778926057313@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-16 10:07:37.367	2026-05-16 10:07:37.367	\N	\N	f
0ba54059-3371-4554-831b-1c41c8019c8b	email:smoketest@udb.local	smoketest@udb.local	SmokeTest	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-16 10:20:26.536	2026-05-16 10:20:26.536	\N	\N	f
88f88cd0-f90a-41eb-adcf-66478276aa42	email:e2e-test-1778930129998@test.com	e2e-test-1778930129998@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-16 11:15:30.03	2026-05-16 11:15:30.03	\N	\N	f
8ba75dbe-eb71-41bf-91c1-7b8f392ab54e	email:e2e-test-1778931639153@test.com	e2e-test-1778931639153@test.com	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-16 11:40:39.192	2026-05-16 11:40:39.192	\N	\N	f
test-immutable-user	immutable-test	immutable@test.com	Immutability Test User	\N	ADMIN	\N	UTC	{}	f	\N	f	{}	2026-05-22 21:59:23.267	2026-05-22 21:59:23.267	\N	\N	f
045cb6b7-4eae-4e1c-8fe1-40f1fa6a89f6	email:smoke-1779563913871@test.udb.dev	smoke-1779563913871@test.udb.dev	\N	\N	CHILD	\N	UTC	{"academic": {"math_rit": 0, "skill_gaps": {}, "reading_rit": 0, "lms_sync_status": "pending"}, "metadata": {"coppa_consent": false, "blockchain_wallet": null}, "biometric": {"last_sync": null, "focus_score": 0, "stress_index": 0, "avg_sleep_hours": 0}, "gamification": {"xp": 0, "level": 1, "streak": 0, "doter_state": "EGG", "coin_balance": 0}, "entrepreneurship": {"wallet_balance": 0, "active_projects": [], "total_revenue_usd": 0}}	f	\N	f	{"tts": false, "fontSize": "medium", "dyslexiaMode": false, "highContrast": false}	2026-05-23 19:18:33.945	2026-05-23 19:18:33.945	\N	\N	f
\.


--
-- Data for Name: ventures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ventures (id, user_id, name, description, status, business_plan_url, problem, solution, "targetMarket", "pricingModel", "revenueModel", total_revenue, parent_approved, parent_approved_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: weekly_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weekly_plans (id, user_id, week_start, week_end, ai_draft, final_plan, focus_pillars, is_finalized, created_at, updated_at) FROM stdin;
\.


--
-- Name: analytics_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.analytics_events_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: billing_plans billing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_pkey PRIMARY KEY (id);


--
-- Name: biometric_logs biometric_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_pkey PRIMARY KEY (id);


--
-- Name: doter_profiles doter_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doter_profiles
    ADD CONSTRAINT doter_profiles_pkey PRIMARY KEY (id);


--
-- Name: doter_rewards doter_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doter_rewards
    ADD CONSTRAINT doter_rewards_pkey PRIMARY KEY (id);


--
-- Name: escrows escrows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_pkey PRIMARY KEY (id);


--
-- Name: evidence_items evidence_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_pkey PRIMARY KEY (id);


--
-- Name: evolution_triggers evolution_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_triggers
    ADD CONSTRAINT evolution_triggers_pkey PRIMARY KEY (id);


--
-- Name: family_links family_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lms_assignments lms_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_pkey PRIMARY KEY (id);


--
-- Name: lms_connections lms_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_connections
    ADD CONSTRAINT lms_connections_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: onboarding_status onboarding_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_pkey PRIMARY KEY (id);


--
-- Name: onboarding_status onboarding_status_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_user_id_key UNIQUE (user_id);


--
-- Name: points_ledger points_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_pkey PRIMARY KEY (id);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: safety_scores safety_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_scores
    ADD CONSTRAINT safety_scores_pkey PRIMARY KEY (id);


--
-- Name: skill_gaps skill_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_pkey PRIMARY KEY (id);


--
-- Name: streaks streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streaks
    ADD CONSTRAINT streaks_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sync_conflicts sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: sync_sessions sync_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_sessions
    ADD CONSTRAINT sync_sessions_pkey PRIMARY KEY (id);


--
-- Name: topic_mastery topic_mastery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_mastery
    ADD CONSTRAINT topic_mastery_pkey PRIMARY KEY (id);


--
-- Name: tutor_analytics tutor_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_analytics
    ADD CONSTRAINT tutor_analytics_pkey PRIMARY KEY (id);


--
-- Name: tutor_evaluations tutor_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_evaluations
    ADD CONSTRAINT tutor_evaluations_pkey PRIMARY KEY (id);


--
-- Name: tutor_interactions tutor_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_interactions
    ADD CONSTRAINT tutor_interactions_pkey PRIMARY KEY (id);


--
-- Name: tutor_memories tutor_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_memories
    ADD CONSTRAINT tutor_memories_pkey PRIMARY KEY (id);


--
-- Name: tutoring_sessions tutoring_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_pkey PRIMARY KEY (id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ventures ventures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventures
    ADD CONSTRAINT ventures_pkey PRIMARY KEY (id);


--
-- Name: weekly_plans weekly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_pkey PRIMARY KEY (id);


--
-- Name: achievements_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX achievements_user_id_idx ON public.achievements USING btree (user_id);


--
-- Name: activities_user_id_start_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_user_id_start_time_idx ON public.activities USING btree (user_id, start_time);


--
-- Name: analytics_events_event_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_event_created_at_idx ON public.analytics_events USING btree (event, created_at);


--
-- Name: analytics_events_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_user_id_created_at_idx ON public.analytics_events USING btree (user_id, created_at);


--
-- Name: audit_logs_action_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_created_at_idx ON public.audit_logs USING btree (action, created_at);


--
-- Name: audit_logs_actor_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_actor_id_created_at_idx ON public.audit_logs USING btree (actor_id, created_at);


--
-- Name: billing_plans_stripe_price_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX billing_plans_stripe_price_id_key ON public.billing_plans USING btree (stripe_price_id);


--
-- Name: biometric_logs_user_id_logged_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX biometric_logs_user_id_logged_at_idx ON public.biometric_logs USING btree (user_id, logged_at);


--
-- Name: doter_profiles_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX doter_profiles_user_id_key ON public.doter_profiles USING btree (user_id);


--
-- Name: doter_rewards_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX doter_rewards_user_id_idx ON public.doter_rewards USING btree (user_id);


--
-- Name: escrows_seller_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX escrows_seller_id_idx ON public.escrows USING btree (seller_id);


--
-- Name: evidence_items_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX evidence_items_user_id_idx ON public.evidence_items USING btree (user_id);


--
-- Name: family_links_parent_id_child_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX family_links_parent_id_child_id_key ON public.family_links USING btree (parent_id, child_id);


--
-- Name: goals_user_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX goals_user_id_status_idx ON public.goals USING btree (user_id, status);


--
-- Name: idx_analytics_events_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_event ON public.analytics_events USING btree (event, created_at);


--
-- Name: idx_analytics_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_user ON public.analytics_events USING btree (user_id, created_at);


--
-- Name: invoices_stripe_invoice_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_stripe_invoice_id_key ON public.invoices USING btree (stripe_invoice_id);


--
-- Name: invoices_subscription_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_subscription_id_idx ON public.invoices USING btree (subscription_id);


--
-- Name: invoices_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_user_id_idx ON public.invoices USING btree (user_id);


--
-- Name: lms_assignments_connection_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lms_assignments_connection_id_idx ON public.lms_assignments USING btree (connection_id);


--
-- Name: lms_connections_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lms_connections_user_id_idx ON public.lms_connections USING btree (user_id);


--
-- Name: messages_receiver_id_sender_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_receiver_id_sender_id_created_at_idx ON public.messages USING btree (receiver_id, sender_id, created_at);


--
-- Name: messages_sender_id_receiver_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_id_receiver_id_created_at_idx ON public.messages USING btree (sender_id, receiver_id, created_at);


--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at);


--
-- Name: points_ledger_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX points_ledger_user_id_created_at_idx ON public.points_ledger USING btree (user_id, created_at);


--
-- Name: quests_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quests_user_id_created_at_idx ON public.quests USING btree (user_id, created_at);


--
-- Name: quests_user_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quests_user_id_status_idx ON public.quests USING btree (user_id, status);


--
-- Name: safety_scores_user_id_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX safety_scores_user_id_recorded_at_idx ON public.safety_scores USING btree (user_id, recorded_at);


--
-- Name: skill_gaps_user_id_subject_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX skill_gaps_user_id_subject_key ON public.skill_gaps USING btree (user_id, subject);


--
-- Name: streaks_user_id_pillar_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX streaks_user_id_pillar_key ON public.streaks USING btree (user_id, pillar);


--
-- Name: subscriptions_stripe_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_stripe_customer_id_idx ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: subscriptions_stripe_subscription_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);


--
-- Name: sync_conflicts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sync_conflicts_user_id_idx ON public.sync_conflicts USING btree (user_id);


--
-- Name: sync_sessions_user_id_device_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sync_sessions_user_id_device_id_key ON public.sync_sessions USING btree (user_id, device_id);


--
-- Name: topic_mastery_user_id_subject_topic_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX topic_mastery_user_id_subject_topic_key ON public.topic_mastery USING btree (user_id, subject, topic);


--
-- Name: tutor_analytics_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_analytics_user_id_idx ON public.tutor_analytics USING btree (user_id);


--
-- Name: tutor_analytics_user_id_snapshot_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_analytics_user_id_snapshot_date_idx ON public.tutor_analytics USING btree (user_id, snapshot_date);


--
-- Name: tutor_evaluations_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_evaluations_session_id_idx ON public.tutor_evaluations USING btree (session_id);


--
-- Name: tutor_evaluations_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_evaluations_user_id_idx ON public.tutor_evaluations USING btree (user_id);


--
-- Name: tutor_interactions_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_interactions_session_id_idx ON public.tutor_interactions USING btree (session_id);


--
-- Name: tutor_interactions_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_interactions_user_id_created_at_idx ON public.tutor_interactions USING btree (user_id, created_at);


--
-- Name: tutor_memories_user_id_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_memories_user_id_key_idx ON public.tutor_memories USING btree (user_id, key);


--
-- Name: tutor_memories_user_id_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutor_memories_user_id_type_idx ON public.tutor_memories USING btree (user_id, type);


--
-- Name: tutoring_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tutoring_sessions_user_id_idx ON public.tutoring_sessions USING btree (user_id);


--
-- Name: usage_records_user_id_metric_recorded_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_records_user_id_metric_recorded_at_idx ON public.usage_records USING btree (user_id, metric, recorded_at);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_firebase_uid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_firebase_uid_key ON public.users USING btree (firebase_uid);


--
-- Name: ventures_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ventures_user_id_idx ON public.ventures USING btree (user_id);


--
-- Name: weekly_plans_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX weekly_plans_user_id_idx ON public.weekly_plans USING btree (user_id);


--
-- Name: audit_logs audit_logs_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_logs_immutable BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();


--
-- Name: achievements achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: biometric_logs biometric_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_logs
    ADD CONSTRAINT biometric_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: doter_profiles doter_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doter_profiles
    ADD CONSTRAINT doter_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: doter_rewards doter_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doter_rewards
    ADD CONSTRAINT doter_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: escrows escrows_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: escrows escrows_venture_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_venture_id_fkey FOREIGN KEY (venture_id) REFERENCES public.ventures(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: evidence_items evidence_items_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: evidence_items evidence_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_items
    ADD CONSTRAINT evidence_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: family_links family_links_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: family_links family_links_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_links
    ADD CONSTRAINT family_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lms_assignments lms_assignments_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.lms_connections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lms_connections lms_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_connections
    ADD CONSTRAINT lms_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: onboarding_status onboarding_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_status
    ADD CONSTRAINT onboarding_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points_ledger points_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quests quests_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quests quests_parent_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_parent_quest_id_fkey FOREIGN KEY (parent_quest_id) REFERENCES public.quests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quests quests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: safety_scores safety_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_scores
    ADD CONSTRAINT safety_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: skill_gaps skill_gaps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_gaps
    ADD CONSTRAINT skill_gaps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: streaks streaks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streaks
    ADD CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_conflicts sync_conflicts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_sessions sync_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_sessions
    ADD CONSTRAINT sync_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_mastery topic_mastery_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_mastery
    ADD CONSTRAINT topic_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tutor_analytics tutor_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_analytics
    ADD CONSTRAINT tutor_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tutor_evaluations tutor_evaluations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_evaluations
    ADD CONSTRAINT tutor_evaluations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tutor_interactions tutor_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_interactions
    ADD CONSTRAINT tutor_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tutor_memories tutor_memories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_memories
    ADD CONSTRAINT tutor_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tutoring_sessions tutoring_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usage_records usage_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ventures ventures_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventures
    ADD CONSTRAINT ventures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: weekly_plans weekly_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict poQNiw7BJUH2lpCab7zi3pOBwdvlW6cTeWoClEYIWjls6LT3tzHLT493I1VwRQr


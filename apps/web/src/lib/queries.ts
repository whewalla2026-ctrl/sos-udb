import { gql } from '@apollo/client';

export var GET_ME = gql`
  query GetMe {
    me {
      id
      displayName
      email
      role
      avatarUrl
      doterProfile {
        id
        name
        state
        level
        xp
        coinBalance
        streakDays
        isEnergetic
        isSluggy
      }
    }
  }
`;

export var GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    dashboardData
    myDoter
    myGoals
    mySkillGaps
    mySafetyScore
    myWeeklyPlan
    unreadNotifications
  }
`;

export var GET_MY_DOTER = gql`
  query GetMyDoter {
    myDoter
  }
`;

export var GET_MY_GOALS = gql`
  query GetMyGoals {
    myGoals
  }
`;

export var GET_UNREAD_NOTIFICATIONS = gql`
  query GetUnreadNotifications {
    unreadNotifications
  }
`;

export var GET_MY_CHILDREN = gql`
  query GetMyChildren {
    myChildren {
      id
      displayName
      avatarUrl
      role
    }
  }
`;

export var GET_MY_FAMILY = gql`
  query GetMyFamily {
    myFamily
  }
`;

export var GET_LEDGER = gql`
  query GetLedger($page: Int, $pageSize: Int) {
    myLedger(page: $page, pageSize: $pageSize) {
      entries {
        id
        amount
        balanceAfter
        description
        source
        status
        transactionType
        createdAt
      }
      total
      page
      pageSize
    }
  }
`;

export var GET_BALANCE = gql`
  query GetBalance {
    myBalance
  }
`;

export var GET_EVIDENCE_GALLERY = gql`
  query GetEvidenceGallery {
    evidenceGallery
  }
`;

export var GET_MY_WEEKLY_PLAN = gql`
  query GetMyWeeklyPlan {
    myWeeklyPlan
  }
`;

export var GET_BIOMETRIC_HISTORY = gql`
  query GetBiometricHistory($days: Float) {
    biometricHistory(days: $days)
  }
`;

export var GET_SKILL_GAPS = gql`
  query GetSkillGaps {
    mySkillGaps
  }
`;

export var GET_MY_VENTURES = gql`
  query GetMyVentures {
    myVentures
  }
`;

export var GET_TUTORING_SESSION = gql`
  query GetTutoringSession {
    coachingInsight
  }
`;

export var GET_MY_SAFETY_SCORE = gql`
  query GetMySafetyScore {
    mySafetyScore
  }
`;

export var GET_AUDIT_LOG = gql`
  query GetAuditLog($limit: Int) {
    auditLog(limit: $limit)
  }
`;

export var GENERATE_WEEKLY_PLAN = gql`
  mutation GenerateWeeklyPlan {
    generateWeeklyPlan
  }
`;

export var ASK_TUTOR = gql`
  mutation AskTutor($input: String!, $sessionId: String!, $subject: String!) {
    askTutor(input: $input, sessionId: $sessionId, subject: $subject) {
      response
      intent
    }
  }
`;

export var CREATE_GOAL = gql`
  mutation CreateGoal($pillar: String!, $title: String!) {
    createGoal(pillar: $pillar, title: $title)
  }
`;

export var ADD_EVIDENCE = gql`
  mutation AddEvidence($title: String!, $type: String!, $url: String!, $questId: String) {
    addEvidence(questId: $questId, title: $title, type: $type, url: $url)
  }
`;

export var LOG_BIOMETRIC = gql`
  mutation LogBiometric($data: String!) {
    logBiometric(data: $data)
  }
`;

export var MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id)
  }
`;

export var MARK_ALL_READ = gql`
  mutation MarkAllRead {
    markAllRead
  }
`;

export var ADD_DOTER_XP = gql`
  mutation AddDoterXP($xp: Int!) {
    addDoterXP(xp: $xp)
  }
`;

export var NAME_MY_DOTER = gql`
  mutation NameMyDoter($name: String!) {
    nameMyDoter(name: $name)
  }
`;

export var UPDATE_PROFILE = gql`
  mutation UpdateProfile($data: UpdateProfileInput!) {
    updateProfile(data: $data) {
      id
      displayName
      avatarUrl
    }
  }
`;

export var SEND_MESSAGE = gql`
  mutation SendMessage($receiverId: String!, $content: String!) {
    sendMessage(receiverId: $receiverId, content: $content)
  }
`;

export var CREATE_VENTURE = gql`
  mutation CreateVenture($name: String!, $problem: String!, $solution: String!, $targetMarket: String!, $pricingModel: String!) {
    createVenture(name: $name, problem: $problem, solution: $solution, targetMarket: $targetMarket, pricingModel: $pricingModel)
  }
`;

export var RELEASE_FUNDS = gql`
  mutation ReleaseFunds($escrowId: String!) {
    releaseFunds(escrowId: $escrowId)
  }
`;

export var CREATE_ACTIVITY = gql`
  mutation CreateActivity($title: String!, $startTime: String!, $endTime: String!, $pillar: String) {
    createActivity(title: $title, startTime: $startTime, endTime: $endTime, pillar: $pillar)
  }
`;

export var LINK_CHILD = gql`
  mutation LinkChild($childId: String!, $consentMethod: String!) {
    linkChild(childId: $childId, consentMethod: $consentMethod)
  }
`;

export var UPDATE_SKILL_GAP = gql`
  mutation UpdateSkillGap($subject: String!, $gapScore: Float!) {
    updateSkillGap(subject: $subject, gapScore: $gapScore)
  }
`;

export var FUTURE_SELF_NARRATIVE = gql`
  query FutureSelfNarrative {
    futureSelfNarrative
  }
`;

export var INBOX = gql`
  query Inbox {
    inbox
  }
`;

export var CONVERSATION = gql`
  query Conversation($withUserId: String!) {
    conversation(withUserId: $withUserId)
  }
`;

export var GET_ONBOARDING_STATUS = gql`
  query GetOnboardingStatus {
    onboardingStatus {
      id
      currentStep
      totalSteps
      completed
      skipped
      profileComplete
      doterNamed
      firstQuestDone
      tourCompleted
      role
    }
  }
`;

export var GET_ONBOARDING_STATS = gql`
  query GetOnboardingStats {
    onboardingStats {
      total
      completed
      completionRate
      avgSteps
    }
  }
`;

export var UPDATE_ONBOARDING_STEP = gql`
  mutation UpdateOnboardingStep($step: Int!) {
    updateOnboardingStep(step: $step) {
      currentStep
      completed
    }
  }
`;

export var COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding {
    completeOnboarding {
      completed
    }
  }
`;

export var SKIP_ONBOARDING = gql`
  mutation SkipOnboarding {
    skipOnboarding {
      skipped
    }
  }
`;

export var MARKETPLACE_ITEMS = gql`
  query MarketplaceItems {
    marketplaceItems {
      id
      name
      description
      cost
      category
      icon
    }
  }
`;

export var GET_ANALYTICS_OVERVIEW = gql`
  query GetAnalyticsOverview {
    analyticsOverview {
      dau
      wau
      mau
      totalUsers
      signupsToday
      onboardingCompletionRate
      churnRate
    }
  }
`;

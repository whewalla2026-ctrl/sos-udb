# System Architecture — Phase 1-2 MVP

## Module Diagram

```
AppModule
├── UUPModule              # Unified User Profile (relational state)
├── PlanningModule         # Weekly Planner (deterministic templates)
├── AiLiteModule           # AI-lite hints (template-based, cost-controlled)
│   └── CostGuardService   # $0.50/user/month budget enforcement
├── MonitoringModule       # Health, metrics, alerts, early warning signals
├── AuthModule             # JWT auth, scrypt passwords, refresh tokens
│   ├── JwtModule          # Token signing/verification
│   └── ConsentService     # Parental consent flow
├── AuditModule            # Audit logging
├── LmsModule              # Canvas LMS adapter (scaffold)
├── VectorStoreLocalModule # Local vector store fallback
├── GraphQLAppModule       # GraphQL endpoint
└── WaitlistModule         # Waitlist signup + referral codes

Cross-cutting:
├── ConfigModule           # Environment configuration
├── ThrottlerModule        # Rate limiting (60 req/min global)
└── ValidationPipe         # Request validation (whitelist, transform)
```

## Security Layer

- Helmet (security headers)
- CORS (restricted origins)
- JWT (signed tokens, 7d access / 30d refresh)
- Scrypt (password hashing with random salt, timing-safe comparison)
- Rate limiting (5 req/min register, 60 req/min global)
- ValidationPipe (whitelist, forbidNonWhitelisted, transform)

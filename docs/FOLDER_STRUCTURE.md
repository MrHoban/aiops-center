# AIOps Center — Folder Structure

```
aiops-center/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD pipeline
├── docs/
│   ├── ARCHITECTURE.md            # System architecture & diagrams
│   ├── API.md                     # REST API documentation
│   └── DEPLOYMENT.md              # Deployment guide
├── prisma/
│   ├── migrations/                # Database migrations
│   ├── schema.prisma              # Full Prisma schema (20+ models)
│   └── seed.ts                    # Demo data seeder
├── src/
│   ├── __tests__/
│   │   └── unit/                  # Vitest unit tests
│   ├── app/
│   │   ├── (pages)/
│   │   │   ├── dashboard/         # Operations dashboard
│   │   │   ├── assets/            # Asset management
│   │   │   ├── alerts/            # Alert management
│   │   │   ├── automations/       # Automation center
│   │   │   ├── knowledge/         # Knowledge base
│   │   │   ├── cloud/             # Cloud management
│   │   │   ├── reports/           # Reporting
│   │   │   ├── ai/                # AI assistant
│   │   │   ├── settings/          # Settings & MFA
│   │   │   ├── login/             # Auth pages
│   │   │   └── register/
│   │   ├── api/
│   │   │   ├── auth/              # Auth.js + registration
│   │   │   ├── dashboard/         # Dashboard metrics API
│   │   │   ├── assets/            # Asset CRUD
│   │   │   ├── alerts/            # Alert engine API
│   │   │   ├── automations/       # Automation execution
│   │   │   ├── knowledge/         # Knowledge base + RAG
│   │   │   ├── cloud/             # Cloud resource sync
│   │   │   ├── reports/           # Report generation
│   │   │   └── ai/                # AI chat endpoint
│   │   ├── globals.css            # Tailwind + theme tokens
│   │   ├── layout.tsx             # Root layout + providers
│   │   └── page.tsx               # Redirect to dashboard
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/                # App shell, sidebar
│   │   ├── dashboard/             # Dashboard widgets & charts
│   │   ├── assets/                  # Asset views
│   │   ├── alerts/                # Alert views
│   │   ├── automations/           # Automation views
│   │   ├── knowledge/             # Knowledge views
│   │   ├── cloud/                 # Cloud views
│   │   ├── reports/               # Report views
│   │   ├── ai/                    # AI chat interface
│   │   ├── auth/                  # Login/register forms
│   │   └── providers.tsx          # Theme, Query, Session providers
│   ├── hooks/
│   │   └── use-mobile.ts          # Responsive hook
│   ├── lib/
│   │   ├── ai/
│   │   │   └── openai.ts          # OpenAI + RAG pipeline
│   │   ├── api-auth.ts            # Session + permission helpers
│   │   ├── audit.ts               # Audit logging
│   │   ├── crypto.ts              # Encryption + password hashing
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── rate-limit.ts          # API rate limiting
│   │   ├── rbac.ts                # Role-based access control
│   │   ├── utils.ts               # cn() utility
│   │   └── validations.ts         # Zod schemas
│   ├── auth.ts                    # Auth.js configuration
│   └── middleware.ts              # Auth + route protection
├── docker-compose.yml             # Local dev stack
├── Dockerfile                     # Production container
├── .env.example                   # Environment template
├── vitest.config.ts               # Test configuration
├── next.config.ts                 # Next.js config (standalone)
├── components.json                # shadcn/ui config
├── package.json
└── tsconfig.json
```

## Key Conventions

- **Feature pages** live under `src/app/{feature}/page.tsx`
- **API routes** mirror feature names under `src/app/api/`
- **View components** are colocated in `src/components/{feature}/`
- **Business logic** belongs in `src/lib/` — never in components
- **All tenant queries** filter by `organizationId` from session

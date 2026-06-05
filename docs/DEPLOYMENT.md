# AIOps Center — Deployment Guide

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ with [pgvector](https://github.com/pgvector/pgvector)
- OpenAI API key (for AI features)
- Vercel account (production)

## Local Development

### 1. Clone and install

```bash
cd aiops-center
cp .env.example .env
npm install
```

### 2. Start PostgreSQL (Docker)

```bash
docker compose up db -d
```

### 3. Initialize database

```bash
npm run db:push
npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open http://localhost:3000 — sign in with `admin@demo.aiops.local` / `Admin123!`

## Docker (Full Stack)

```bash
docker compose up --build
```

## Vercel Production Deployment

### 1. Create Vercel Postgres (or Neon with pgvector)

Enable the `vector` extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Link project

```bash
npx vercel link
```

### 3. Set environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | Production URL (e.g. `https://aiops.example.com`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) |

### 4. Deploy

```bash
npx vercel --prod
```

Post-deploy, run migrations:

```bash
npx vercel env pull
npx prisma db push
npx prisma db seed
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR:

1. Lint
2. Unit tests
3. Prisma generate + db push
4. Production build

Connect Vercel GitHub integration for automatic preview and production deployments.

## Security Checklist

- [ ] Rotate `AUTH_SECRET` and `ENCRYPTION_KEY` for production
- [ ] Enable MFA for administrator accounts
- [ ] Configure Vercel WAF / rate limiting at edge
- [ ] Restrict database access to Vercel IP ranges
- [ ] Use restricted OpenAI API keys with usage limits
- [ ] Enable audit log retention policy

## Monitoring

- Vercel Analytics for web vitals
- Datadog / Application Insights integration via OpenTelemetry (optional)
- Audit logs table for compliance reporting

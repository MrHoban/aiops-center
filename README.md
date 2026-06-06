# AIOps Center

A production-oriented, multi-tenant operations platform for IT teams and MSPs. AIOps Center unifies infrastructure monitoring, alert management, automation workflows, knowledge management, and AI-assisted troubleshooting in a single modern web application.

## Key Features

- **Operations Dashboard** — Metrics across alerts, asset health, cloud status, and automation activity
- **Asset Management** — Servers, workstations, network devices, and VMs with health scoring
- **Alert Engine** — Ingestion, correlation, suppression, and escalation with audit history
- **Automation Center** — Versioned scripts with parameterized execution
- **Knowledge Base** — Runbooks and SOPs with vector search for AI context retrieval
- **Cloud Visibility** — Azure, AWS, and GCP resource inventory
- **AI Assistant** — RAG-powered chat grounded in organizational knowledge
- **Security** — RBAC, session auth, rate limiting, encryption, and audit logging

## Tech Stack

Next.js 16 · React 19 · TypeScript · PostgreSQL + pgvector · Prisma · Auth.js · OpenAI · Docker · GitHub Actions · Vitest

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/aiops-center.git
cd aiops-center
npm install
docker compose up db -d
npm run db:push && npm run db:seed
npm run dev


Open http://localhost:3000 — see docs/DEPLOYMENT.md for demo credentials and deployment.


Built by Joshua Hoban — aspiring Software Engineer & DevOps Engineer.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

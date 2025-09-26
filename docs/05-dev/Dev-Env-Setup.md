---
owner: platform-engineering
last_review: 2025-09-25
status: draft
tags: ["dev", "setup", "tooling"]
references:
  - "Coding-Standards.md"
  - "../03-apis/API-Specification.md"
  - "../04-data/Database-Design.md"
  - "../07-ops/Deployment-Infrastructure.md"
---

# Developer Environment Setup

## 1. Prerequisites
- Node.js 20.x (use `nvm` or Volta).
- pnpm 9.x.
- Python 3.12 + uv/poetry for AI services.
- Docker Desktop (for Postgres, Redis, services).
- Tilt or Docker Compose for local orchestration.
- GCloud CLI (for staging/prod access), jq, mkcert.

## 2. Repository Bootstrap
```bash
pnpm install
pnpm run bootstrap
```
This installs workspace dependencies, builds shared packages, and generates TypeScript types.

## 3. Environment Variables
Copy `.env.example` to `.env.local` at repo root. Required variables:
- `DATABASE_URL` (`postgres://.../myproperty_dev`)
- `REDIS_URL`
- `STRIPE_SECRET_KEY`
- `ORIGINFD_API_URL`, `ORIGINFD_API_KEY`
- `JWT_SECRET`
- `OPENAI_API_KEY` (or configured provider)
- `POSTMARK_API_KEY` (email)

Use `direnv` or `doppler` for secret management; never commit `.env` files.

## 4. Local Services
Use Docker Compose (`scripts/dev/docker-compose.yml`, TBD) to start dependencies:
```bash
docker compose up postgres redis mailhog stripe
```
- Postgres runs with `myproperty_dev` schema + seed data from `scripts/seed`.
- Redis handles caching/session store.
- Mailhog captures outbound emails.
- Stripe CLI runs in test mode for webhooks.

## 5. Running Applications
| Component | Command | Notes |
| --- | --- | --- |
| Web app | `pnpm --filter web dev` | Next.js with Vite preview |
| Admin app | `pnpm --filter admin dev` | Backoffice UI |
| API gateway | `pnpm --filter gateway-node dev` | Runs tRPC/REST server |
| AI orchestrator | `uv run services/ai-python/app.py` | FastAPI with auto-reload |
| Background workers | `pnpm --filter workers/* dev` | Start per worker |
| Docs site | `pnpm --filter docs-site dev` | Docusaurus/Next.js |

## 6. Testing & Linting
```bash
pnpm test --filter web
pnpm lint
pnpm typecheck
pnpm --filter services/ai-python test
```
Run `pnpm run validate` before every PR (aggregates lint, test, typecheck).

## 7. Database Migrations
- Use Prisma or Alembic (decision tracked in ADR). Migrations stored under `packages/db/migrations`.
- Apply migrations locally: `pnpm db:migrate` (Node) or `uv run alembic upgrade head` (Python).
- Generate seed data with `pnpm seed` (executed from `scripts/seed`).

## 8. Tooling Integrations
- VSCode recommended extensions: ESLint, Prettier, Python, Prisma, GitLens, Markdown All-In-One.
- Pre-commit hooks via `pnpm prepare` (husky/lefthook) enforce lint and format.
- Optional: Tiltfile to orchestrate services with live reload (under `infra/dev`).

## 9. Troubleshooting
- **Port conflicts:** Web (3000), Admin (3100), Gateway (4000), AI (5000), Postgres (5432), Redis (6379).
- **SSL issues:** Use `mkcert` to generate local certs (`scripts/dev/setup-cert.ps1`).
- **Stripe webhooks:** `stripe listen --forward-to localhost:4000/v1/webhooks/stripe`.
- **OpenTelemetry collector:** optional container under `infra/observability` for tracing tests.

Keep this guide updated as tooling evolves.

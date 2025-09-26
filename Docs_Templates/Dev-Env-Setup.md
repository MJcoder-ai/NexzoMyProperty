---
owner: platform-team
last_review: 2025-09-21
status: template
tags: ["dev-env", "monorepo", "ai-agents", "odl-sd", "multi-tenant"]
references:
  - "../01-architecture/System-Architecture.md"
  - "../02-requirements/TRD.md"
  - "../03-apis/API-Specification.md"
  - "../03-apis/openapi.yaml"
  - "../04-data/Database-Design.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../06-ml-ai/Model-Card.md"
  - "../06-ml-ai/Prompt-Library.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../07-ops/Observability-Runbook.md"
  - "../07-ops/SLOs.md"
  - "../08-security/Security-Guidelines.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
---

# Dev Environment Setup

**Purpose.** Establish a repeatable, AI-friendly development environment for a **multi-tenant, multi-user, multi‑domain, agentic platform** using a polyglot monorepo (TypeScript + Python), Postgres, Redis, Docker, and VS Code Dev Containers. The baseline mirrors the _Canonical Development Guide_ (monorepo layout, RLS Postgres + JSONB, Cloud Run targets) and the _Development Standards_ (pnpm/turbo conventions, Docker multi‑stage patterns). fileciteturn0file35 fileciteturn0file36

> **Outcome:** A new contributor (human or coding agent) can go from zero to a running web app, API, orchestrator, and workers in **< 30 minutes** with linting, tests, tracing, and hot reload enabled.

---

## 0) Support Matrix & Baseline

| Area | Standard | Notes |
|---|---|---|
| OS | macOS 13+/Windows 11/Ubuntu 22.04 | Dev Container recommended for parity |
| Runtime – Node | **Node 20.x** + **pnpm** workspaces + **turbo** | Aligns with monorepo and client generation flow. fileciteturn0file35 |
| Runtime – Python | **Python 3.12** (uv or Poetry) | Services: FastAPI API, Orchestrator/Workers. fileciteturn0file35 |
| Datastores | **Postgres 15+**, **Redis 7+** | Postgres with **row‑level multi‑tenancy** + JSONB; Redis for cache/CAG/queues. fileciteturn0file35 fileciteturn0file28 |
| Containers | Docker Desktop / Colima | Multi‑stage builds, non‑root users by default. fileciteturn0file36 |
| Cloud (target) | **GCP Cloud Run + Cloud SQL + Memorystore** | IaC modules provided; local dev mirrors this shape. fileciteturn0file35 |

---

## 1) Quick Start (Recommended): VS Code Dev Container

1. **Install prerequisites:** Docker Desktop (or Colima), VS Code + _Dev Containers_ extension, Git.
2. **Clone repo & open in container:** _File → Open Folder in Container_ → the base image boots with Node 20, pnpm, Python 3.12, uv/poetry, and common CLIs installed (jq, curl). The container also exposes Postgres/Redis via `docker compose`. fileciteturn0file35
3. **Bootstrap workspace:**

```bash
# JS/TS (root of repo)
pnpm install
pnpm turbo run build --filter=!@examples/*

# Python
uv sync || poetry install
```

4. **Start databases:**

```bash
docker compose -f docker-compose.dev.yml up -d postgres redis
```

5. **Run everything (in separate terminals):**

```bash
# API (FastAPI on :8000) + OpenAPI docs
uv run uvicorn services.api.main:app --reload --port 8000

# Orchestrator (Planner/Router/Tools) on :8010
uv run python services/orchestrator/main.py

# Web (Next.js on :3000)
pnpm --filter=@apps/web dev
```

The layout, service boundaries, and target cloud topology follow the canonical monorepo tree and service split. fileciteturn0file35

---

## 2) Manual Host Setup (if not using Dev Container)

### 2.1 Install core tooling

- **Node 20 + pnpm + turbo** (monorepo). fileciteturn0file35  
- **Python 3.12** (uv preferred for speed; Poetry supported). fileciteturn0file35  
- **Docker** (multi‑stage builds, non‑root runtime). fileciteturn0file36  
- **Postgres 15/Redis 7** (or via Docker). fileciteturn0file35

### 2.2 Bootstrap the repo

```bash
git clone <your-repo-url>.git originfd && cd originfd
pnpm install
uv sync || poetry install
```

> **Tip:** keep Node/Python versions pinned via `.tool-versions` or `.nvmrc`/`.python-version` to reduce drift across contributors and CI. fileciteturn0file36

---

## 3) Environment Variables & Secrets

Create **`.env`** files at the root (shared) and per service (`services/api/.env`, `services/orchestrator/.env`, `apps/web/.env.local`). Example:

```dotenv
# Shared
POSTGRES_DSN=postgresql+psycopg://dev:dev@localhost:5432/originfd
REDIS_URL=redis://localhost:6379/0
ENV=dev
LOG_LEVEL=INFO
OTEL_EXPORTER=console

# API (FastAPI)
JWT_ISSUER=https://auth.local
JWT_AUDIENCE=originfd
CORS_ALLOW_ORIGINS=http://localhost:3000
TENANCY_MODE=row_level

# Orchestrator (L1 Planner/Router)
OPENAI_API_KEY=sk-...
PRIMARY_MODEL=gpt-4o-mini
FALLBACK_MODEL=gpt-3.5-turbo
POLICY_PSU_BUDGET_PER_REQUEST=5

# Web (Next.js)
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

**Notes.**  
- The orchestrator supports **model selection + fallback** and **structured I/O validation**; keep model IDs and policies out of code and in env/config. fileciteturn0file25  
- Postgres is configured for **row‑level multi‑tenancy**; API enforces RBAC/phase gates and JSON‑Patch writes against the ODL‑SD document. fileciteturn0file35 fileciteturn0file31 fileciteturn0file33

---

## 4) Databases, Migrations, and Seed Data

```bash
# Start infra
docker compose -f docker-compose.dev.yml up -d postgres redis

# Create DB & run migrations
alembic upgrade head  # from services/api

# Load golden samples for local work
python scripts/seed_golden.py  # seeds ODL‑SD sample docs
```

- The ODL‑SD document is the **single source of truth**; mutations must be applied via **JSON‑Patch** and validated by schema. fileciteturn0file33  
- Redis backs CAG (cache‑ahead‑of‑generation) and rate limits; use it for prompt/embedding/tool‑output caches. fileciteturn0file28

---

## 5) Run Services Locally

### API (FastAPI)

```bash
cd services/api
uv run uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/docs for OpenAPI
```

### Orchestrator (Planner/Router/Tools)

```bash
cd services/orchestrator
uv run python main.py  # starts plan→act loop, tool registry, policy router
```

### Web (Next.js 14)

```bash
cd apps/web
pnpm dev  # http://localhost:3000
```

The split mirrors the production architecture (gateway/API, orchestrator, workers), ensuring local dev matches deployment. fileciteturn0file35

---

## 6) Code Generation & Contracts

- **OpenAPI client (TS):** keep client in sync with the backend.  
  ```bash
  pnpm generate:api-client   # runs on API changes in CI/CD too
  ```
  This eliminates client drift between backend and frontend. fileciteturn0file27

- **Types from JSON Schemas:** generate TS types for ODL‑SD and tool I/O to avoid mismatches. fileciteturn0file33  
- **Version everything (SemVer):** APIs, models, prompts, and tools follow the central **Versioning Policy**; breaking changes require a major bump and deprecation windows. fileciteturn0file22

---

## 7) Linting, Testing, and Pre‑commit

```bash
# TypeScript
pnpm type-check && pnpm lint && pnpm test

# Python
uv run ruff check . && uv run pytest -q
```

- Enforce **single source of truth** for types (import from `@originfd/types-odl`); never duplicate enums or status strings. fileciteturn0file36  
- Include **contract tests** and **schema validation** for API endpoints; monitor latency, error rate, and availability as per API governance. fileciteturn0file23

---

## 8) Docker for Local Dev & CI

**Multi‑stage pattern (critical for pnpm workspaces):**

```dockerfile
# deps
FROM node:20-slim AS deps
WORKDIR /app
COPY turbo.json package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN corepack enable && pnpm install --frozen-lockfile

# build
FROM deps AS build
RUN pnpm turbo run build

# runtime (non-root)
FROM node:20-slim AS runtime
RUN useradd -m -u 1000 appuser && mkdir -p /home/appuser/app
WORKDIR /home/appuser/app
COPY --from=deps /app/ ./
COPY --from=build /app/apps/web/.next ./apps/web/.next
USER appuser
CMD ["node", "apps/web/server.js"]
```

- **Do not** copy only `node_modules`; copy the **entire workspace** from the deps stage to preserve pnpm symlinks. fileciteturn0file36  
- Include `turbo.json` in the deps stage; missing it breaks Turbo builds. fileciteturn0file36  
- Use non‑root users in containers and keep images lean. fileciteturn0file36

---

## 9) Troubleshooting (Fast Paths)

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ERR_PNPM_OUTDATED_LOCKFILE` | Lockfile not updated after package changes | Regenerate and commit lockfile (CI uses frozen mode). fileciteturn0file36 |
| `Could not find turbo.json` | Not copied in deps stage | `COPY turbo.json ...` in Docker deps stage. fileciteturn0file36 |
| `Cannot find module 'react'` in Docker | pnpm workspace symlinks lost | `COPY --from=deps /app/ ./` from deps stage. fileciteturn0file36 |
| TS enum/status mismatch at runtime | Duplicate/partial type definitions | Import from authoritative `@originfd/types-odl`; remove duplicates. fileciteturn0file36 |
| API client drift | Frontend client not regenerated | Run `generate:api-client` or let CI regenerate on API change. fileciteturn0file27 |

---

## 10) AI‑Agent Essentials for Local Work

- **Intelligence layer** wraps model/provider selection, retries with exponential backoff, and **schema‑validated outputs**, with automatic **fallback** to secondary models. Keep these configurable in env. fileciteturn0file25  
- **Memory & CAG**: use Redis for active session memory and cache‑ahead‑of‑generation (prompts, embeddings, tool outputs) with **token‑aware summarization** for long chats. fileciteturn0file25 fileciteturn0file28  
- **Tool registry** exposes deterministic, versioned tools with Pydantic schemas; the orchestrator runs a plan→act loop with a Policy Router for budgets and regional routing. fileciteturn0file28

---

## 11) Security & RBAC (Local Testing)

- Enable role‑based scopes and **phase gates**; exercise `eng_editor`, `ops_editor`, `approver_full`, and guest flows. Use QR join for session tests where applicable. fileciteturn0file31  
- Run threat‑model‑informed tests: spoofing, tampering, repudiation, disclosure, DoS, EoP; include **model extraction** and **prompt injection** checks for AI surfaces. fileciteturn0file24

---

## 12) Observability

- Export traces/metrics (p50/p99 latency, error rate, availability, token usage) and propagate `X‑Request‑ID`/`X‑Correlation‑ID`. Add model IDs to spans for ML endpoints. fileciteturn0file23  
- Local dashboards can be shipped via docker compose; in CI, assert SLOs with synthetic checks. fileciteturn0file23

---

## 13) Governance Hooks

- Follow **API Governance** for auth, rate limits, CORS/CSP; run spectral rules on OpenAPI. fileciteturn0file23  
- Apply the **Versioning Policy** across APIs/models/prompts and use deprecation headers for older API versions during migrations. fileciteturn0file22

---

## 14) Developer UX (Humans & Coding Agents)

- Keep **prompts** and **tool specs** versioned and documented; prefer typed, deterministic tools over free‑text. fileciteturn0file28  
- Follow the **voice & tone** guide for user‑facing copy in CLI and UI (errors, hints, success). fileciteturn0file40

---

## 15) Appendix – Useful Commands

```bash
# Start infra
docker compose -f docker-compose.dev.yml up -d postgres redis

# DB migration
cd services/api && alembic upgrade head

# Run API / Web / Orchestrator
uv run uvicorn services.api.main:app --reload --port 8000
pnpm --filter=@apps/web dev
uv run python services/orchestrator/main.py

# Generate client & types
pnpm generate:api-client

# Lint, type-check, test
pnpm type-check && pnpm lint && pnpm test
uv run ruff check . && uv run pytest -q
```

---

### References (internal)
For the full doc tree and cross‑links, see the **Documentation Index**. fileciteturn0file20

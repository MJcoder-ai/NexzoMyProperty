---
owner: engineering
last_review: 2025-09-21
status: approved
tags: ["coding-standards", "typescript", "python", "security", "ai-agents", "monorepo"]
references:
  - "../05-dev/Dev-Env-Setup.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
  - "../08-security/Security-Guidelines.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../06-ml-ai/Prompt-Library.md"
  - "../03-apis/API-Specification.md"
---

# Coding Standards

> **Purpose.** Establish practical, AI-friendly coding conventions so humans and coding agents ship reliable, secure, and maintainable multi-tenant, multi-user, multi-domain platforms with minimal rework.

These standards are **contract-first** and align with our API governance, versioning, security, and AI orchestration blueprints. Use this document alongside:
- **Dev Environment:** `../05-dev/Dev-Env-Setup.md`
- **API Governance:** `../09-governance/API-Governance.md`
- **Versioning Policy:** `../09-governance/Versioning-Policy.md`
- **Security Guidelines:** `../08-security/Security-Guidelines.md`
- **Eval Plan:** `../06-ml-ai/Eval-Plan.md`
- **Tool Specs:** `../06-ml-ai/Tool-Specs.md`
- **Prompt Library:** `../06-ml-ai/Prompt-Library.md`

---

## 1. Scope & Audience

Applies to all services (web, mobile, API, orchestrator, workers), languages (TypeScript/Node, Python 3.12), and infrastructure (Cloud Run, Postgres, Redis). Targets both **humans** and **AI coding agents**.

---

## 2. Monorepo & Project Structure (authoritative)

Follow the canonical layout and rules for **apps/**, **services/**, **domains/**, and **packages/**. Business logic lives in **domains/** or versioned **packages/**; web/mobile apps remain thin; API routers are the only place for HTTP handlers. Never write directly to ODL-SD docs—apply **JSON-Patch** via validated endpoints. See the Canonical Development Guide for folder boundaries, patch helpers, and RLS examples.

**Non-negotiables**
1. **Code placement**: UI in `apps/*`, HTTP only in `services/api/.../routers/*`, domain logic in `domains/*` or `packages/*`.
2. **Mutations**: Emit **RFC 6902 JSON-Patch** only; server validates, audits, and can roll back.
3. **RBAC/Phase gates**: Guard every mutation; block when life‑cycle gates lock sections.
4. **Schemas first**: Extend JSON Schemas + ADRs before writing code or tool I/O.
5. **No duplication**: Single Source of Truth for types; import shared packages, don’t redefine.

---

## 3. Language & Framework Standards

### 3.1 TypeScript + React (web/mobile)

- **Strict TS**: `"strict": true` and zero `any` in production components.
- **Single Source of Truth (SSOT) for types**: Import shared domain types (e.g., `@originfd/types-odl`) instead of duplicating. Never hard-code enums/unions in UI logic; rely on central managers for state machines.
- **Reserved identifiers**: Do **not** use JS reserved keywords (e.g., `eval`, `arguments`) as variables or params.
- **Optional chaining & fallbacks**: Access nested data defensively; provide defaults for optional fields.
- **Component hygiene**: Props typed, loading/error states explicit, and error boundaries in app shells.
- **Package.json for libraries**: Framework deps (React, etc.) in **peerDependencies** and **devDependencies** for isolated builds; keep runtime **dependencies** minimal.
- **Monorepo builds**: Ensure Turborepo config and workspace node_modules symlinks are preserved in Docker (see §7).

**Example (package.json for a shared TS lib)**
```jsonc
{
  "name": "@originfd/ui-cards",
  "version": "1.0.0",
  "dependencies": {},                        // runtime only
  "peerDependencies": {
    "react": "^18.2.0",
    "@types/react": "^18.2.0"
  },
  "devDependencies": {
    "react": "^18.2.0",
    "@types/react": "^18.2.45",
    "typescript": "^5.3.3"
  }
}
```

**UI Consistency**
- Follow **UI Guidelines** for grid layout, responsive behavior, chat timeline, and accessibility tokens. Reference components (PlanTimeline, split views, canvas) must match documented areas and behaviors.

### 3.2 Python (APIs, workers, tools)

- **Versions**: Python 3.12; FastAPI + Pydantic v2; SQLAlchemy 2; Celery/RQ for jobs.
- **Contracts**: Pydantic models for I/O; enable `model_validate` on inputs and **structured errors** on failure.
- **DB access**: Use session helpers; avoid N+1 with `joinedload/selectinload`. Enable RLS per-tenant.
- **Observability**: OpenTelemetry spans for external calls and tool invocations; log structured JSON with trace IDs.
- **Resilience**: Retries with exponential backoff; circuit breakers for flaky dependencies.
- **Security**: Non-root containers, secrets from env/SM, reject oversharing in error bodies.

**Example (structured error)**
```python
try:
    ...  # domain logic
except DomainError as e:
    logger.error("Operation failed", extra={"context": context})
    raise HTTPException(status_code=400, detail={"error": "operation_failed", "message": str(e)})
```

---

## 4. API & Schema Standards

- **Contract-first**: OpenAPI is the source of truth; generate typed clients for frontends/workers.
- **Validation**: All request/response validated (Zod on client, Pydantic on server).
- **Pagination** for collections, **rate limits** per route, and **cache headers** where appropriate.
- **Error model**: Consistent JSON error shape (`error`, `message`, `code`, `hint?`, `docs_url?`).  
- **Versioning**: Follow SemVer and deprecation timelines. New breaking change → new **major**; provide migration notes and sunset headers.
- **Governance**: Spectral rules lint OpenAPI in CI; failing checks block deploys.

---

## 5. Data & ODL-SD Contracts

- **ODL-SD document is SSOT**: Every change is a **JSON-Patch** with optimistic concurrency control (`doc_version`), evidence URIs, and audit trails.
- **Never mutate in place** in agents; produce patches that are applied by the orchestrator service.
- **Graph-first mindset**: Agents operate on the ODL graph projection; patches add/remove nodes and edges, never bypassing review where required.

---

## 6. Agentic AI Standards

- **Spec Card** registry for each agent: ID, version, capabilities, required/optional context, tool scopes, functions with input/output schemas, retries/timeouts, error codes.
- **Least privilege**: Tool access scopes enforced; credentials injected; rate limits per agent.
- **Context minimalism**: Pass only necessary fields to reduce cost/risk.
- **Observability**: Log tool calls, costs, token usage; emit events for **Plan Timeline** UI.
- **Resilience**: Retries + graceful degradation; circuit breakers; deterministic fallbacks.
- **Explainability**: Every patch accompanied by a human-friendly card (rationale, KPIs, actions).

---

## 7. Docker & CI/CD Hard Rules (monorepo-safe)

**Multi-stage builds (Node/TS)**
```dockerfile
# deps stage
COPY turbo.json package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN corepack enable && pnpm i --frozen-lockfile

# builder
COPY --from=deps /app/ ./
RUN pnpm -w build

# runtime
COPY --from=builder /app/apps/web/.next /srv/www
```

**Why these rules?**
- Preserve pnpm workspace symlinks by copying the **entire workspace** from deps stage.  
- Include **turbo.json** early so `pnpm turbo` can resolve pipelines.  
- Fail fast if lockfile is outdated; regenerate and commit in PR when deps change.

**Health checks & non-root**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3   CMD curl -f http://localhost:8000/health/ || exit 1

RUN useradd -m -u 1000 appuser
USER appuser
```

---

## 8. Performance & Reliability

- **DB**: No N+1; eager loading; sensible indices; connection pooling; timeouts.
- **Cache**: Redis-based response caching for hot reads with invalidation; per-user scoping when required.
- **Rate limits**: Sliding-window per-user and per-IP on public routes.
- **Pagination**: Always for list endpoints; server defaults + client overrides.
- **Metrics**: Track RPS, p95/p99 latency, error rates, cache hit ratio, DB timings.
- **Tests**: Performance regression tests in CI before release.

---

## 9. Security-by-Default

- **Input validation** at every boundary; reject unknown fields.  
- **Secrets** via Secret Manager; never hardcode or commit credentials.  
- **AuthN/Z**: Enforce scopes/roles on every route; test negative paths.  
- **Containers**: Non-root users; minimal base images; SBOM + vulnerability scans.  
- **Error responses**: Sanitized; no stack traces in production.  
- **Privacy**: PII minimization and redaction in logs; media redaction tools for photos.  
- **Supply chain**: Dependabot/updates; lockfiles in repo; signed images where available.

---

## 10. Testing & Quality Gates

**Pre-commit (local)**
```bash
pnpm -w type-check && pnpm -w lint && pnpm -w test
pytest -q
docker build -f apps/web/Dockerfile .
```

**CI/CD gates**
- Type checks, lint, unit tests (Node/Python)
- Contract tests (OpenAPI client ↔ server)
- Integration tests (DB/cache/queues)
- Security scans (SAST/containers)
- Performance smoke tests
- OpenAPI client generation
- Docs build + link check

**AI Evaluation**
- Offline: regression, red team, safety, cost/latency thresholds
- Online: A/B, shadow, guardrail monitors
- Automatic rollback on guardrail violation

---

## 11. Frontend Implementation Notes

- Follow documented **grid areas**, responsive breakpoints, and chat timeline behaviors.
- Apply consistent separators and accessibility tokens; avoid ad‑hoc styles.
- Use high-level **Plan Timeline** and **Context Panels** UX patterns to expose agent plans and diffs.
- Never duplicate UI types; import from generated or shared packages.

---

## 12. Code Review Checklist (PR template)

- [ ] Contract-first: Schema & types updated; breaking changes versioned
- [ ] Security: Input validation, auth, rate limits; secrets not exposed
- [ ] Reliability: Retries, timeouts, idempotency where needed
- [ ] Performance: No N+1; pagination; caching; metrics added
- [ ] Observability: Structured logs, traces, health endpoints
- [ ] Tests: Unit + integration; contract tests updated; coverage acceptable
- [ ] Docs: ADR updated if architectural; references & README sections added
- [ ] CI/CD: Docker build passes; lockfiles updated; Spectral/linters clean

---

## 13. Anti-Patterns (do not do)

- ❌ Duplicating type definitions across packages
- ❌ Hardcoding enum/union values in UI logic
- ❌ Using reserved identifiers like `eval` in code
- ❌ Bypassing JSON-Patch to mutate ODL docs directly
- ❌ Copying only `node_modules` between Docker stages
- ❌ Shipping containers as root or without health checks
- ❌ Returning unstructured or sensitive errors

---

## 14. Appendix: Snippets

**SQLAlchemy RLS session**
```python
engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def db_session(tenant_id: str):
    db = SessionLocal()
    db.execute("SET app.current_tenant = :tid", { "tid": tenant_id })
    try:
        yield db
    finally:
        db.close()
```

**Frontend JSON-Patch helper (BFF)**
```ts
export async function applyPatch(docId: string, version: number, patch: any[]) {
  const res = await fetch("/api/bridge/api/odl/patch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ doc_id: docId, doc_version: version, patch }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

**OpenAPI Spectral rule (SemVer enforcement)**
```yaml
rules:
  api-version-format:
    description: API version must be semantic
    given: $.info.version
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[0-9]+\.[0-9]+\.[0-9]+$"
```

---

**Document lifecycle**: Review quarterly; update on toolchain/language changes; enforce via CI quality gates.


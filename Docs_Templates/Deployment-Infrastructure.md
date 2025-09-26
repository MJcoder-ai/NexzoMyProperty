---
owner: platform-team
last_review: 2025-09-21
status: template
tags: ["deployment", "infrastructure", "gcp", "cloud-run", "multi-tenant", "ai-agents"]
references:
  - "../01-architecture/System-Architecture.md"
  - "../07-ops/Observability-Runbook.md"
  - "../07-ops/SLOs.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/Versioning-Policy.md"
  - "../09-governance/API-Governance.md"
---

# 07‑ops / Deployment‑Infrastructure

> **Purpose.** Practical, copy‑pasteable guide to deploy a **multi‑tenant, multi‑user, multi‑domain AI‑agent platform** safely and repeatably. Target stack is **GCP (Cloud Run + Cloud SQL + Redis + Pub/Sub + Secret Manager)** as per the canonical development guide. fileciteturn0file35

---

## 1) Executive Summary (what we deploy & why)

- **Compute:** Managed containers on **Cloud Run** (stateless web, orchestrator, workers) for fast rollouts and autoscaling. fileciteturn0file35  
- **Data plane:** **PostgreSQL (Cloud SQL)** with **row‑level multi‑tenancy** and JSONB for ODL‑SD documents; **Redis (MemoryStore)** for cache + rate limiting + CAG store; **Object storage** for media & exports; optional **Vector DB** per region. fileciteturn0file35 fileciteturn0file28  
- **AI plane:** L1 **Orchestrator** (Planner/Router/Policy Router/Scheduler), Tool Registry, episodic/semantic memory, **CAG** caching, and **Ground‑before‑Generate** via Graph‑RAG. fileciteturn0file28  
- **Security:** RBAC & phase gates, WAF/CDN, least‑privilege service accounts, secrets in KMS/Secret Manager, STRIDE‑aligned mitigations. fileciteturn0file31 fileciteturn0file24  
- **Governance:** SemVer across APIs/models/prompts; deprecation + rollout gates are enforced in CI/CD. fileciteturn0file22 fileciteturn0file23

---

## 2) Environments, Regions & Tenancy

### 2.1 Environments
- **dev** (ephemeral previews allowed), **staging** (prod‑like), **prod** (multi‑region active/active for HTTP; DB primary/replica). All artifacts & configs are environment‑scoped and versioned. fileciteturn0file35

### 2.2 Regional strategy
- **RegionRouter** directs traffic/data to US/EU/APAC for latency and data residency; vector stores & caches are regional. fileciteturn0file28

### 2.3 Tenancy model
- **Default:** **Row‑Level Security (RLS)** on Postgres with per‑tenant keys in JWT claims; object storage segregated by `tenant/{org_id}/…`. fileciteturn0file35  
- **Strict isolation (opt‑in):** Per‑tenant DB or schema and dedicated service account; used for highly regulated customers. (Aligns with RBAC/phase‑gates policy.) fileciteturn0file31

---

## 3) Reference Architecture (runtime)

```mermaid
graph LR
  subgraph Internet
    U[Users/Clients]
  end

  U --> CDN[CDN + WAF]
  CDN --> LB[HTTPS Load Balancer]
  LB --> API[Cloud Run: API Gateway (FastAPI)]
  LB --> ORCH[Cloud Run: AI Orchestrator]
  LB --> WEB[Cloud Run: Web App]

  ORCH --> WKR[Cloud Run: Workers]
  API -->|Pub/Sub| BUS[(Pub/Sub)]
  ORCH -->|events| BUS
  WKR -->|jobs| BUS

  API --> SQL[(Cloud SQL Postgres)]
  ORCH --> SQL
  WKR --> SQL
  API --> REDIS[(MemoryStore Redis)]
  ORCH --> REDIS
  WKR --> REDIS
  ORCH --> VEC[(Vector DB per region)]
  ORCH --> OBJ[(Cloud Storage / Media)]
  WKR --> OBJ

  subgraph Sec
    SECRETS[Secret Manager + KMS]
  end

  API --> SECRETS
  ORCH --> SECRETS
  WKR --> SECRETS
```
**Notes:** Services/dirs mirror the canonical monorepo (web, api, orchestrator, workers, ingest, exporter). fileciteturn0file35  
**AI Layers:** Planner/Router, Tool Caller, Critic/Verifier, Policy Router, Scheduler; **CAG** cache + **Graph‑RAG** grounding. fileciteturn0file28

---

## 4) Infrastructure as Code (Terraform on GCP)

> The snippets below are production‑grade **starting points**. Ensure CI injects env‑specific values and SA roles. Avoid non‑standard IAM like `roles/servicenetworking.admin` for VPC admin; use `roles/compute.networkAdmin`. fileciteturn0file36

### 4.1 Cloud Run service (API)
```hcl
resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region
  template {
    containers {
      image = "${var.artifact_registry}/api:${var.release_sha}"
      env {
        name  = "PORT"
        value = "8080"                # dynamic ports respected by app
      }
      env { name="ENV", value=var.env }
      env { name="DB_URL", value=google_sql_database_instance.main.connection_name }
      env { name="REDIS_URL", value=google_redis_instance.cache.host }
    }
    service_account = google_service_account.api.email
    max_instance_request_concurrency = 80
    scaling { min_instance_count = 1  max_instance_count = 50 }
  }
  ingress = "INGRESS_TRAFFIC_ALL"
}
```
**Container hardening:** non‑root user, healthcheck endpoint, minimal base image. fileciteturn0file36

### 4.2 Cloud SQL (Postgres) + Private IP
```hcl
resource "google_sql_database_instance" "main" {
  name             = "platform-pg"
  database_version = "POSTGRES_15"
  region           = var.region
  settings {
    tier = "db-custom-2-7680"  # tune for workload
    ip_configuration { ipv4_enabled = false, private_network = google_compute_network.vpc.id }
    availability_type = "REGIONAL"
    backup_configuration { enabled = true, point_in_time_recovery_enabled = true }
  }
}
```

### 4.3 Redis (MemoryStore) for cache/ratelimit/CAG
```hcl
resource "google_redis_instance" "cache" {
  name           = "platform-cache"
  memory_size_gb = 4
  tier           = "STANDARD_HA"
  region         = var.region
}
```

### 4.4 Secrets & CI bindings
```hcl
resource "google_secret_manager_secret" "api_key" {
  secret_id = "openai-api-key"
  replication { automatic = true }
}

resource "google_service_account_iam_member" "ci-secrets" {
  service_account_id = google_service_account.ci.name
  role               = "roles/secretmanager.secretAccessor"
  member             = "serviceAccount:${google_service_account.ci.email}"
}
```

---

## 5) CI/CD Pipeline (blue‑green + canary)

**Key stages**  
1) Lint, type‑check, tests → 2) Build images (multi‑stage; preserve pnpm workspace) → 3) Generate OpenAPI & typed client → 4) Migrate DB → 5) Deploy to **staging** (100%) → 6) Smoke tests → 7) Promote to **prod** with 10% canary → 8) Gradual 100% or rollback.  
- **OpenAPI client sync** is automated to prevent drift between backend & frontend. fileciteturn0file27  
- **Docker pitfalls:** copy **entire workspace** from deps stage; include **turbo.json**; avoid breaking pnpm symlinks. fileciteturn0file36

**Example (GitHub Actions—excerpt):**
```yaml
- name: Build web
  run: |
    pnpm install --frozen-lockfile=false
    pnpm turbo build --filter=web
# Generate API client from server OpenAPI
- run: pnpm generate:api-client
# Deploy with traffic split
- run: gcloud run services update-traffic api --to-latest --splits 0.1=LATEST,0.9=STABLE
```

---

## 6) Networking, Security & Compliance

- **Edge:** CDN/WAF, TLS 1.3, HSTS; consistent error shapes to prevent enumeration. fileciteturn0file24  
- **AuthN/Z:** OAuth2/OIDC JWTs; **RBAC + resource scopes** enforced at API & tool layers; approvals per phase gates. fileciteturn0file31  
- **Rate limiting & input validation** at gateway; tracing headers required; contract tests for every endpoint. fileciteturn0file23  
- **Secrets:** Secret Manager + KMS; no secrets in images; short‑lived tokens; SA least privilege. fileciteturn0file24  
- **Supply chain:** SBOM + SCA; pinned base images; non‑root users. fileciteturn0file36

---

## 7) Data Stores & Caching

### 7.1 PostgreSQL (Cloud SQL)
- **Schema:** ODL‑SD docs in **JSONB**; RLS policy with `{org_id}` from JWT; migrations via Alembic. fileciteturn0file35  
- **Performance:** Read replicas for analytics; connection pooling; statement timeouts; slow‑query logging; N+1 prevention. fileciteturn0file27

### 7.2 Redis (CAG, sessions, rate limits)
- **CAG:** Cache prompts/embeddings/tool outputs with event‑driven invalidation; drift detection refreshers. fileciteturn0file28  
- **Rate limits & response cache** utilities provided in platform libs. fileciteturn0file27

### 7.3 Object Storage & Vector DB
- **Media & exports:** Cloud Storage buckets, tenant‑prefixed; lifecycle rules.  
- **Vector DB (per region):** store embeddings with TTL and PII scrubbing on writes; regional shards to honour residency. fileciteturn0file28

---

## 8) AI/ML Runtime

- **Provider abstraction & fallbacks** (no hardcoded models); **structured I/O validation**; retries with backoff; **token & cost logging**. fileciteturn0file25  
- **Tool registry** with declarative JSON Schemas; ReAct loop; strict input validation; asynchronous tool execution. fileciteturn0file25  
- **Agents** registered with spec cards; least‑privilege tool scopes; scheduler for cron/event jobs. fileciteturn0file38 fileciteturn0file28

**Config example (values per env/region):**
```yaml
models:
  default: gpt-4o-mini
  fallbacks: [claude-3.5-sonnet]
  temperature: 0.2
ai_policies:
  max_psu_per_org_day: 5000   # guard budgets
  region_routing: ["us", "eu"]
```

---

## 9) Observability & SLOs

- **Metrics:** latency p50/p99, error rate, availability, request rate, token usage; dashboards and alerts. fileciteturn0file23  
- **Tracing:** propagate `X-Request-ID`, B3/Trace headers; tag spans with `api.version`, `operation_id`, `model.id`, and error fields. fileciteturn0file23  
- **SLOs:** define per service; **error budgets** drive rollouts/rollbacks; wire up runbooks. (See `07-ops/SLOs.md` & `07-ops/Observability-Runbook.md`.) fileciteturn0file20

**Cloud Run OTel env (excerpt):**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
OTEL_SERVICE_NAME=api
OTEL_RESOURCE_ATTRIBUTES=service.version=$RELEASE_SHA,service.namespace=prod
```

---

## 10) Backups, DR & Data Retention

- **Backups:** Daily + PITR for Postgres; bucket versioning for critical artifacts.  
- **DR:** RPO ≤ 15 min, RTO ≤ 60 min for control plane; cross‑region failover runbook tested quarterly.  
- **Retention:** Align with data classification & monetisation policies; escrow event logs retained per policy. fileciteturn0file29

---

## 11) Deployment Runbook (checklists)

### 11.1 Pre‑flight
- [ ] All tests pass; OpenAPI client regenerated and committed. fileciteturn0file27  
- [ ] DB migrations reviewed; backward‑compatible.  
- [ ] Secrets present; SA roles verified; quota headroom checked. fileciteturn0file24

### 11.2 Deploy
- [ ] Deploy to **staging**; run smoke & contract tests. fileciteturn0file23  
- [ ] Canary 10% on **prod**; watch SLOs & logs 30–60 min.  
- [ ] Promote to 100% or rollback.

### 11.3 Rollback
- [ ] Switch traffic to last stable revision; apply **inverse migration** if needed.  
- [ ] Post‑mortem with ADR entry & versioning updates. fileciteturn0file21 fileciteturn0file22

---

## 12) Environment Matrix (minimums)

| Resource | dev | staging | prod |
|---|---:|---:|---:|
| Cloud Run min/max instances (api) | 0 / 5 | 1 / 20 | 2 / 80 |
| Cloud SQL tier | shared | db-custom-2-7680 | db-custom-4-15360 (regional) |
| Redis size (GB) | 1 | 2 | 4–8 |
| Vector DB | single node | regional | regional + replicas |
| CDN/WAF | optional | on | on |

---

## 13) Appendix: Operational Policies

- **Feature flags** for risky changes; default to off in prod.  
- **Cost guardrails**: budgets & alerts on tokens, egress, Redis memory, Cloud SQL CPU. fileciteturn0file28  
- **Access audits**: append‑only logs; SIEM webhooks; session recording with consent. fileciteturn0file28

---

> **Cross‑refs:** See Architecture, Threat Model, SLOs, Observability Runbook, API Governance, and Versioning Policy for the governing contracts and gates. fileciteturn0file20 fileciteturn0file24 fileciteturn0file23 fileciteturn0file22

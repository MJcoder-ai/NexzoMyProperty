---
owner: platform-team
last_review: 2025-09-21
status: template
tags: ["slo", "reliability", "ai-sla", "api", "observability", "multi-tenant"]
references:
  - "../07-ops/Observability-Runbook.md"
  - "../07-ops/Incident-Playbooks.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../06-ml-ai/Model-Card.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../01-architecture/System-Architecture.md"
---

# Service Level Objectives (SLOs)

> **Purpose.** Define measurable reliability, performance, and quality targets for the platform—API, AI agents, data plane, and UI—across **multi-tenant, multi-user, multi-domain** deployments. SLOs are enforced via CI/CD policy gates and observed by the telemetry defined in the Observability Runbook.

---

## 1) Scope & Services

| Service | Description | Primary SLIs | Notes |
|---|---|---|---|
| **Public/Private APIs** | REST endpoints exposed via API Gateway | Availability, Latency (p50/p95/p99), Error Rate, Throughput | Stages & minimum SLAs follow governance policy (GA 99.95%). |
| **AI Orchestrator** | Planner/Router, Tool-caller, Critic/Verifier loops | Time-to-first-plan, Plan success rate, Tool success rate, Cost per task, Grounded-answer rate | Ground‑before‑Generate; PSU budgets per tenant. |
| **Model Inference Endpoints** | Synchronous LLM/embedding/vector ops | Inference latency, Error rate, Cost per 1K tokens, Drift alarms | Model versioning + rollback strategy applies. |
| **Data Plane** | DB, Vector/Graph stores, cache/CAG, object store | Read/write latency, Freshness lag, Consistency, Backup RPO/RTO | Row-level security (RLS) for tenancy. |
| **Workers & Schedules** | Queues, batch sims, evaluations | Queue wait time, Job success rate, SLA by class | Includes nightly evals & retrains. |
| **UI (Web/Mobile)** | App surfaces incl. Co‑Pilot pane | App TTFB, Input→Action round-trip, Frontend error rate | Phase/role-aware UX with trace panel. |
| **Security & Access** | AuthN/Z, RBAC, secrets | Auth latency, RBAC decision accuracy, Policy drift | Zero cross-tenant data exposure. |

---

## 2) Service Level Indicators (SLIs)

**Reliability**
- **Availability** = 1 − (failed_requests ÷ total_requests) over a rolling 28-day window.
- **Error Rate** = 5xx + “policy_denied” (where applicable) ÷ total_requests.
- **Latency (API)**: p50, p95, p99 from HTTP server histograms (ms).

**AI Quality**
- **Time-to-first-plan (TTFP)**: ms from request → first plan card emitted.
- **Plan Success Rate**: % plans that complete without human override for “core” tasks.
- **Grounded-Answer Rate**: % responses with cited evidence (Graph‑RAG/tools) passing validators.
- **Hallucination Rate**: % responses failing grounding or red-team checks.
- **Tool Success Rate**: % tool invocations that return valid, schema‑conformant outputs.

**Data**
- **Freshness Lag**: max(event_time → usable_in_store) for ingestion.
- **Consistency**: % reads that meet latest committed version for tenant partition.
- **Backup/Restore**: RPO/RTO achieved in quarterly drills.

**Security/RBAC**
- **RBAC Decision Accuracy**: % decisions matching policy in audit replay.
- **Cross‑Tenant Isolation**: incidents/month (target: 0); mean time to isolate (MTTI).

**Cost/Capacity**
- **Cost per 1K tokens** (AI), **PSU per successful plan**, **Cache Hit Rate (CAG)**.

---

## 3) Target SLOs (by service)

> Targets are starting points; teams may propose stricter goals with evidence. Availability is measured monthly unless noted.

### 3.1 APIs (GA stage)

| SLI | Target | Alert at | Notes |
|---|---:|---:|---|
| Availability | **99.95%/month** | burn rate ≥ 2x over 1h | Per governance GA stage. |
| Latency p50 | **<100 ms** | >200 ms | As per API perf standards. |
| Latency p99 | **<500 ms** | >1,000 ms | Critical user journeys. |
| Error Rate | **<0.1%** | >1% | Excludes 4xx client errors. |

### 3.2 AI Orchestrator

| SLI | Target | Alert at | Notes |
|---|---:|---:|---|
| Time‑to‑first‑plan | **≤ 2 s p95** | > 3 s | User‑visible plan cards. |
| Plan Success Rate | **≥ 90%** | < 85% | No manual retry/override. |
| Grounded‑Answer Rate | **≥ 95%** | < 92% | Evidence before generation. |
| Hallucination Rate | **< 5%** | ≥ 8% | Validated by eval suite. |
| Tool Success Rate | **≥ 98%** | < 95% | Schema‑valid outputs. |
| Cost per task | **Budgeted per tenant** | > 120% of budget | PSU budgets & policy router. |

### 3.3 Model Inference Endpoints

| SLI | Target | Alert at | Notes |
|---|---:|---:|---|
| Inference Latency p95 | **< 1.5 s** | > 2.0 s | Region-routed. |
| Error Rate | **< 0.5%** | ≥ 1% | Including rate‑limit failures. |
| Cost / 1K tokens | **≤ budget** | > 120% | Provider/model mix enforced. |
| Drift Alarms | **0 critical** | any | KL/PSI thresholds in eval plan. |

### 3.4 Data Plane (DB + Vector/Graph + Cache)

| SLI | Target | Alert at |
|---|---:|---:|
| Read Latency p95 | **< 20 ms** | > 40 ms |
| Write Latency p95 | **< 50 ms** | > 100 ms |
| Freshness Lag p95 | **< 60 s** | > 5 min |
| Cache Hit Rate (CAG) | **≥ 70%** | < 50% |
| Backup RPO | **≤ 15 min** | > 30 min |
| Restore RTO (quarterly drill) | **≤ 60 min** | > 90 min |

### 3.5 Workers, Queues, Schedulers

| SLI | Target | Alert at |
|---|---:|---:|
| Queue Wait p95 | **< 30 s** | > 90 s |
| Job Success Rate | **≥ 99%** | < 98% |
| SLA Class A (user‑blocking) | **≤ 2 min** | > 5 min |
| SLA Class B (batch) | **≤ 30 min** | > 60 min |

### 3.6 UI (Web & Mobile)

| SLI | Target | Alert at |
|---|---:|---:|
| App TTFB p95 | **< 300 ms** | > 600 ms |
| Input→Action Round‑trip p95 | **< 1.0 s** | > 2.0 s |
| Frontend Error Rate | **< 0.5%** | ≥ 1% |

### 3.7 Security & Access

| SLI | Target | Alert at |
|---|---:|---:|
| Auth Latency p95 | **< 300 ms** | > 600 ms |
| RBAC Decision Accuracy | **100%** | < 100% |
| Cross‑Tenant Data Leakage | **0** | any |
| Critical Vuln Patch | **≤ 24 h** | > 24 h |

---

## 4) Error Budgets & Policy

- **Error Budget** = 1 − Availability Target. For **99.95%** monthly, budget ≈ **21m 54s**/month.
- **Budget Burndown**: page when 25%/50%/75% of budget consumed or projected to be consumed within 24h.
- **Release Guardrails**:
  - Block deploys when burn rate ≥ 2x for 1h on any Tier‑1 service.
  - Allow emergency fixes even under freeze.
- **Rollback**: mandatory if error rate >1% for 10 min or p99 latency > 2x target for 15 min.

---

## 5) Measurement & Queries

**Data Sources**: OpenTelemetry (traces, metrics, logs), Prometheus, API Gateway logs, model registry, eval pipeline.

**Example PromQL**

```promql
# API availability (per major version)
sum(rate(http_requests_total{status!~"5..", api_version=~"v[0-9]+"}[5m]))
/
sum(rate(http_requests_total{api_version=~"v[0-9]+"}[5m]))

# API latency p99
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Orchestrator time-to-first-plan p95
histogram_quantile(0.95, sum(rate(ai_ttfp_seconds_bucket[5m])) by (le, tenant))

# Grounded‑answer pass rate
sum(rate(ai_grounding_pass_total[15m])) / sum(rate(ai_grounding_checks_total[15m]))
```

**Tracing Attributes (required)**: `api.version`, `api.operation_id`, `user.id_hash`, `model.id`, `cost.tokens`, `ai.plan_id`, `tenant.id`.

---

## 6) AI‑Specific SLO Governance

- **Ground‑Before‑Generate**: all agent answers must cite retrieved evidence or tool outputs; non‑compliant answers count toward hallucination rate.
- **Versioning**: models/tools/prompts carry SemVer; breaking changes require major bump and deprecation windows.
- **Rollback Strategy**: maintain N−1 artifacts hot for blue‑green switch; rollback in <5 minutes on drift/latency regressions.
- **Budgeting**: PSU budgets enforced per tenant, per agent; warn at 80%, block at 120% of monthly allocation.

---

## 7) Multi‑Tenancy & Access SLOs

- **Isolation**: zero cross‑tenant reads/writes; MTTI (time to isolate) ≤ **15 min** after detection.
- **RBAC**: phase‑gates enforced; “propose vs write” semantics audited; approval latency (business hours) ≤ **4 h** p95 for gated merges.
- **Data Classification**: restricted/confidential sections logged with immutable audit.

---

## 8) Alerting, On‑Call & Review Cadence

- **Multi‑window burn alerts**: 5m/30m/6h windows; page on fastest window breach.
- **Runbooks**: each alert links to a diagnostic playbook (observability runbook) and an incident playbook.
- **SLO Reviews**: monthly reliability review; quarterly SLO re‑baseline tied to product stages.
- **Postmortems**: required for budget exhaustion or Sev‑1; action items tracked to closure.

---

## 9) Stage‑Specific SLAs (for reference)

| Stage | SLA (Availability) | Support |
|---|---:|---|
| Experimental | None | Community |
| Beta | 95% | Email |
| GA | **99.95%** | 24/7 |
| Deprecated | 99% | Limited |
| Sunset | Best effort | None |

---

## 10) Change Control & Exceptions

- Exceptions require an ADR with rationale, time‑boxed, and remediation plan.
- Governance board approves major deviations; security exceptions require CISO approval.

---

## 11) Appendix — Formulas

- **Availability** = 1 − (minutes_downtime ÷ minutes_in_period).
- **Error Budget (minutes)** = minutes_in_period × (1 − SLO).
- **Burn Rate** = actual_error / error_budget over a time window.

> Keep this document living: update targets and SLIs after each major architecture change, new model family, or material change in user mix.


# Agent Runbook (Operations & Maintenance)

> **Scope.** Day‑2 operations for AI agents (planning, tool‑calling, evaluators, schedulers). This runbook standardizes health checks, rollouts/rollbacks, guardrails, incident response, cost controls, and observability for a multi‑tenant, multi‑user, multi‑domain platform.

**Foundations & references:** Enterprise agent design & ops are anchored in our Engineering Playbook (principles, contracts, observability), AI Cookbook building blocks (intelligence layer, memory, tools, validation, recovery), the enterprise AI architecture (orchestrator, policy router, scheduler, CAG cache, Planner Trace UI), agent taxonomy (inventory & roadmap), development standards (common pitfalls), versioning and API governance (SemVer, deprecations, contract tests), and the security threat model (AI‑specific STRIDE mitigations). fileciteturn0file38 fileciteturn0file25 fileciteturn0file28 fileciteturn0file37 fileciteturn0file36 fileciteturn0file22 fileciteturn0file23 fileciteturn0file24

---

## 1) Inventory & Ownership

Maintain a **single registry** of agents with owner team, on‑call rotation, SemVer, capabilities, tool scopes, SLAs, and dependencies.

**Minimal registry record (YAML):**
```yaml
id: price_finder_agent
version: "1.2.0"          # SemVer — MAJOR for breaking changes
owner_team: procurement-platform
description: "Return real-time prices & lead times for BOM items"
capabilities: [price_lookup, availability_check, supplier_comparison]
required_context: { project_id: str, bom_lines: list }
tool_access:
  - name: SupplierAPI  # scopes enforced by orchestrator
    scopes: ["read:price", "read:stock"]
    rate_limit: "10/min"
  - name: CacheDB
    scopes: ["read", "write"]
functions:
  get_prices:
    timeout: 15s
    retries: 2
    input_schema: { $ref: "schemas/price_input.json" }
    output_schema: { $ref: "schemas/price_output.json" }
events_published: [PRICE_MATRIX_READY]
events_subscribed: [INVENTORY_SELECTED]
slo: { latency_p95_ms: 800, success_rate: ">=99.5%" }
```
Use the **Spec Card** pattern from the Engineering Playbook and validate contracts in CI (jsonschema + spectral). fileciteturn0file38 fileciteturn0file23

---

## 2) SLIs / SLOs

Define and monitor per‑agent SLOs (per tenant where applicable).

**Core SLIs**
- **Availability:** `% successful runs` (HTTP 2xx / ok status)
- **Latency:** `p50, p95, p99 end‑to‑end` and `per tool call`
- **Quality:** task‑specific eval score (e.g., grounded‑answer rate)
- **Cost:** tokens, PSU, external API spend per run
- **Safety:** violations blocked by guardrails/critic
- **Cache efficacy:** CAG hit rate (target ≥ 70% where applicable)

**Default SLO targets**
- Availability **99.95%**; Error rate **<0.1%**
- Latency: task‑type specific (e.g., plan ≤ 2s p95; tool act ≤ 1s p95)
- Cost guard: per‑tenant **PSU budget** with soft/hard caps and policy‑router throttling. fileciteturn0file28 fileciteturn0file29

Wire SLOs to dashboards/alerts per API governance metrics (latency, error rate, availability, token usage). fileciteturn0file23

---

## 3) Health, Readiness & Diagnostics

**Mandatory endpoints** (served by orchestrator/agent service):
- `/health/live` — process up, event loop responsive
- `/health/ready` — dependencies OK: Tool Registry, Model Provider(s), Memory store, Cache, DB
- `/health/deps` — dependency matrix with versions & latencies

**Startup checklist**
- Load **Tool Registry** & validate JSON Schemas (fail closed)
- Resolve **ModelSelector** config and region routing
- Warm **CAG caches** for frequent prompts/tools
- Register tracing exporters & request **trace_id** propagation
- Verify **RBAC scopes** & **phase‑gates** from policy store

**Quick commands**
```bash
# Liveness/Readiness
curl -fsS http://$HOST/health/live
curl -fsS http://$HOST/health/ready

# Trace a sample run
curl -X POST http://$HOST/agents/price_finder/run -d @fixtures/bom_small.json -H "X-Request-ID: test-run-001"
```

Architecture references: Orchestrator (Planner → ToolCaller → Critic/Verifier → Policy Router) and Scheduler; CAG layer for cost/latency. fileciteturn0file28

---

## 4) Deployments, Versioning & Rollbacks

- **SemVer** applies to agents, tools, prompts, and models. MAJOR for breaking I/O or behavior; MINOR for additive; PATCH for fixes. Keep **deprecation timelines** and headers when APIs are agent‑facing. fileciteturn0file22 fileciteturn0file23
- Bundle **config‑as‑code** (spec card + prompt versions + tool schemas) per release; pin model versions where deterministic output is required.
- **Blue/Green** or **Canary** rollouts with per‑tenant or % traffic routing; enable quick rollback to previous bundle. (Rollbacks <5 min via registry switch.) fileciteturn0file22
- On upgrade: migrate caches, run compatibility evals, update ADR if behavior changes materially (document rationale & trade‑offs). fileciteturn0file21

**Release checklist**
- [ ] Contracts validated (jsonschema/spectral)
- [ ] Evals pass thresholds (quality, safety, cost)
- [ ] Observability verified (traces/metrics/logs present)
- [ ] Backward‑compat confirmed or deprecation plan attached
- [ ] Runbook updated

---

## 5) Observability by Design

**Trace every step**: planner decisions, tool selections, tool I/O (sanitized), cache hits/misses, critic verdicts, retries, fallbacks, token/PSU cost, and final outputs with confidence.

**Minimum logs/metrics**
- `trace_id`, `tenant_id`, `agent_id@version`, `plan_step`, `tool_name@version`, `cache.hit`, `latency_ms`, `tokens_prompt`, `tokens_completion`, `psu_cost`, `quality_score`, `guardrails_blocked`
- Distributed tracing headers (`X-Request-ID`, `X-Correlation-ID`, B3). fileciteturn0file23
- Dashboards: latency (p50/p95/p99), error rate, availability, request rate, token usage; drift alerts for quality. fileciteturn0file23

Follow Playbook guidance on structured logging + OpenTelemetry exporters. fileciteturn0file38

---

## 6) Guardrails, RBAC & Safety

**Enforce before act:**
- Prompt schemas & output validation (Pydantic/JSON Schema)
- Tool arguments validated against schemas; **never eval** model‑generated code
- **Least‑privilege** tool scopes per agent and **phase‑gates** by lifecycle
- PII detection & redaction on inputs/outputs; content filters
- Critic/Verifier gate for high‑risk actions; human approvals where required

Align with Threat Model’s AI‑specific mitigations (injection, extraction, poisoning, inversion) and system STRIDE risks; document compensating controls. fileciteturn0file24

**Secure prompting & redaction** policies apply to all agent channels (chat, APIs). Link runbook to the detailed Secure‑Prompting guide if present in your repo. (See Security Guidelines & governance references.) fileciteturn0file23

---

## 7) Cost Controls & Budgets

- **PSU budgets** per tenant/agent enforced by **Policy Router**; soft‑cap warnings, hard‑cap blocks with safe‑degrade strategies (cheaper models, cached paths, summarize‑then‑act). fileciteturn0file28 fileciteturn0file29
- **CAG‑first** (cache‑answer‑generate) to reduce tokens/latency; cache invalidation via TTL + event‑driven signals + drift detectors. Targets: ≥70% hit rate where stable. fileciteturn0file28

**Budget alerts**
- Warn at **80%** monthly budget; block at **100%**; provide override for critical paths with explicit approval events.

---

## 8) Common Failure Modes & Playbooks

> Use the Incident Playbooks in 07‑ops for process; below are agent‑specific runbook steps. (Escalate per severity matrix.)

### A. Model/API Outage or 5xx Spikes
1) Switch to **fallback model/provider** (pre‑configured) and reduce temperature; enable **strict schemas**. fileciteturn0file25  
2) Increase retry backoff; cap concurrency; raise latency SLO temporarily.  
3) Post status in #ai‑ops; open incident; monitor error budget burn.

### B. Cost Spike (token storm / misuse)
1) Check dashboard (token & PSU metrics); identify high‑cost prompts/tools. fileciteturn0file23  
2) Enable **CAG‑only** mode for affected flows; enforce per‑user rate limits.  
3) Throttle via Policy Router; if abuse, block tenant/keys; file RCA.

### C. Prompt Injection / Tool Misuse Detected
1) Verify guardrail logs; quarantine session; scrub memory entries. fileciteturn0file24  
2) Add injection pattern to filters; tighten tool schemas; require approvals for destructive tools.  
3) Run red‑team tests; update tests & prompts; publish advisory.

### D. Quality/Drift Regression
1) Compare eval dashboards; roll back **prompt/model** version; invalidate caches. fileciteturn0file22  
2) Trigger **ReflectionAgent** batch to refresh best‑practices corpus. fileciteturn0file28  
3) Open ADR with findings & long‑term fixes. fileciteturn0file21

### E. Memory/Cache Outage
1) Fail open with **short context**; reduce K; use **progressive summarization** fallback. fileciteturn0file25  
2) Rehydrate from durable store; restore CAG; verify hit rate recovery.

### F. N+1 / Performance Degradation
1) Check query traces; enable caching on hot paths; apply eager‑loading patterns. fileciteturn0file36  
2) Validate client/openapi alignment to avoid retries & drift. fileciteturn0file33

---

## 9) Change Management

- **ADR required** for architectural/behavioral changes or governance exceptions (link decision, rationale, trade‑offs, consequences). fileciteturn0file21
- For **breaking changes**, publish deprecation headers, migration guides, and timelines; keep dual‑run during migration window. fileciteturn0file23

---

## 10) Testing & Evals

**Gates before prod**
- Contract tests (schemas & examples) — Spectral + Pact; “can‑i‑deploy” checks. fileciteturn0file23  
- Unit/Integration tests with **golden samples** and deterministic prompts.  
- **Eval suite** per agent (accuracy, hallucination, safety, cost) with thresholds; schedule weekly/cron runs.

**Harness snippet (Python)**
```python
from evals.framework import run_eval
run_eval(agent="price_finder_agent@1.2.0",
         dataset="tests/eval/pricing_accuracy.jsonl",
         thresholds={"precision@top1": 0.9, "latency_p95_ms": 800})
```

---

## 11) UI & Transparency

- Expose **Planner Trace UI**: Intent → Plan → Action & Evidence → Proposed Change (Diff) → Approval; show cost & cache chips; stream tokens. fileciteturn0file28
- In chat UIs, show **Plan Timeline** with statuses (pending/in‑progress/complete/blocked) and consistent layout patterns. fileciteturn0file40

---

## 12) Configuration & Secrets

- Centralize config (YAML/ENV) for models, tools, policies; externalize from code.  
- Secrets via vault; rotate keys; avoid project‑local storage.  
- Multi‑tenant: isolate data per tenant; ensure region routing for residency. fileciteturn0file28

---

## 13) Dev & Build Standards (avoid known pitfalls)

- Keep **single source of truth** for types (no duplications); import from authoritative packages.  
- Preserve pnpm workspace symlinks in multi‑stage Docker builds; copy full workspace and `turbo.json`.  
- Avoid reserved keywords (`eval`, `arguments`) in identifiers; enforce strict TS settings.  
- Cache read paths, paginate, and trace slow queries; auto‑generate API clients to prevent drift. fileciteturn0file36

---

## 14) Runbook Checklists

**On‑call: Triage (first 5 minutes)**
- [ ] Confirm scope (tenants/agents/tools affected)
- [ ] Check status page & provider outages
- [ ] Inspect error dashboards & recent deploys
- [ ] Toggle fallbacks (models, CAG‑only, rate limits)
- [ ] Create incident channel & timeline

**Post‑incident: RCA (within 48h)**
- [ ] Document root cause & contributing factors
- [ ] Add tests/evals; update guardrails & budgets
- [ ] File ADR if architectural change needed
- [ ] Communicate to stakeholders; link dashboards

---

## Appendix A — Example K8s Probes

```yaml
livenessProbe:
  httpGet: { path: /health/live, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health/ready, port: 8080 }
  initialDelaySeconds: 20
  periodSeconds: 10
```

## Appendix B — Minimal Tool Schema (JSON Schema)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SupplierAPI.get_prices input",
  "type": "object",
  "properties": {
    "sku": { "type": "string" },
    "quantity": { "type": "integer", "minimum": 1 },
    "region": { "type": "string" }
  },
  "required": ["sku", "quantity"]
}
```

---

**Changelog**
- v1.0 — Initial runbook consolidated from platform standards and architecture.
```

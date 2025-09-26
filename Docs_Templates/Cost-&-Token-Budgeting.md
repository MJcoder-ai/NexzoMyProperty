---
title: Cost & Token Budgeting
status: template
owners: ["ops", "finance", "ml-platform"]
last_review: 2025-09-22
audience: ["SRE/Operations", "AI Platform", "Finance", "Security", "Product"]
tags: ["cost", "tokens", "budgets", "observability", "policy-router", "psu"]
---

# Cost & Token Budgeting (Multi‑tenant, Multi‑user, Multi‑domain)

> **Why this exists:** keep AI/ML costs predictable and **prevent runaway spend** while maintaining user experience and SLOs. This runbook defines *how we budget, meter, alert, enforce, and optimize* token usage and higher‑cost compute (PSUs), per environment, tenant, agent, tool, and model.

**Design anchors**: CAG‑first efficiency and a Policy Router that enforces per‑org/agent budgets; both are first‑class in the enterprise blueprint. fileciteturn0file28  
**Commercial contract**: product packaging uses **Premium Simulation Units (PSUs)** and plan quotas (Free/Pro/Enterprise, Boost Packs). This runbook maps token budgets to those commercial limits. fileciteturn0file29  
**Observability**: governance requires explicit **token usage** metrics, tracing fields, and dashboards/alerts at the API layer. fileciteturn0file24  
**Security**: rate limits and guardrails (e.g., model extraction defense, per‑user/per‑model caps) are mandatory controls. fileciteturn0file25  
**Engineering practice**: all agents log cost, latency, retries, and fallbacks; resilient orchestration & event sourcing recommended. fileciteturn0file39 fileciteturn0file26  
**Dev standards**: cache reads, avoid N+1, and track costs in CI/CD & runtime; block deploys if governance checks fail. fileciteturn0file36 fileciteturn0file24

---

## 1) Scope & Goals

- **Scope**: LLM calls (chat/completions, embeddings), vector ops, retrieval, tool calls, simulations (PSU metering), and any external API billed by usage.  
- **Goals**:  
  1) Predictable monthly spend per tenant & environment.  
  2) **Soft‑cap** degrade → **hard‑cap** block with clear UX.  
  3) 70%+ **CAG hit rate** for repeat questions; <2s p95 grounded answers (architecture target). fileciteturn0file28  
  4) Zero silent budget violations (all enforced through Policy Router). fileciteturn0file28

---

## 2) Definitions

- **Token**: vendor‑billed unit for prompts/completions/embeddings.  
- **TU (Token Unit)**: internal normalized unit = *1,000 tokens*.  
- **PSU (Premium Simulation Unit)**: heavy compute credit for simulations/HPC; used in plans & Boost Packs. fileciteturn0file29  
- **CAG (Cache‑Answer‑Generate)**: prefer cached results/embeddings/tool outputs; generate only when cache miss/drift. fileciteturn0file28

---

## 3) Budget Taxonomy (where we set limits)

We apply budgets **top‑down** with inheritance and overrides:

| Layer | Examples | Default Policy |
|---|---|---|
| **Environment** | dev, staging, prod | Guardrails stricter in dev/staging (lower caps) |
| **Tenant/Org** | acme‑inc, solar‑labs | Monthly $$ cap + TUs + PSUs; alert at 60/80/95% |
| **Project/Portfolio** | customer projects | Optional sub‑allocation; follows tenant unless overridden |
| **Agent** | DesignEngineerAgent, SourcingGrowthAgent | Per‑agent daily TU cap; PSU cap for heavy tools fileciteturn0file28 fileciteturn0file39 |
| **Tool** | rfq_issue, parse_datasheet_pdf | Per‑call TU ceiling & concurrency; PSU charge for simulation tools fileciteturn0file28 |
| **Model** | gpt‑x, claude‑y | Max TU/day; fallback ladder enabled fileciteturn0file26 |
| **User/Role** | Free/Pro/Enterprise | Maps to plan quotas (incl. Boost Packs) fileciteturn0file29 |

### 3.1 Plans → Budgets (template mapping)

- **Free**: 3 designs/mo, minimal TU pool, PSU=0 (trial extension rules separate). fileciteturn0file29  
- **Pro (per user)**: includes **100 PSUs/mo/user** fair‑use; TU pool sized to typical workflows; soft/hard caps with upsell to **Boost Pack**. fileciteturn0file29  
- **Enterprise**: org‑level caps + SLOs; dedicated budgets and custom guard rails. fileciteturn0file29

---

## 4) Configuration (authoritative budgets file)

This file is owned by Ops/Finance, loaded by the **Policy Router** at runtime and cached in config‑store.

```yaml
# ops/budgets.yaml
version: "1.0"
environments:
  prod:
    default_tu_per_month: 25_000           # 25M tokens normalized as TUs
    default_psu_per_month: 5_000           # heavy compute credits
    alert_thresholds: [0.6, 0.8, 0.95]
  staging:
    default_tu_per_month: 2_000
    default_psu_per_month: 200
  dev:
    default_tu_per_month: 500
    default_psu_per_month: 0

tenants:
  acme-inc:
    currency: USD
    tu_limit: 12_000
    psu_limit: 1_000
    rollover_tu_pct: 10
    agents:
      DesignEngineerAgent:
        tu_daily_cap: 600
        fallback_on_exceed: "lower-cost-model"   # degrade strategy
      SourcingGrowthAgent:
        tu_daily_cap: 300
        tool_caps:
          rfq_issue: { tu_per_call: 10, max_qps: 0.2 }
  solar-labs:
    currency: EUR
    tu_limit: 50_000
    psu_limit: 6_000
    projects:
      SITE_ES_01:
        tu_limit: 8_000
        psu_limit: 500

models:
  # keep prices in separate model_costs.yaml maintained by platform
  default_fallbacks:
    reasoning: ["gpt-x-pro", "gpt-x-mini"]
    extraction: ["fast-extractor", "general-mini"]
  caps:
    gpt-x-pro:   { tu_daily_cap: 10_000 }
    gpt-x-mini:  { tu_daily_cap: 20_000 }
    fast-extractor: { tu_daily_cap: 30_000 }
```

> The **fallback ladder** and **soft/hard‑cap** actions are implemented in the Policy Router layer (plan limits, PSU budgets, CAG‑first). fileciteturn0file28

---

## 5) Enforcement Logic (Policy Router)

**Pre‑call checks** happen *before every* model/tool invocation:

1. Resolve tenant → agent → tool → model → user scopes.  
2. Retrieve counters (tu_used_mtd, psu_used_mtd, tu_used_today, …) from cost store.  
3. If **soft‑cap** breached → degrade (smaller models, lower max tokens, enable CAG‑only mode).  
4. If **hard‑cap** breached → block and surface *clear UX* with upgrade path (see §10).  
5. Attach cost intent (expected TU/PSU) to trace; continue call if permitted.

```python
def allow_call(ctx: CallContext) -> Decision:
    limits = budget_store.lookup(ctx.tenant, ctx.agent, ctx.tool, ctx.model)
    usage  = usage_store.snapshot(ctx.tenant)
    if usage.mtd.tu >= limits.tu_limit:
        return Decision(block=True, reason="HARD_CAP_TU_EXCEEDED")
    if usage.today.tu >= limits.tu_daily_cap:
        return Decision(degrade=True, strategy="fallback_model")
    # per-tool caps
    if ctx.tool.tu_per_call and ctx.estimate_tu > ctx.tool.tu_per_call:
        return Decision(degrade=True, strategy="truncate_prompt")
    return Decision(ok=True)
```

> Fallbacks and retries **must** be logged with tokens, latency, and final outcome for audits and tuning. fileciteturn0file39 fileciteturn0file26

---

## 6) Instrumentation (what we log every time)

Log fields are **mandatory** and used for dashboards, anomaly detection, and chargebacks.

```json
{
  "trace_id": "ULID...",
  "tenant": "acme-inc",
  "agent": "DesignEngineerAgent",
  "tool": "schema_validate",
  "model": "gpt-x-pro",
  "input_toks": 1423,
  "output_toks": 512,
  "tu": 1.935,
  "psu": 0,
  "cache_hit": true,
  "cag_key": "design:hash",
  "latency_ms": 920,
  "cost_usd": 0.0123,
  "fallback_used": false,
  "ts": "2025-09-22T10:20:30Z"
}
```

- **API layer** must emit **token usage** metrics and distributed tracing attributes (`api.operation_id`, `model.id`, `api.response_time_ms`). fileciteturn0file24  
- **CAG keys & hit ratios** should be captured for cache effectiveness. fileciteturn0file28  
- Persist to SIEM/observability stack with cost counters per dimension (tenant/agent/tool/model). fileciteturn0file39

---

## 7) Dashboards & Alerts (SLO‑aligned)

**Core panels**: TU/PSU usage vs budget (MTD), cost/day, cache hit‑rate, fallback rate, error rate, latency p95/p99, top cost centers (agent/tool/model).  
**Alert thresholds** (notify Slack/Email, create incident):

| Signal | Warning | Critical | Owner |
|---|---|---|---|
| TU usage (tenant) | 80% MTD | 95% MTD | Finance+Ops |
| PSU usage (tenant) | 80% MTD | 95% MTD | Finance+Ops |
| Cache hit‑rate | <60% over 1h | <40% over 15m | Platform |
| Token spike | >10× baseline/5m | >20× baseline/5m | SRE |
| Error rate | >1% over 5m | >5% over 5m | SRE |
| p99 latency | >1s | >2s | SRE |

> Latency, error‑rate and availability targets align with API SLOs and the Observability standards. fileciteturn0file24

**Example query (pseudo‑SQL):**

```sql
SELECT tenant, sum(tu) AS tus, sum(cost_usd) AS cost
FROM ai_cost_events
WHERE ts BETWEEN now() - interval '1 day' AND now()
GROUP BY tenant ORDER BY cost DESC LIMIT 20;
```

---

## 8) Cost Model (fill‑in with vendor prices)

We keep model pricing in a single source of truth: `ops/model_costs.yaml`, refreshed by CI. Each LLM/tool entry has `{prompt_price_per_1k, completion_price_per_1k, embedding_price_per_1k}`. This runbook avoids hard‑coding vendor rates (they change). **AI Cookbook** and Playbook require structured cost logging to compute blended costs across fallbacks. fileciteturn0file26 fileciteturn0file39

**Estimator**:

```
estimated_cost_usd = (prompt_toks/1000)*ppk_prompt + (completion_toks/1000)*ppk_completion + embeddings_cost
```

> Keep evaluation costs visible in model cards and CI cost gates before promotion. (Tie‑in with Model Cards & Eval Plan.)

---

## 9) Cost‑Saving Playbook (prioritized)

1. **CAG‑first**: Cache prompts, embeddings, tool outputs, and sims; expire by TTL & invalidation events. Target ≥70% CAG hit rate. fileciteturn0file28  
2. **Right‑size models**: Use cheap extractors for parsing; reserve expensive reasoning for gated steps with critic/verifier. fileciteturn0file28 fileciteturn0file39  
3. **Structured I/O**: Strict schemas, low temperature, bounded outputs reduce retries/tokens. fileciteturn0file26  
4. **Context minimalism**: Token‑aware windows, summaries, semantic memory; never over‑contextualize. fileciteturn0file26  
5. **Concurrency controls**: Cap parallel tool/model calls per tenant; prefer batch processing for bulk jobs. fileciteturn0file39  
6. **N+1 & caching at API**: Optimize queries, add Redis caching; see performance improvements doc. fileciteturn0file36  
7. **Rate limits**: Per‑user/per‑model to dampen abuse and cost spikes; aligned to threat model. fileciteturn0file25  
8. **A/B model swaps**: Routinely test lower‑cost models with guard metrics and rollback criteria. fileciteturn0file28

---

## 10) UX for Budgets (clear, role‑aware)

- **Status Bar/Co‑Pilot**: show **plan usage chips** (TU/PSU), soft‑cap warnings, and inline calls to action (“Enable Boost Pack,” “Switch to fast mode”). (Tie‑in with UI guidelines and Co‑Pilot panes.) fileciteturn0file33 fileciteturn0file40  
- **Degrade gracefully**: On soft‑cap → smaller models, stricter CAG, approval required for heavy tools. Explain *why* in the UI and provide one‑click upgrade/exception request. fileciteturn0file33

---

## 11) Incident Runbook (cost anomaly / runaway loop)

**Trigger examples**: Token spike alert, cache hit‑rate collapse, fallback tornado, vendor pricing change, suspected abuse.

**First 15 minutes**  
1. *Acknowledge alert*; open incident channel.  
2. **Throttle** at gateway (global 429s) & enforce stricter per‑tenant limits. fileciteturn0file25  
3. Enable **CAG‑only** mode for the noisy tenant/agent via budgets override. fileciteturn0file28  
4. Capture traces & top offenders (tenant/agent/tool/model). fileciteturn0file24

**Next 60 minutes**  
5. Identify root cause (prompt inflation, loop, new feature, vendor outage).  
6. Patch prompts/tool schema; add guard tests; raise unit price alarms if needed. fileciteturn0file39  
7. Coordinate **comms** to affected customers (transparency policy). fileciteturn0file29

**Post‑mortem**  
8. File an ADR with the exception/rationale; update budgets.yaml and spectral rules if applicable. fileciteturn0file21 fileciteturn0file24

---

## 12) Governance & Compliance Tie‑ins

- **API Governance**: CI checks ensure specs include examples, tracing fields, and token usage metrics. Deploys are blocked if standards fail. fileciteturn0file24  
- **Versioning**: Deprecations must include migration guides & budget impacts (e.g., more expensive model route). fileciteturn0file22  
- **Threat Model**: Abuse & DoS scenarios map to budget throttles and rate limiting in the gateway. fileciteturn0file25

---

## 13) Change Management & Exceptions

- **Normal change**: PR to `ops/budgets.yaml` with cost impact note → approval by Finance+Ops → rollout.  
- **Exception**: file an ADR (template linked) with scope, duration, and remediation plan; set *expiry date* in config. fileciteturn0file21

---

## 14) Interfaces (where this plugs in)

- **Orchestrator/Policy Router**: enforces budgets & fallbacks at plan time; honors PSU/TU caps. fileciteturn0file28  
- **Agent Registry**: agents advertise cost class and default model ladders. fileciteturn0file39  
- **Model Cards & Eval Plan**: publish cost/quality trade‑offs and guard thresholds before GA. (Cross‑ref: 06‑ml‑ai docs.)

---

## 15) Appendix

### A. Minimal cost middleware (FastAPI pseudo‑code)

```python
@app.middleware("http")
async def ai_cost_middleware(request, call_next):
    ctx = extract_ctx(request)  # tenant/agent/tool/model
    decision = policy_router.allow_call(ctx)
    if decision.block: return JSONResponse(429, {"error":"budget_exceeded","reason":decision.reason})
    start = monotonic()
    response = await call_next(request)  # wraps tool/model calls
    elapsed = (monotonic()-start)*1000
    metrics.emit_cost(ctx, response.tokens_in, response.tokens_out, elapsed, decision.degrade)
    return response
```

### B. Example tenant budget override (hotfix)

```yaml
tenants:
  acme-inc:
    tu_limit: 18_000   # was 12_000
    agents:
      DesignEngineerAgent:
        tu_daily_cap: 400  # temporary
```

### C. Required tracing attributes (add to spans)

- `model.id`, `model.version`, `prompt_tokens`, `completion_tokens`, `cache.hit`, `fallback.used`, `policy.action`, `api.response_time_ms`. fileciteturn0file24

---

**Related docs**: Enterprise AI Blueprint (CAG, Policy Router, budgets), Monetisation & Commercial Policy (plans/PSU), API Governance (metrics & rules), Threat Model (rate limits/abuse), AI Cookbook (cost logging), Engineering Playbook (observability & resilience), Dev Standards (caching/perf). fileciteturn0file28 fileciteturn0file29 fileciteturn0file24 fileciteturn0file25 fileciteturn0file26 fileciteturn0file39 fileciteturn0file36

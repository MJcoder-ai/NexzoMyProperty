---
owner: ai-platform
last_review: 2025-09-22
status: template
tags: ["agents", "registry", "governance", "security", "mlops", "observability"]
references:
  - "../09-governance/Versioning-Policy.md"
  - "../08-security/Threat-Model.md"
  - "../07-ops/Observability-Runbook.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../01-architecture/System-Architecture.md"
  - "../09-governance/API-Governance.md"
---

# Agent Registry (Template & Canonical Contract)

> **Purpose**: Single source of truth for **all AI agents** across products and domains. Use this registry to **declare**, **govern**, **deploy**, and **observe** agents in a multi-tenant, multi-user, multi-domain platform.

## 0) Executive Summary

This document defines the **registry schema**, **governance gates**, **security model**, and **operational SLOs** for every agent. Each agent is onboarded via a **Spec Card** (YAML) that becomes the contract for code generation, tests, deployment, and runtime policy enforcement. The registry is machine-readable and validated in CI/CD.

---

## 1) Agent Registry – High-level Schema

The registry is a versioned YAML file (or DB table) where each **agent** entry is a contract-first specification.

```yaml
# agents/registry.yaml
registry_version: "1.0.0"            # SemVer of the registry schema
generated_at: "YYYY-MM-DD"
owner_team: "ai-platform"
tenancy_mode: "multi-tenant"         # multi-tenant | single-tenant
default_region: "auto"               # auto routes per data residency
agents:                               # List of agent Spec Cards
  - id: price_finder_agent
    version: "1.2.0"
    owner_team: "procurement-platform"
    description: "Supplier price & stock lookup for BOM lines"
    domains: ["ecommerce", "procurement"]
    rbac_scopes: ["read:catalog", "read:stock", "read:price"]
    tool_access:
      - name: SupplierAPI
        scopes: ["read:price", "read:stock"]
        rate_limit: "10/min"
      - name: CacheDB
        scopes: ["read", "write"]
    functions:
      get_prices:
        input_schema_ref: "schemas/price_finder/get_prices.input.json"
        output_schema_ref: "schemas/price_finder/get_prices.output.json"
        timeout_s: 15
        retries: 2
        error_codes: ["E001", "E_RATE_LIMIT", "E_SUPPLIER_DOWN"]
    observability:
      trace_fields: ["agent.id", "agent.version", "tool.name", "latency_ms", "tokens.prompt", "tokens.completion", "cost.usd"]
      metrics_slo:
        latency_p95_ms: 1000
        success_rate: ">= 99%"
        cost_per_tx_usd: "<= 0.01"
    policy:
      autonomy: "guarded"            # none | guarded | allowed
      budget_psu_per_day: 500
      regions: ["US", "EU"]
      data_classification: "restricted"
    lifecycle:
      stage: "beta"                   # experimental | beta | GA | deprecated
      deprecation_date: null
```

> **Validation**: In CI, lint the registry with JSON Schema and Spectral rules. The registry must compile before any deployment.

---

## 2) Spec Card Template (authoritative)

Copy this block for each new agent and fill all required fields.

```yaml
id: <kebab-case-unique-id>
version: "MAJOR.MINOR.PATCH"                  # Semantic Versioning
owner_team: <team-name>
description: >
  One-paragraph description of the agent’s mission, value, and constraints.
domains: ["engineering", "property", "trading", "ecommerce", "project_mgmt", "support", "business_assistant"]
capabilities:
  - <high-level-capability-1>
  - <high-level-capability-2>
required_context:
  # Input contract (JSON Schema or Pydantic model). Avoid over-context.
  project_id: string
  tenant_id: string
  user_id: string
  payload:
    $ref: "schemas/<agent>/payload.input.json"
optional_context:
  locale: string
  region: string
rbac_scopes:
  # Least-privilege scopes enforced by orchestrator + gateway
  - "<domain>:read"
  - "<domain>:write"
  - "tool:execute:<tool-name>"
tool_access:
  - name: "<ToolName>"
    scopes: ["..."]
    rate_limit: "N/min"
    credentials: "injected|none"
functions:
  <function_name>:
    input_schema_ref: "schemas/<agent>/<function>.input.json"
    output_schema_ref: "schemas/<agent>/<function>.output.json"
    timeout_s: 30
    retries: 2
    circuit_breaker: true
    error_codes: ["E_BAD_INPUT","E_TOOL_TIMEOUT","E_PROVIDER_DOWN"]
observability:
  trace_fields:
    - "agent.id"
    - "agent.version"
    - "operation.id"
    - "tool.name"
    - "latency_ms"
    - "tokens.prompt"
    - "tokens.completion"
    - "cost.usd"
  logs:
    pii_scrub: true
    retention_days: 365
  dashboards:
    - "Agent Performance"
    - "Cost & Token Usage"
policy:
  autonomy: "none|guarded|allowed"
  budget_psu_per_day: 100
  max_parallel_tools: 3
  regions: ["auto"]
  data_classification: "public|internal|restricted|confidential"
  handover:
    enabled: true
    allowed_targets: ["<other_agent_id>"]
lifecycle:
  stage: "experimental|beta|GA|deprecated|sunset"
  rollout: "canary|blue-green|big-bang"
  deprecation:
    successor: null
    notice_days: 180
tests:
  unit: "tests/unit/<agent>/*.py"
  integration: "tests/it/<agent>/*.py"
  evals: "tests/eval/<agent>/*.py"
  golden_samples: "examples/golden/<agent>/*.json"
security:
  threat_model: "stride:link"
  signatures: "artifact-signing-enabled"
  model_access: "rbac-gated"
  data_residency: ["US","EU"]
  secrets: ["SUPPLIER_API_KEY", "CACHE_URL"]
```

---

## 3) Governance Gates (what must pass before deploy)

1. **Contract review**: Spec Card + JSON Schemas approved.
2. **Security review**: Threats mapped; scopes least-privilege; no eval/exec of LLM outputs; secrets injected at runtime.
3. **Eval suite**: Golden samples pass; regressions < threshold; bias guards on if applicable.
4. **SLOs**: p95 latency, success rate, and cost budgets configured with alerting.
5. **Versioning**: SemVer bump rules applied; migration notes written.
6. **Docs**: Model Card (if applicable), Tool Specs, and user-facing notes updated.

> All gates are enforced by CI/CD. Deployments that fail gates are blocked.

---

## 4) Operational SLOs (defaults)

| KPI | Target | Alert | Notes |
|-----|--------|-------|------|
| **Latency p95** | ≤ 1000 ms | 1500 ms | End-to-end, including tools |
| **Success rate** | ≥ 99% | < 98% | Excludes client errors |
| **Cost/tx** | ≤ $0.01 | > $0.02 | Includes tokens + tools |
| **Token usage** | ≤ 3k | > 5k | Prompt + completion |
| **Error budget** | 1% | n/a | Tied to incident policy |

---

## 5) Handover & Multi-agent Coordination

- Agents exchange context via a **shared scratchpad** and **plan cards**.
- All handovers are logged with timestamp, from→to, and minimal context.
- Orchestrator enforces **handover allowlists** defined in each Spec Card.

```yaml
handover:
  enabled: true
  allowed_targets: ["design_engineer_agent","sourcing_agent"]
```

---

## 6) Security & Privacy Requirements (must-have)

- **RBAC**: Every function requires scopes; tenant & user are always part of context.
- **No dynamic code execution** from model outputs; only call **declared tools**.
- **PII scrubbing** before logging; redact secrets; classify outputs.
- **Rate limits** per agent and per tool; circuit breakers on external dependencies.
- **Artifact signing** for models and tools; verify hashes on load.

---

## 7) Observability – Tracing & Metrics

- Emit OpenTelemetry traces with fields from `observability.trace_fields`.
- Logs must include `trace_id` and `agent.id` for joinability.
- Dashboards: **Agent Performance**, **Cost/Token**, **Tool Health**.
- Required headers (gateway): `X-Request-ID`, `X-Correlation-ID`.

---

## 8) Examples (cross-domain)

### 8.1 Engineering Design – `design_engineer_agent`

```yaml
id: design_engineer_agent
version: "1.0.0"
owner_team: "engineering"
description: "Validates and proposes JSON-Patch changes against project models."
domains: ["engineering","project_mgmt"]
capabilities: ["schema_validate","auto_layout","wire_check","code_check"]
required_context:
  project_id: string
  tenant_id: string
  user_id: string
  payload: { "$ref": "schemas/design_engineer/payload.input.json" }
rbac_scopes: ["design:read","design:propose","design:approve?"]
tool_access:
  - name: "SchemaValidator"
    scopes: ["execute"]
  - name: "WiringChecker"
    scopes: ["execute"]
functions:
  propose_patch:
    input_schema_ref: "schemas/design_engineer/propose.input.json"
    output_schema_ref: "schemas/design_engineer/propose.output.json"
    timeout_s: 30
    retries: 1
observability:
  trace_fields: ["agent.id","operation.id","latency_ms","cost.usd"]
policy:
  autonomy: "guarded"
  budget_psu_per_day: 200
  data_classification: "restricted"
lifecycle: { stage: "beta" }
```

### 8.2 Procurement – `price_finder_agent`

```yaml
id: price_finder_agent
version: "1.2.0"
owner_team: "procurement"
description: "Fetch real-time prices & lead-times across approved suppliers."
domains: ["ecommerce","procurement"]
capabilities: ["price_lookup","availability_check","supplier_comparison"]
required_context:
  tenant_id: string
  bom_lines: array
rbac_scopes: ["read:catalog","read:price"]
tool_access:
  - name: "SupplierAPI"   # external
    scopes: ["read:price","read:stock"]
    rate_limit: "10/min"
  - name: "CacheDB"       # internal cache
    scopes: ["read","write"]
functions:
  get_prices:
    input_schema_ref: "schemas/price_finder/get_prices.input.json"
    output_schema_ref: "schemas/price_finder/get_prices.output.json"
    timeout_s: 15
    retries: 2
observability: { trace_fields: ["agent.id","tool.name","latency_ms"] }
policy: { autonomy: "guarded", budget_psu_per_day: 500 }
lifecycle: { stage: "GA" }
```

### 8.3 Customer Support – `support_triage_agent`

```yaml
id: support_triage_agent
version: "0.5.0"
owner_team: "support"
description: "Classifies support requests, suggests replies, routes to queues."
domains: ["support","business_assistant"]
capabilities: ["classify_intent","suggest_reply","route_ticket"]
required_context: { tenant_id: string, ticket: object }
rbac_scopes: ["support:read","support:route"]
tool_access:
  - name: "HelpdeskAPI"
    scopes: ["read","write"]
functions:
  triage: { input_schema_ref: "schemas/support/triage.input.json", output_schema_ref: "schemas/support/triage.output.json", timeout_s: 10 }
policy: { autonomy: "none" }
lifecycle: { stage: "experimental" }
```

### 8.4 Trading – `signal_generator_agent`

```yaml
id: signal_generator_agent
version: "0.1.0"
owner_team: "trading"
description: "Generates risk-scored trading signals (paper-trade only by default)."
domains: ["trading"]
capabilities: ["feature_extract","signal_score","explainability"]
required_context: { tenant_id: string, market: string, symbols: array }
rbac_scopes: ["markets:read"]
tool_access:
  - name: "MarketDataAPI"
    scopes: ["read:quotes"]
functions:
  generate:
    input_schema_ref: "schemas/trading/generate.input.json"
    output_schema_ref: "schemas/trading/generate.output.json"
    timeout_s: 5
policy: { autonomy: "none", regions: ["US","EU"] }
lifecycle: { stage: "beta" }
```

---

## 9) Registry Operations

### 9.1 Folder Layout (recommended)

```
docs/10-agents/
  Agent-Registry.md            # this file
  registry.yaml                # machine-readable registry
  schemas/                     # per-agent JSON Schemas
    <agent>/*.json
  playbooks/                   # runbooks per agent (optional)
```

### 9.2 CI Checks

- Lint Spec Cards & `registry.yaml` with JSON Schema + Spectral.
- Validate RBAC scopes exist in platform policy.
- Verify referenced tools exist and pass Tool Specs lint.
- Run eval suite and enforce thresholds.
- Enforce SemVer and deprecation policy.

### 9.3 Deprecation Flow

- Announce with headers & notices.
- Provide migration guides and successor agents.
- Sunset after grace period; remove after archival.

---

## 10) Authoring Notes

- Keep **context minimal** and **schemas strict**.
- Prefer **deterministic tools** over free text; validate all tool args.
- Log everything (sanitized), including cost and trace IDs.
- Use **guarded autonomy** for most agents; escalate to human when uncertain.
- Cross-link Model Cards, Prompts, and Tool Specs for full traceability.

---
owner: ai-governance
last_review: 2025-09-22
status: template
version: "1.0.0"
audience: ["platform-team", "security", "ml-engineering", "product", "frontend", "devops"]
references:
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
  - "../09-governance/ADR/ADR-0000-template.md"
  - "../08-security/Security-Guidelines.md"
  - "../08-security/Threat-Model.md"
  - "../07-ops/Observability-Runbook.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../06-ml-ai/Model-Card.md"
  - "../06-ml-ai/Prompt-Library.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../01-architecture/System-Architecture.md"
  - "../04-data/Data-Governance.md"
  - "../04-data/DPIA.md"
---

# Guardrails Policy for AI Agents (Multi‑Tenant • Multi‑User • Multi‑Domain)

> **Purpose.** Define the **non‑negotiable safety, privacy, and governance controls** for all AI agents, tools, prompts, and models across the platform. This policy operationalizes our reference architecture (Planner/Router, Tool Registry, JSON‑Patch contract, Graph‑RAG grounding, RBAC phase‑gates) and codifies how autonomy is granted, measured, and revoked. fileciteturn0file28

---

## 0) Executive Summary (Read First)

- **Guarded Autonomy** — Agents may plan and act **only** within RBAC scopes and phase‑gates; all writes occur via **JSON‑Patch** with dry‑run, diff, and **inverse‑patch** rollback. Critical merges require multi‑party signatures with audit reasons. fileciteturn0file28
- **Ground‑Before‑Generate** — Retrieval/Graph‑RAG evidence precedes generation; tools do verification; models must cite evidence in outputs and expose a Planner Trace for users. fileciteturn0file28
- **Least‑Privilege Tooling** — Every tool is declared in a registry with typed I/O, **side_effects**, and **rbac_scope**; **no eval()**, arguments validated before execution; per‑tool rate limits and timeouts. fileciteturn0file25 fileciteturn0file38
- **Versioned Everything** — APIs, models, prompts, schemas, and tools follow SemVer; breaking changes gated by a deprecation timeline; exceptions require an **ADR**. fileciteturn0file22 fileciteturn0file21
- **Observability & Evals** — Log **model_id/version**, tokens, latency, cost, cache hits; run pre‑release eval suites; enforce SLOs; display Planner Trace UI to users. fileciteturn0file23 fileciteturn0file28
- **Threat‑Model‑Driven Security** — STRIDE + AI‑specific controls (prompt‑injection, model extraction, poisoning, DP) with quarterly reviews and pen‑tests. fileciteturn0file24

---

## 1) Scope & Definitions

- **Agent**: A bounded service that plans/acts via tool calls under policy. **Examples**: DesignEngineerAgent, SalesAdvisorAgent. fileciteturn0file28 fileciteturn0file37  
- **Tool**: Deterministic function with declared JSON Schema I/O, rate‑limits, and side‑effect classification. fileciteturn0file25 fileciteturn0file38  
- **Action**: A tool invocation or a JSON‑Patch mutation proposal. All mutations occur against the **ODL‑SD** SSOT. fileciteturn0file33 fileciteturn0file28  
- **Tenant & Roles**: Multi‑tenant isolation with role‑based rights codes (**R/W/P/A/X/S**), scope inheritance, and phase‑gates. fileciteturn0file31  
- **PSU**: Premium Simulation Unit—budgeted heavy compute used by the **Policy Router** for cost guardrails. fileciteturn0file28 fileciteturn0file29

---

## 2) Policy Pillars

### 2.1 Identity, Access & Phase‑Gates

1. **Least‑Privilege by Default**: Agents are issued **scoped service identities**; access is limited to declared tools and project scopes. Rights codes: `R|W|P|A|X|S`. fileciteturn0file31  
2. **Phase‑Aware Write Locks**: Section writes are locked per lifecycle phase (e.g., libraries locked post‑commissioning); overrides require a **Change Request** with approver roles. fileciteturn0file31  
3. **Mandatory MFA** for sensitive roles; session join via QR/code is recorded and appended to **audit[]**. fileciteturn0file31  
4. **Human‑in‑the‑Loop Gates** (HITL): `publish_design`, `merge_change_request`, `award_po`, `escrow_release`, `decommission` require approver sign‑off. fileciteturn0file31 fileciteturn0file29

### 2.2 Data & Privacy

- **Single Source of Truth**: ODL‑SD document governs; **all** writes via JSON‑Patch with atomic transactions, dry‑run, evidence URIs, and rollback. fileciteturn0file28 fileciteturn0file33  
- **Data Classification & Residency**: `public|internal|restricted|confidential`; **RegionRouter** enforces US/EU/APAC locality for models/storage. fileciteturn0file28  
- **PII & Media Governance**: Memory writes scrub PII; field media redaction and evidence capture policies enforced. fileciteturn0file28 fileciteturn0file34  
- **Cache‑Accuracy Guardrails (CAG)**: Cache with TTL and drift detection; automatic invalidation on version changes. fileciteturn0file28

### 2.3 Tooling & Execution Safety

- **Registry‑Only Tools**: Tools must exist in a **Tool Registry** with `{name, semver, inputs, outputs, side_effects, rbac_scope}`; arguments validated before execution; **never** execute model‑generated code. fileciteturn0file25 fileciteturn0file38  
- **Side‑Effect Classes**: `none|read|write|network|finance|personnel|destructive`. Destructive/finance tools always HITL. fileciteturn0file38  
- **Limits**: Per‑tool rate limits, timeouts, concurrency caps, and **idempotency keys** for POST‑like actions. fileciteturn0file23  
- **Audit Trails**: Log request/response, trace IDs, cost, and output hashes; attach to **audit[]**. fileciteturn0file23 fileciteturn0file28

### 2.4 Prompts, Models & Versions

- **Structured I/O**: Agents must enforce **Pydantic/JSON Schema** contracts; validation + self‑correction loops; structured responses only. fileciteturn0file25  
- **Model Selection & Fallback**: Abstraction layer with retries/backoff and secondary providers; configuration externalized. fileciteturn0file25  
- **Prompt & Model Versioning**: Use SemVer with deprecation timelines and migration guides; publish changes in registry; **headers** or metadata must return active versions. fileciteturn0file22  
- **Cost Budgets**: Per‑agent PSU budgets and per‑org cost ceilings enforced by Policy Router. fileciteturn0file28 fileciteturn0file29

### 2.5 Security & Threat Model Alignment

- **STRIDE Coverage + AI Threats**: Spoofing, tampering, repudiation, info disclosure, DoS, privilege escalation—plus prompt injection, model extraction, inversion, poisoning. Controls: MFA, WAF, JWT validation, schema enforcement, DP, watermarking, rate limits. fileciteturn0file24  
- **Quarterly Reviews & Pen‑Tests**; drift and anomaly monitoring on model outputs; model signing and verification on load. fileciteturn0file24

### 2.6 Observability, SLAs & Evaluations

- **Required Telemetry**: `api.version`, `operation_id`, status code, **model_id**, **model_version**, `latency_ms (p50/p95/p99)`, **token_usage**, **confidence**, error types; OpenTelemetry traces. fileciteturn0file23  
- **SLOs**: ≥99.95% availability; p99 latency targets; error budgets; cost dashboards. fileciteturn0file23  
- **Planner Trace UI**: Users see **Intent → Plan → Action & Evidence → Diff → Approvals**. fileciteturn0file28  
- **Eval Gates**: Pre‑GA eval suite per agent (accuracy, bias, safety, cost); canary deploys with automatic rollback triggers. fileciteturn0file22 fileciteturn0file38

### 2.7 Commercial & User Trust

- **Plan Quotas & Fair‑Use**: Free/Pro/Enterprise plans govern rate limits and PSU budgets; abuse → rate‑limit → suspend with appeal path. **Right‑to‑Switch** preserved. fileciteturn0file29  
- **Escrow & Payout Triggers**: Financial actions tied to governance events (e.g., commissioning QR) and audited webhooks. fileciteturn0file29

### 2.8 UX Guardrails

- **Explainability by Design**: Show reasons, evidence links, and diffs; role/phase‑aware locks must explain **why**. fileciteturn0file34 fileciteturn0file39  
- **Accessibility & Mobile/Offline**: WCAG‑AA, keyboard‑first; offline queues with safe sync. fileciteturn0file30  
- **Voice & Tone**: Friendly, clear, proactive—Echo style; emoji sparingly. fileciteturn0file40

---

## 3) Enforcement & Implementation

### 3.1 Policy Router (YAML)

```yaml
# policy-router.yaml
agents:
  design_engineer:
    max_autonomy: plan_and_act   # plan_only | plan_and_act | read_only
    rbac_scope: ["design_read","design_write","simulation_run"]
    residency: "EU"              # RegionRouter
    budgets:
      psu_daily: 500
      tokens_daily: 5_000_000
    tool_allowlist:
      - schema_validate
      - wire_check
      - auto_layout
      - tariff_model
    tool_denylist:
      - escrow_release           # finance/destructive => HITL
      - merge_change_request     # approver-only
    hitl_required:
      - publish_design
      - merge_change_request
      - award_po
    rate_limits:
      default_rpm: 60
      write_rpm: 20
    logging:
      capture: [model_id, model_version, tokens, cost, latency_ms, evidence_ids]
```

**Notes:** Residency + budgets reflect **RegionRouter** and PSU controls; destructive/finance tools require HITL. fileciteturn0file28 fileciteturn0file29

### 3.2 Tool Registry Contract (excerpt)

```yaml
# tools/registry/auto_layout.yaml
name: "auto_layout"
version: "1.4.2"
description: "Automatic component placement and routing"
inputs_schema: "$ref: ./schemas/auto_layout.input.json"
outputs_schema: "$ref: ./schemas/auto_layout.output.json"
side_effects: "write"
rbac_scope: ["design_write"]
sla:
  p99_latency_ms: 2000
  error_budget_pct: 1.0
security:
  rate_limit_rpm: 60
  timeout_ms: 15000
  input_validation: true
  output_validation: true
observability:
  log_fields: ["trace_id","model_id","model_version","tokens","cost"]
```

**Rules**: No registry entry → tool not callable; invalid args → blocked; side_effects govern HITL routes. fileciteturn0file25 fileciteturn0file38

### 3.3 JSON‑Patch Safe‑Write (server)

```python
def apply_patch_with_guardrails(patch, doc, user, tool_metadata):
    # 1) RBAC + phase-gate
    guard_patch(user.roles, patch)                       # denies if section locked
    # 2) Dry-run + diff
    diff = compute_diff(doc, patch)                      # presented in UI
    # 3) Evidence requirement for media-driven changes
    assert 'evidence' in patch.meta                      # URIs to proofs
    # 4) Approvals if needed
    if patch.touches_critical_sections():
        require_approvals(patch, approver_roles=['expert','pm','compliance'])
    # 5) Apply atomically with inverse-patch stored
    with transaction():
        new_doc = apply_patch(doc, patch)
        inv = generate_inverse_patch(doc, new_doc)
        audit.append({...,'inverse': inv})
        return new_doc
```

Implements JSON‑Patch, approvals, inverse‑patch storage, and audited evidence. fileciteturn0file28

### 3.4 Required Telemetry & Dashboards

- **Metrics:** p50/p99 latency, error rate, availability, request rate, **token usage**, **model id/version**, **confidence**; distributed tracing headers and span attributes. fileciteturn0file23  
- **Dashboards:** API Performance, AI Cost Tracking, Error budgets, Drift/Anomaly watchers. Alerts fire on SLO violations and drift triggers. fileciteturn0file23 fileciteturn0file24

---

## 4) Policy Gates (What is Blocked vs Allowed)

| Category | Allowed (auto) | Allowed (with HITL) | Blocked |
|---|---|---|---|
| **Design Writes** | Schema‑valid JSON‑Patch within role scope | Publish baseline; merge change | Direct DB writes; patch >100 ops |
| **Finance/Commercial** | Price simulations within budget | **Award PO**, **Escrow release** | Unapproved payouts |
| **Ops/Field** | Work orders, non‑destructive checks | Commissioning start/stop | Unsafe actions without permits |
| **Data** | Read non‑restricted; cache reads | Access restricted data with approvals | Cross‑tenant reads |
| **AI** | Read‑only inference, summarization | Model swap within major version | Unversioned prompts/models |

Grounding and evidence required for any user‑visible claim; ungrounded outputs must be flagged. fileciteturn0file28

---

## 5) Release, Versioning & Exceptions

- **SemVer** across APIs/models/prompts/tools; publish migration guides; headers expose active version; deprecation headers + sunset timelines. fileciteturn0file22 fileciteturn0file23  
- **Exception Process**: Document via **ADR** → Board approval → Time‑boxed entry in governance config → Remediation plan. fileciteturn0file23 fileciteturn0file21

---

## 6) Evals & Red‑Team

- **Pre‑GA**: Contract adherence, accuracy, bias, safety, cost, latency, drift stability. **Canary** with rollback triggers (accuracy drop >5%, latency >50%, error rate >1%). fileciteturn0file22  
- **AI‑Specific Red‑Team**: Prompt injection/jailbreak suites; model extraction tests; membership inference where applicable. fileciteturn0file24

---

## 7) UI Requirements (Transparency & Accessibility)

- **Planner Trace UI** showing Plan/Evidence/Diff/Approvals; **Explainability** chips; role/phase reasons for locks; JSON‑Patch diff viewer in approvals. fileciteturn0file28 fileciteturn0file34  
- **Layout & Responsiveness** follow platform UI spec (grid, chat timeline, borders, responsive breakpoints). fileciteturn0file39  
- **Tone**: Follow **Echo** voice (clear, encouraging, minimal jargon). fileciteturn0file40

---

## 8) Operational Playbooks (Linkage)

- **Incident Response**: Follow security incident and model regression playbooks; isolate tenants; rotate keys; publish post‑mortem. fileciteturn0file24  
- **Performance**: Apply CAG, caching, rate limits, compression; monitor slow queries; prevent N+1; autoscale. fileciteturn0file44 fileciteturn0file36  
- **Client Drift**: Enforce OpenAPI client generation CI; block deploy on contract mismatch. fileciteturn0file44 fileciteturn0file36

---

## 9) Appendix A — Agent Autonomy Tiers

| Tier | Description | Example |
|---|---|---|
| **T0 Read‑Only** | Inference + retrieval only | KnowledgeManagementAgent |
| **T1 Plan‑Only** | Plans and proposes patches; no tool side‑effects | PlanningAgent |
| **T2 Plan+Act (Safe)** | Executes non‑destructive tools; writes with auto‑revert | DesignEngineerAgent |
| **T3 Hybrid (HITL)** | May trigger finance/destructive tools with human approval | SalesAdvisorAgent |
| **T4 Admin** | Limited to governance tasks; always HITL | Approver roles |

Definitions align with current and roadmap agents. fileciteturn0file37

---

## 10) Appendix B — Compliance & Legal Highlights

- GDPR/CCPA compliance with residency controls; **AI liability** disclaimers; DMCA takedown; **Right‑to‑Switch**; audit retention. fileciteturn0file29

---

**This policy is mandatory.** Any deviation requires an ADR and explicit approval from Security + Architecture boards before deployment. fileciteturn0file21

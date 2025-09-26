---
owner: data-team
last_review: 2025-09-21
status: template
tags: ["data-governance", "multi-tenant", "odl-sd", "ai", "privacy", "security"]
references:
  - "../04-data/Database-Design.md"
  - "../04-data/DPIA.md"
  - "../08-security/Security-Guidelines.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/Versioning-Policy.md"
  - "../09-governance/API-Governance.md"
  - "../01-architecture/System-Architecture.md"
  - "../06-ml-ai/Model-Card.md"
  - "../06-ml-ai/Prompt-Library.md"
  - "../06-ml-ai/Tool-Specs.md"
  - "../06-ml-ai/Eval-Plan.md"
---

# Data Governance

> **Purpose.** Define the policies, ownership, controls, and “policy‑as‑code” that govern **all data assets** in this platform—product documents (ODL‑SD), operational/telemetry, commerce/finance, AI artifacts (prompts, model inputs/outputs, memory), and observability logs—across **multi‑tenant, multi‑user, multi‑domain** deployments.

## 1) Executive Summary

- **Single Source of Truth (SSOT):** The **ODL‑SD** document is the canonical system record. All machine writes use **JSON‑Patch** with validation and audit.  
- **Governed Autonomy:** Role‑based access (RBAC) + phase gates; human approvals for sensitive changes; full audit & SIEM integration.  
- **Contract‑first:** Every data set is bound to a versioned **JSON Schema** and a **data catalog entry**. Breaking changes follow SemVer with deprecation windows.  
- **Privacy & Residency:** PII is minimized, auto‑redacted on ingestion and output; region routing enforces residency; exports follow the Right‑to‑Switch.  
- **Policy as Code:** Compliance is enforced via configs, linters, CI checks, and database policies (RLS).

## 2) Scope & Data Map

| Domain | Examples | Primary Store | Sensitivity (default) |
|---|---|---|---|
| **Design docs (ODL‑SD)** | hierarchy, instances, connections, finance, compliance | Postgres (JSONB) + object storage | restricted |
| **Operational data** | commissioning results, telemetry summaries, EPCIS events | Postgres/Time‑series store | restricted |
| **Commerce** | subscriptions, orders, payouts, escrow events | Postgres | confidential |
| **AI artifacts** | prompts, tool I/O, evals, memory summaries | Registry + object storage | internal/restricted |
| **Observability** | traces, metrics, logs, costs | Observability stack | internal |

> See “Related” section for templates that bind to these assets (Model Card, Prompt Library, Tool Specs, Eval Plan).

## 3) Ownership & Stewardship

Each data domain has a **Data Owner** (accountable), **Steward** (operational), and **Custodian** (platform).

```yaml
ownership_matrix:
  design_docs:   { owner: "architecture", steward: "data", custodian: "platform" }
  operations:    { owner: "operations",   steward: "data", custodian: "platform" }
  commerce:      { owner: "finance",      steward: "platform", custodian: "platform" }
  ai_artifacts:  { owner: "ml-team",      steward: "ml-team", custodian: "platform" }
  observability: { owner: "platform",     steward: "platform", custodian: "platform" }
```

## 4) Data Classification & Handling

> **Levels:** `public | internal | restricted | confidential`

### 4.1 Default mapping by ODL‑SD section

```yaml
classification_defaults:
  libraries:        internal
  requirements:     internal
  instances:        restricted
  connections:      restricted
  physical:         internal
  structures:       internal
  analysis:         internal
  compliance:       restricted
  finance:          restricted
  operations:       restricted
  esg:              internal
  governance:       confidential
  audit:            confidential
  external_models:  internal
```

### 4.2 Handling rules (baseline)

```yaml
handling_rules:
  public:
    residency: "any"
    retention_days: 0
    encryption_at_rest: true
    sharing: ["anonymous_read"]
  internal:
    residency: "region-default"
    retention_days: 365
    encryption_at_rest: true
    pii_allowed: false
  restricted:
    residency: "tenant-region"
    retention_days: 1825    # 5 years (adjust per DPIA)
    encryption_at_rest: true
    encryption_in_transit: true
    pii_allowed: true
    output_redaction: "on"
  confidential:
    residency: "tenant-region"
    retention_days: 2555    # 7 years (adjust per policy/law)
    key_rotation_days: 90
    dual_control_exports: true
    siem_required: true
```

> Adjust retention per jurisdictional policy and DPIA.

## 5) Access Control & Multi‑Tenancy

- **RBAC + Rights Codes:** `R` (read), `W` (write), `P` (propose), `A` (approve), `X` (execute), `S` (support).  
- **Scope inheritance:** Permissions granted at any hierarchy node propagate downward unless overridden.  
- **Phase gates:** Sections lock or require approvals as the lifecycle advances.

**Postgres Row‑Level Security (RLS) — example:**

```sql
ALTER TABLE odl_sd_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON odl_sd_docs
USING (tenant_id = current_setting('app.tenant_id')::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

## 6) Contracts, Versioning & Change Control

- **Schemas:** All datasets use **JSON Schema 2020‑12**.  
- **SemVer:** MAJOR = breaking (migration required); MINOR = additive; PATCH = fixes.  
- **Deprecation:** Announce → migrate (6–12 mo) → sunset → removal.  
- **ODL‑SD writes:** **JSON‑Patch only**, applied atomically with optimistic concurrency; inverse patch generated for rollback.

### 6.1 Data Contract header (required)

```yaml
data_contract:
  name: odl_sd_document
  schema_id: "https://odl-sd.org/schemas/v4.1/document.json"
  version: "4.1.0"
  owner: "architecture"
  classification: "restricted"
  pii: ["emails", "names"]         # if applicable
  change_policy: "semver"
```

## 7) Data Quality (DQ) & SLOs

Define quality SLOs and measure them continuously.

```yaml
dq_slos:
  completeness_pct:   ">= 99.5"
  schema_validity:    "100%"
  timeliness_lag_s:   "<= 60"
  duplicate_rate_pct: "<= 0.5"
  lineage_coverage:   "100% assets in catalog"
```

**Validation gates:** pre‑commit schema lint, CI contract tests, pre‑deploy can‑i‑migrate, and runtime health signals (p95 ingest latency, error budgets).

## 8) Lineage, Catalog & Discoverability

Register every asset in the **data catalog**.

```yaml
data_catalog_entry:
  name: "odl_sd_documents"
  dataset: "postgres.public.odl_sd_docs"
  schema_version: "4.1"
  owner: "architecture"
  status: "GA"
  classification: "restricted"
  documentation: "../01-architecture/System-Architecture.md"
  lineage: ["ingest.webhooks -> services/api -> packages/py/odl_sd_patch"]
  contacts: ["data@company.example"]
```

## 9) Privacy, DPIA & Residency

- **Minimize & Mask:** Collect only necessary fields. Auto‑mask PII in logs, prompts, memory, and media.  
- **Residency & Routing:** Route data and model calls to region of record; segregate storage by tenant & region.  
- **Data Subject Rights:** Export, deletion, and access requests are fulfilled via governed jobs.  
- **Right‑to‑Switch:** Exports provide a complete baseline and provenance for managed projects.  

## 10) AI‑Specific Governance

- **Prompts/Tools:** Treat prompts and tool specs as versioned artifacts with SemVer and migration notes.  
- **Model I/O:** Log model, version, tokens, cost, latency, and a trace ID; validate responses against schemas; redact sensitive output.  
- **Drift & Rollback:** Monitor accuracy, latency, error rate; rollback on thresholds (blue‑green).  
- **Memory:** Externalized (e.g., Redis/Postgres), token‑aware summarization, with PII scrubbers before writes.

## 11) Audit, Observability & Incident Hooks

- Append‑only audit of changes (who/what/when/why), including tool evidence and JSON‑Patch diffs.  
- Emit structured traces/metrics to observability stack; tag with `tenant_id`, `trace_id`, `doc_version`, `model_id`.  
- Security events routed to SIEM; governance playbooks define responders and evidence capture.

## 12) Retention & Disposal

Retention policies are **classification‑ and asset‑specific**; disposal jobs are idempotent, auditable, and reversible until a signed cutoff.

```yaml
retention_policies:
  odl_sd_documents:  { class: restricted, keep_for_days: 1825, legal_hold: "supported" }
  commerce_ledgers:  { class: confidential, keep_for_days: 2555, legal_hold: "supported" }
  ai_prompts:        { class: internal,    keep_for_days: 730,  purge_on_deprecate: true }
  observability:     { class: internal,    keep_for_days: 30,   aggregate_after_days: 7 }
```

## 13) Governance as Code (enforcement examples)

### 13.1 Schema linter (ODL‑SD)

```yaml
rules:
  odl-sd-schema-version:
    given: $.schema_version
    then:
      function: pattern
      functionOptions: { match: "^4\.1(\.|$)" }
    severity: error
  classification-required:
    given: $.audit[*].classification
    then: { function: truthy }
    severity: warn
  require-governance-signatures:
    given: $.governance.signatures
    then: { function: truthy }
    severity: error
```

### 13.2 CI checks (pseudo)

```bash
jsonschema -i example.json https://odl-sd.org/schemas/v4.1/document.json
odl-sd-lint --rules rules.yaml --fail-on=error
can-i-migrate --from 4.1.0 --to 4.2.0
```

## 14) Checklists

**Authoring checklist**

- [ ] Data Owner & Steward named in front‑matter  
- [ ] Data contract header completed (schema, version, classification)  
- [ ] Catalog entry created/updated  
- [ ] DPIA risks addressed; residency set  
- [ ] RBAC/phase‑gate rules mapped  
- [ ] DQ SLOs defined & monitored  
- [ ] Retention policy defined & scheduled jobs configured  
- [ ] Audit & SIEM hooks verified

**Review gate (go/no‑go)**

- [ ] No breaking change without MAJOR bump & migration guide  
- [ ] Tenant isolation verified (RLS + tests)  
- [ ] Exports tested (Right‑to‑Switch)  
- [ ] Incident hooks & playbooks linked

## 15) Related Documents

- **Database‑Design.md** — physical storage, partitioning, indexes, migrations  
- **DPIA.md** — privacy impact analysis & mitigations  
- **Security‑Guidelines.md** — controls (authN/Z, crypto, secrets)  
- **Threat‑Model.md** — STRIDE analysis & mitigations  
- **Versioning‑Policy.md** — SemVer, deprecation & rollback  
- **API‑Governance.md** — governance rules & linters for schemas  
- **Model‑Card.md / Prompt‑Library.md / Tool‑Specs.md / Eval‑Plan.md** — AI governance

---

### Appendix A — Example RLS test (pseudo)

```python
def test_rls_isolation(client, tenant_a_token, tenant_b_token):
    # Tenant A creates a document
    doc_id = client.post("/docs", headers=tenant_a_token, json=valid_doc).json()["id"]
    # Tenant B must not see it
    assert client.get(f"/docs/{doc_id}", headers=tenant_b_token).status_code == 404
```

### Appendix B — Sample JSON‑Patch metadata

```json
{{
  "intent": "update-inverter-rating",
  "tool_version": "wire_check@1.4.2",
  "dry_run": false,
  "evidence": ["s3://bucket/datasheets/inverter.pdf#page=4"]
}}
```

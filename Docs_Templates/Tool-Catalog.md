# Tool Catalog (AI Agents) — Enterprise Template
**Status:** canonical template • **Applies to:** multi-tenant, multi-user, multi-domain platforms • **Last updated:** 2025-09-22

> **Purpose**  
> This catalog defines *how tools are described, versioned, secured, and invoked* so that AI agents can plan→act safely and deterministically across very different platforms (engineering design, trading, e‑commerce, PMO, customer support, business assistant). It is optimized for code‑gen agents: schema‑first, example‑rich, and explicit about side‑effects.

---

## 0) How to use this catalog

1. **Add new tools by spec, not by code.** Create a new entry under `tools/` using the YAML schema in §1. The registry is the source of truth; code is generated or wired from it.  
2. **Bind tools to RBAC scopes and phase gates.** Tools define *what they may touch*; scopes determine *who may invoke them* and under which project phase.  
3. **Prefer deterministic tool outputs.** Tools should return *typed JSON* and (when mutating project data) a **JSON‑Patch** list that the platform validates and applies transactionally.  
4. **Trace, evaluate, budget.** Every tool is observable (latency, error, cost tokens/PSU). Heavier tools declare **PSU cost** and are routed via a **policy router**.
5. **Version everything.** Use SemVer for the tool itself, its input/output schemas, and any external resources (models, prompts).

---

## 1) Tool Spec Schema (authoritative)

Use this YAML to define every tool. Place instances in `docs/10-agents/tools/*.yaml` (or a DB/registry if programmatic).

```yaml
id: rfq_issue                              # globally unique; kebab-case
name: "RFQ Issue"                          # human-friendly
version: "1.3.0"                           # SemVer (MAJOR.MINOR.PATCH)
owner_team: "sourcing"                     # on-call / maintenance
category: "sourcing-logistics"             # see taxonomy §3
summary: >
  Create an RFQ from a BOM selection, invite suppliers, and open for bidding.

stability: "ga"                            # experimental|beta|ga|deprecated|sunset
status: "implemented"                      # implemented|mock|planned

rbac_scope:                                # least privilege; enforced at gateway
  - "procurement:write"
  - "libraries:read"
  - "governance:propose"                   # can open CRs but not merge

side_effects: "write"                      # none|read|write (write => patch required)
psu_cost_estimate: 2                       # Premium Simulation Units (if heavy)
rate_limit: "60/min/user; 200/min/org"     # sliding window or token bucket

contracts:
  input_schema:                            # JSON Schema (2020-12); $id strongly recommended
    $schema: "https://json-schema.org/draft/2020-12/schema"
    $id: "https://example.com/schemas/tools/rfq_issue.input.v1.json"
    type: object
    required: ["project_id", "selection", "suppliers"]
    properties:
      project_id: { type: "string", description: "ULID/UUID of the project" }
      tenant_id:  { type: "string" }
      selection:
        type: object
        description: "Subset of BOM lines or component references"
        properties:
          items:
            type: array
            items:
              type: object
              required: ["component_ref", "qty"]
              properties:
                component_ref: { type: "string", description: "JSON Pointer or ID" }
                qty: { type: "number", minimum: 1 }
      suppliers:
        type: array
        minItems: 1
        items: { type: "string", description: "Supplier IDs" }
      rfq:
        type: object
        properties:
          incoterms: { enum: ["EXW","FOB","CIF","DAP","DDP"] }
          close_at: { type: "string", format: "date-time" }
          notes:    { type: "string", maxLength: 2000 }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    $id: "https://example.com/schemas/tools/rfq_issue.output.v1.json"
    type: object
    required: ["ok","rfq_id"]
    properties:
      ok: { type: "boolean" }
      rfq_id: { type: "string" }
      patch:
        type: "array"
        description: "JSON-Patch ops to update ODL‑SD doc"
        items:
          type: object
          required: ["op","path"]
          properties:
            op:   { enum: ["add","remove","replace","move","copy","test"] }
            path: { type: "string" }
            value: {}
      events:
        type: array
        items:
          type: object
          required: ["name","at"]
          properties:
            name: { enum: ["RFQ_OPENED","SUPPLIERS_INVITED"] }
            at:   { type: "string", format: "date-time" }

implementation:
  language: "python"                        # python|typescript|go|…
  package: "packages/py/odl_sd_tools"      # code location (mono-repo or image)
  entrypoint: "odl_sd_tools.rfq.issue:main"
  retries: 2
  timeout_s: 15
  idempotency_key: "rfq_issue:{project_id}:{hash(selection)}"
  audit_fields: ["project_id","tenant_id","rfq_id"]

security:
  input_validation: "pydantic+jsonschema"
  output_validation: "jsonschema"
  pii_scrub: true
  allow_from_agents: ["sourcing_growth_agent","design_engineer_agent"]
  deny_if_phase: ["operations"]            # example phase gates
  dry_run: true                            # supports dry-run to preview patch

observability:
  trace_fields: ["tool_id","version","tenant_id","project_id"]
  metrics: ["latency_ms","error_rate","token_cost","cache_hit"]
  log_redaction: ["emails","phone","pricing"]

deprecation:
  supersedes: "rfq_issue@1.2.0"
  sunset: "2026-03-31"
  migration_guide: "docs/migrations/tools/rfq_issue_1.2_to_1.3.md"
```

> **Notes**  
> • **SemVer** governs the tool, its schemas, and behavior (breaking changes ⇒ MAJOR).  
> • **side_effects=write** requires returning a **JSON‑Patch** list; the platform applies it atomically with rollback on failure.  
> • **dry_run** is required on any tool that writes; it must produce the same patch without committing.

---

## 2) Governance anchors (what every tool must respect)

- **Versioning & Deprecation** — Tools, schemas, and endpoints use **SemVer**. MAJOR for breaking changes, MINOR for additive, PATCH for fixes. Deprecations must ship headers and migration guides. Support window for a deprecated major version is ≥12 months.  
- **API Governance** — All public tool endpoints pass Spectral rules, expose `operationId`, examples for responses, and carry security & tracing headers.  
- **Security & Threat Model** — Tools must defend against prompt‑injection/poisoning and validate both inputs and model outputs. Tool execution requires least‑privilege scopes and rate limits.  
- **RBAC & Phase Gates** — Scopes map to *actions* (read, write, propose, approve, execute). Mutations after certain lifecycle phases require governance gates.  
- **JSON‑Patch Contract** — All mutations to the ODL‑SD document are expressed as JSON‑Patch and applied transactionally with concurrency/version checks.  
- **Policy Router & PSU Budgets** — Heavy tools declare PSU cost; routing enforces per‑org/per‑agent budgets.

> Cross‑references: Versioning‑Policy, API‑Governance, Threat‑Model, ODL‑SD v4.1, User & Access Structure.

---

## 3) Tool taxonomy (categories)

| Category            | Description                                                       | Examples |
|--------------------|-------------------------------------------------------------------|---------|
| **design-compliance** | Design checks, layout, wiring, safety, code compliance           | `schema_validate`, `auto_layout`, `wire_check`, `code_check`, `sld_generate`, `doc_pack` |
| **finance**        | Baseline models, sensitivities, incentives, pricing               | `baseline_finance`, `tariff_model`, `sensitivity`, `monte_carlo` |
| **sourcing-logistics** | RFQs, bids, POs, shipments, inventory, returns/RMA              | `rfq_issue`, `bid_score`, `award_po`, `waybill_label`, `inventory_update`, `rma_process` |
| **multimodal**     | OCR/vision/audio/doc parsing and QA                               | `parse_datasheet_pdf`, `image_qc`, `nameplate_ocr`, `symbol_extractor` |
| **growth-revenue** | Leads, pricing optimization, upsell, cohort insights              | `x_lead_gen`, `dynamic_pricing_sim`, `cohort_insights`, `referral_scoring` |
| **safety-ops**     | Fault triage, alarms, commissioning, work orders                  | `fault_tree`, `alarm_triage`, `commissioning_runner`, `workorder_generate` |
| **governance**     | Change lifecycle, publishing, merges, exports                     | `change_request_open`, `publish_design`, `merge_change`, `export_package` |

---

## 4) Canonical tool entries (spec + I/O)

Below are fully-specified examples you can **copy‑paste** and tailor. Each conforms to §1 and the governance anchors in §2.

### 4.1 `schema_validate` (design-compliance, read)

```yaml
id: schema_validate
name: "Schema & Integrity Validate"
version: "1.1.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Validate ODL‑SD document against JSON Schemas and integrity rules."
stability: "ga"
status: "implemented"
rbac_scope: ["analysis:execute","documents:read"]
side_effects: "read"
psu_cost_estimate: 0
rate_limit: "200/min/user"

contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    $id: "https://example.com/schemas/tools/schema_validate.input.v1.json"
    type: object
    required: ["project_id","document"]
    properties:
      project_id: { type: "string" }
      document: { type: "object", description: "ODL‑SD v4.1 JSON" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    $id: "https://example.com/schemas/tools/schema_validate.output.v1.json"
    type: object
    required: ["ok","issues"]
    properties:
      ok: { type: "boolean" }
      issues:
        type: array
        items:
          type: object
          required: ["path","severity","message"]
          properties:
            path: { type: "string" }
            severity: { enum: ["info","warning","error"] }
            message: { type: "string" }

implementation:
  language: "python"
  package: "packages/py/odl_sd_tools"
  entrypoint: "odl_sd_tools.validate.schema:main"
  retries: 0
  timeout_s: 10
security:
  input_validation: "jsonschema"
  output_validation: "jsonschema"
observability:
  metrics: ["latency_ms","error_rate"]
```

### 4.2 `auto_layout` (design-compliance, write)

```yaml
id: auto_layout
name: "Auto‑Layout Components"
version: "0.9.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Propose placement and routing given surfaces, keep‑outs, and constraints."
stability: "beta"
status: "implemented"
rbac_scope: ["instances:write","physical:write","governance:propose"]
side_effects: "write"
psu_cost_estimate: 3
rate_limit: "60/min/user"

contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id","constraints"]
    properties:
      project_id: { type: "string" }
      constraints:
        type: object
        properties:
          keepouts: { type: "array", items: { type: "string" } }
          min_clearances_mm: { type: "number", minimum: 0 }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","patch"]
    properties:
      ok: { type: "boolean" }
      patch:
        type: array
        items:
          type: object
          required: ["op","path"]
          properties:
            op: { enum: ["add","replace"] }
            path: { type: "string" }
            value: {}

implementation:
  language: "python"
  package: "packages/py/odl_sd_tools"
  entrypoint: "odl_sd_tools.layout.auto:main"
  retries: 1
  timeout_s: 30
security:
  input_validation: "jsonschema"
  output_validation: "jsonschema"
  dry_run: true
observability:
  metrics: ["latency_ms","token_cost"]
```

### 4.3 `wire_check` (design-compliance, read)

```yaml
id: wire_check
name: "Wiring Check & Voltage Drop"
version: "1.2.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Compute voltage drop, ampacity, and conduit fill; flag violations."
stability: "ga"
status: "implemented"
rbac_scope: ["analysis:execute","documents:read"]
side_effects: "read"
psu_cost_estimate: 1
rate_limit: "120/min/user"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id","document"]
    properties:
      project_id: { type: "string" }
      document: { type: "object" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","report"]
    properties:
      ok: { type: "boolean" }
      report:
        type: object
        properties:
          violations: { type: "array", items: { type: "string" } }
          summary: { type: "string" }
```

### 4.4 `code_check` (design-compliance, read)

```yaml
id: code_check
name: "Code Compliance Check"
version: "1.0.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Run NEC/IEC/IEEE and regional grid‑code checks; emit evidence."
stability: "beta"
status: "implemented"
rbac_scope: ["analysis:execute","compliance:read"]
side_effects: "read"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id","document","jurisdiction"]
    properties:
      project_id: { type: "string" }
      document: { type: "object" }
      jurisdiction: { type: "string" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","evidence"]
    properties:
      ok: { type: "boolean" }
      evidence:
        type: object
        properties:
          rules_passed: { type: "array", items: { type: "string" } }
          rules_failed: { type: "array", items: { type: "string" } }
          attachments: { type: "array", items: { type: "string", format: "uri" } }
```

### 4.5 `sld_generate` (design-compliance, read/write)

```yaml
id: sld_generate
name: "Generate Single‑Line Diagram"
version: "0.7.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Create/refresh SLD artifacts and bind to document."
stability: "beta"
status: "implemented"
rbac_scope: ["analysis:execute","documents:write","governance:propose"]
side_effects: "write"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id"]
    properties:
      project_id: { type: "string" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","patch","artifacts"]
    properties:
      ok: { type: "boolean" }
      patch:
        type: array
        items: { type: "object" }
      artifacts:
        type: array
        description: "URIs to generated SVG/PDF with hashes"
        items:
          type: object
          required: ["kind","uri"]
          properties:
            kind: { enum: ["svg","pdf"] }
            uri:  { type: "string", format: "uri" }
            hash: { type: "string" }
```

### 4.6 `doc_pack` (design-compliance, read)

```yaml
id: doc_pack
name: "Permit Package Builder"
version: "1.0.0"
owner_team: "engineering"
category: "design-compliance"
summary: "Bundle drawings, schedules, and evidence into a permit package."
stability: "ga"
status: "implemented"
rbac_scope: ["documents:read","export:execute"]
side_effects: "read"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id"]
    properties:
      project_id: { type: "string" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","bundle_uri"]
    properties:
      ok: { type: "boolean" }
      bundle_uri: { type: "string", format: "uri" }
```

### 4.7 `baseline_finance` (finance, read)

```yaml
id: baseline_finance
name: "Baseline Finance"
version: "1.1.0"
owner_team: "finance"
category: "finance"
summary: "Compute baseline LCOE/IRR/NPV; generate finance snapshot."
stability: "ga"
status: "implemented"
rbac_scope: ["finance:execute","documents:read"]
side_effects: "read"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id","document"]
    properties:
      project_id: { type: "string" }
      document: { type: "object" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","metrics"]
    properties:
      ok: { type: "boolean" }
      metrics:
        type: object
        properties:
          irr_pct: { type: "number" }
          npv:     { type: "number" }
          lcoe:    { type: "number" }
```

### 4.8 `tariff_model` (finance, read)

```yaml
id: tariff_model
name: "Tariff Model & Incentives"
version: "0.8.0"
owner_team: "finance"
category: "finance"
summary: "Model tariffs and incentives for jurisdiction; output bill deltas."
stability: "beta"
status: "implemented"
rbac_scope: ["finance:execute","documents:read"]
side_effects: "read"
```

### 4.9 `rfq_issue` (sourcing-logistics, write)

*(See §1 for full spec example.)*

### 4.10 `bid_score` (sourcing-logistics, read)

```yaml
id: bid_score
name: "Bid Scoring"
version: "1.0.0"
owner_team: "sourcing"
category: "sourcing-logistics"
summary: "Score supplier bids by price, lead, warranty, ESG, risk."
stability: "ga"
status: "implemented"
rbac_scope: ["procurement:read"]
side_effects: "read"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["rfq_id","weights"]
    properties:
      rfq_id: { type: "string" }
      weights:
        type: object
        properties:
          price:     { type: "number" }
          lead_time: { type: "number" }
          warranty:  { type: "number" }
          esg:       { type: "number" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","ranked_bids"]
    properties:
      ok: { type: "boolean" }
      ranked_bids:
        type: array
        items:
          type: object
          required: ["bid_id","score"]
          properties:
            bid_id: { type: "string" }
            score:  { type: "number" }
```

### 4.11 `award_po` (sourcing-logistics, write)

```yaml
id: award_po
name: "Award Purchase Order"
version: "1.0.0"
owner_team: "sourcing"
category: "sourcing-logistics"
summary: "Create PO from awarded bid; update commercials; emit events."
stability: "ga"
status: "implemented"
rbac_scope: ["procurement:write","finance:read","governance:propose"]
side_effects: "write"
contracts:
  input_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["project_id","bid_id"]
    properties:
      project_id: { type: "string" }
      bid_id: { type: "string" }
  output_schema:
    $schema: "https://json-schema.org/draft/2020-12/schema"
    type: object
    required: ["ok","po_id","patch","events"]
    properties:
      ok: { type: "boolean" }
      po_id: { type: "string" }
      patch: { type: "array" }
      events:
        type: "array"
        items:
          type: "object"
          required: ["name","at"]
          properties:
            name: { enum: ["PO_CREATED","PO_APPROVED"] }
            at:   { type: "string", format: "date-time" }
```

### 4.12 `waybill_label` (sourcing-logistics, read/write)

```yaml
id: waybill_label
name: "Generate Waybill & Label"
version: "0.6.0"
owner_team: "logistics"
category: "sourcing-logistics"
summary: "Create shipment waybill and printable label; register EPCIS event."
stability: "beta"
status: "implemented"
rbac_scope: ["logistics:write","export:execute"]
side_effects: "write"
```

### 4.13 `inventory_update` (sourcing-logistics, write)

```yaml
id: inventory_update
name: "Inventory Update"
version: "1.0.0"
owner_team: "logistics"
category: "sourcing-logistics"
summary: "Record receipts / issues by serial/lot; update stocks and analytics."
stability: "ga"
status: "implemented"
rbac_scope: ["inventory:write"]
side_effects: "write"
```

### 4.14 `commissioning_runner` (safety-ops, read/write)

```yaml
id: commissioning_runner
name: "Commissioning Runner"
version: "0.9.0"
owner_team: "operations"
category: "safety-ops"
summary: "Execute commissioning checklists, capture evidence, update ledger."
stability: "beta"
status: "implemented"
rbac_scope: ["operations:execute","governance:propose"]
side_effects: "write"
```

### 4.15 `change_request_open` / `publish_design` / `merge_change` (governance)

```yaml
id: change_request_open
name: "Open Change Request"
version: "1.0.0"
category: "governance"
rbac_scope: ["governance:propose"]
side_effects: "write"
---
id: publish_design
name: "Publish Design Baseline"
version: "1.0.0"
category: "governance"
rbac_scope: ["governance:approve"]
side_effects: "write"
---
id: merge_change
name: "Merge Approved Change"
version: "1.0.0"
category: "governance"
rbac_scope: ["governance:approve"]
side_effects: "write"
```

> **Tip:** For tools that mutate project data, *always* return a `patch[]` list and support `dry_run=true` to preview changes.

---

## 5) Security & reliability checklist (per tool)

- Input **schema validation** (reject unknown fields; enforce types & ranges)  
- Output **schema validation** (no free‑text surprises)  
- **Rate limits** per user/org and *budget limits* (PSU tokens) per org/agent  
- **Scopes**: deny by default; allow the minimal required; verify **phase gates**  
- **Prompt‑injection & poisoning** guards for any LLM sub-calls (templates + filters)  
- **Idempotency keys** for any external‑facing write operations  
- **Retries** with exponential backoff for transient failures; **timeouts** for I/O  
- **Tracing** (trace_id, span_id) and **auditable logs** (redacted)  
- **Model & artifact signing** (if loading models)  
- **Dry‑run** support for all write tools

---

## 6) Observability & evaluation (what to measure)

| Metric                | Target         | Alert at         |
|----------------------|----------------|------------------|
| Latency p50/p99      | <100ms / <500ms| >200ms / >1000ms |
| Error rate           | <0.1%          | >1%              |
| Availability         | 99.95%         | <99.9%           |
| Token/PSU cost       | n/a            | >80% of budget   |
| Cache hit rate       | >70%           | <40%             |

**Logging**: request/response (sanitized), model id & version, tokens, latency, cost, selected fallback.  
**Evaluation hooks**: unit tests for schemas, contract tests for endpoints, load tests weekly, security tests monthly.

---

## 7) Catalog table (quick index)

> Keep this table auto-generated from the registry in CI.

| id | category | stability | side_effects | rbac_scope |
|----|----------|-----------|--------------|------------|
| schema_validate     | design-compliance | ga   | read  | analysis:execute, documents:read |
| auto_layout         | design-compliance | beta | write | instances:write, physical:write, governance:propose |
| wire_check          | design-compliance | ga   | read  | analysis:execute, documents:read |
| code_check          | design-compliance | beta | read  | analysis:execute, compliance:read |
| sld_generate        | design-compliance | beta | write | analysis:execute, documents:write, governance:propose |
| doc_pack            | design-compliance | ga   | read  | documents:read, export:execute |
| baseline_finance    | finance           | ga   | read  | finance:execute, documents:read |
| tariff_model        | finance           | beta | read  | finance:execute, documents:read |
| rfq_issue           | sourcing-logistics| ga   | write | procurement:write, governance:propose |
| bid_score           | sourcing-logistics| ga   | read  | procurement:read |
| award_po            | sourcing-logistics| ga   | write | procurement:write, finance:read, governance:propose |
| waybill_label       | sourcing-logistics| beta | write | logistics:write, export:execute |
| inventory_update    | sourcing-logistics| ga   | write | inventory:write |
| commissioning_runner| safety-ops       | beta | write | operations:execute, governance:propose |
| change_request_open | governance        | ga   | write | governance:propose |
| publish_design      | governance        | ga   | write | governance:approve |
| merge_change        | governance        | ga   | write | governance:approve |

---

## 8) Implementation patterns & snippets

### 8.1 Safe tool execution (Python)

```python
from pydantic import BaseModel, ValidationError
from tenacity import retry, stop_after_attempt, wait_random_exponential
from typing import Any, Dict
import jsonschema, logging, time, uuid

log = logging.getLogger(__name__)

class Input(BaseModel):
    project_id: str
    tenant_id: str | None = None

class Output(BaseModel):
    ok: bool
    patch: list[dict] | None = None

INPUT_SCHEMA = { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": {"project_id": {"type":"string"}}, "required": ["project_id"] }
OUTPUT_SCHEMA = { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": {"ok": {"type":"boolean"}}, "required": ["ok"] }

@retry(stop=stop_after_attempt(2), wait=wait_random_exponential(min=1, max=8))
def run_tool(payload: Dict[str, Any]) -> Dict[str, Any]:
    trace_id = str(uuid.uuid4())
    t0 = time.perf_counter()
    try:
        jsonschema.validate(payload, INPUT_SCHEMA)
        inp = Input(**payload)  # type check too

        # ... do work ...

        out = { "ok": True, "patch": [] }
        jsonschema.validate(out, OUTPUT_SCHEMA)
        return out
    except ValidationError as ve:
        log.exception("validation_error", extra={"trace_id": trace_id})
        return { "ok": False, "error": "invalid_input", "details": ve.errors() }
    finally:
        log.info("tool_metrics", extra={"trace_id": trace_id, "latency_ms": int((time.perf_counter()-t0)*1000)})
```

### 8.2 JSON‑Patch reminder

All mutations are expressed as RFC‑6902 patches and applied atomically:

```json
[
  { "op": "add", "path": "/libraries/components/0/component_management/status", "value": "approved" },
  { "op": "replace", "path": "/finance/capex/total", "value": 123456.78 }
]
```

---

## 9) Change log

- 1.0.0 — First release of the Tool Catalog template.

---

### Appendix A — Minimal JSON Schema for tool I/O

```json
{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object" }
```

### Appendix B — Mapping tools ↔ agents (example)

- **SourcingGrowthAgent** → `rfq_issue`, `bid_score`, `award_po`, `waybill_label`, `inventory_update`  
- **DesignEngineerAgent** → `schema_validate`, `auto_layout`, `wire_check`, `code_check`, `sld_generate`, `doc_pack`  
- **OpsSustainabilityAgent** → `commissioning_runner`  
- **RevenueOptimizerAgent** → `dynamic_pricing_sim` (future)  

> Keep this mapping in the Agent Registry and sync it with CI when tools change.

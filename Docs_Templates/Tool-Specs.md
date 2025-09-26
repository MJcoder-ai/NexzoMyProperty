---
owner: ml-team
last_review: 2025-09-21
status: template
tags: ["ai-tools", "function-calling", "contracts", "rbac", "json-patch", "odl-sd", "governance"]
references:
  - "../06-ml-ai/Model-Card.md"
  - "../06-ml-ai/Prompt-Library.md"
  - "../06-ml-ai/Eval-Plan.md"
  - "../03-apis/API-Specification.md"
  - "../03-apis/openapi.yaml"
  - "../08-security/Security-Guidelines.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
  - "../09-governance/ADR/ADR-0000-template.md"
  - "../04-data/Data-Governance.md"
  - "../04-data/DPIA.md"
---

# Tool Specifications (Agent Tools & Contracts)

> **Purpose.** This document defines the **contract-first specification** for all AI Agent _tools_ in the platform. Tools are deterministic capabilities that agents may invoke (e.g., _wire_check_, _rfq_issue_, _baseline_finance_, _parse_datasheet_pdf_). Every tool **must be declared**, **typed**, **versioned**, **observable**, and **governed**.

**You are here:** 06‑ml‑ai → Tool‑Specs.md • See also: [Model‑Card](./Model-Card.md), [Prompt‑Library](./Prompt-Library.md), [Eval‑Plan](./Eval-Plan.md).

---

## 1) What is a Tool? (contract-first)

A **Tool** is a _deterministic function_ with a **stable interface** (JSON I/O schemas) that performs a bounded action. Agents _plan_ with LLMs but **act** only via tools. Tools **never** accept free‑form code; arguments are strictly validated against schemas, and outputs are validated before returning to the agent.

**Tenets**

1. **Ground‑Before‑Generate**: Prefer tools that **fetch, validate, compute** over free‑text generation.  
2. **JSON‑Patch for mutations**: Any design/data writes are expressed as **RFC‑6902 JSON‑Patch** and are apply/rollback safe.  
3. **Least privilege & RBAC**: Each tool declares **scopes**; the orchestrator enforces them per tenant/user/agent.  
4. **Versioned & Evaluated**: Semantic versioning, deprecation rules, rollback, and eval gates apply to every tool.  
5. **Observable & Costed**: Traces, metrics (latency, error, token/cost), and cache hints are mandatory.

---

## 2) Tool Spec “Card” (authoritative YAML)

Each tool has one **Spec Card** stored in the tool registry (YAML; machine‑validated in CI). This card is the single source of truth from which SDK stubs, docs, and tests are generated.

```yaml
id: wire_check                                      # unique slug
name: "Wiring & Voltage Drop Check"
version: "1.4.0"                                    # SemVer
owner_team: "engineering"
description: >
  Validates DC/AC conductor sizing, voltage drop, and protection settings
  against ODL‑SD constraints and code rules. Returns violations and JSON‑Patch
  suggestions to remediate.

rbac_scopes:                                        # enforced by orchestrator
  - "design_read"
  - "analysis_execute"
  - "design_propose"                                # allows returning patches with P flag

side_effects: "propose_odl_patch"                   # none | read_only | propose_odl_patch | write_external
idempotency:                                        # idempotency is REQUIRED for writes
  key_strategy: "hash(inputs)"                      # how callers produce idempotency keys
  window: "10m"

rate_limits:
  per_org_per_min: 60
  per_user_per_min: 20

timeouts:
  soft_ms: 5000
  hard_ms: 15000
retries:
  policy: "exponential_backoff"
  max_attempts: 2

inputs_schema:                                      # JSON Schema 2020-12
  type: object
  required: ["document_ref", "paths"]
  properties:
    document_ref:
      type: string
      description: "URI or handle to ODL‑SD document (versioned)"
    paths:
      type: array
      items: { type: string, description: "JSON Pointers to check (e.g. /connections)" }
    options:
      type: object
      properties:
        max_voltage_drop_pct: { type: number, default: 2.0 }
        region_code: { type: string, enum: ["IEEE1547", "NEC", "IEC"] }

outputs_schema:
  type: object
  required: ["violations", "summary"]
  properties:
    violations:
      type: array
      items:
        type: object
        required: ["code", "path", "message", "severity"]
        properties:
          code: { type: string, example: "VDROP_EXCEEDS_LIMIT" }
          path: { type: string }                   # pointer into ODL‑SD
          message: { type: string }
          severity: { type: string, enum: ["info","warn","error"] }
    patch:                                         # JSON‑Patch proposal (optional)
      type: array
      items:
        type: object
        required: ["op","path"]
        properties:
          op: { enum: ["add","remove","replace","move","copy","test"] }
          path: { type: string }
          value: {}
    summary:
      type: object
      properties:
        checked_connections: { type: integer }
        vdrop_exceeded_count: { type: integer }
        protection_issues: { type: integer }

errors:                                            # canonical, machine‑readable
  - code: "INPUT_VALIDATION_FAILED"
    http_status: 400
    retryable: false
  - code: "DOCUMENT_NOT_FOUND"
    http_status: 404
    retryable: false
  - code: "TIMEOUT"
    http_status: 504
    retryable: true

observability:
  otel_span_name: "tool.wire_check"
  attributes:
    - "tool.id"
    - "tool.version"
    - "tenant.id"
    - "org.id"
    - "project.id"
    - "api.version"
    - "cache.hit"
    - "cost.tokens"
    - "cost.currency_minor"

caching:
  mode: "CAG"                                      # Cache‑Answer‑Graph strategy
  key_fields: ["document_ref","paths","options"]
  ttl_seconds: 3600
  invalidations:
    - "on: odlsd.patch_applied"                    # event‑driven cache busting
    - "on: tool.version_change"

psu_cost:                                          # for cost governance & quotas
  estimate: 1.0
  variability: "low"

testing:
  golden_inputs: ["tests/golden/wire_check/input_a.json"]
  expected_outputs: ["tests/golden/wire_check/output_a.json"]
  simulators: ["fast_dc_drop_model@v2"]

deprecation:
  replaced_by: "wire_check@2.x"
  sunset_date: "2026-06-30"
```

> **Why YAML?** Easy to diff/review; CI validates with JSON Schema; generators produce Pydantic/Zod types, stubs, and tests.

---

## 3) I/O Contracts & Code Stubs

Tools **must** ship typed stubs for Python and TypeScript, generated from the Spec Card.

### 3.1 Python (Pydantic + requests)

```python
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional, Literal
import requests

class Violation(BaseModel):
    code: str
    path: str
    message: str
    severity: Literal["info", "warn", "error"]

class WireCheckInput(BaseModel):
    document_ref: str
    paths: List[str]
    options: Optional[dict] = None

class PatchOp(BaseModel):
    op: Literal["add", "remove", "replace", "move", "copy", "test"]
    path: str
    value: Optional[object] = None

class WireCheckOutput(BaseModel):
    violations: List[Violation]
    patch: Optional[List[PatchOp]] = None
    summary: dict

def wire_check_call(payload: WireCheckInput, api_base: str, token: str) -> WireCheckOutput:
    resp = requests.post(f"{api_base}/tools/wire-check:run", json=payload.model_dump(), headers={{
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": payload.model_dump_json()[:64]
    }}, timeout=15)
    resp.raise_for_status()
    return WireCheckOutput.model_validate(resp.json())
```

### 3.2 TypeScript (Zod + fetch)

```ts
import { z } from "zod";

export const PatchOp = z.object({
  op: z.enum(["add","remove","replace","move","copy","test"]),
  path: z.string(),
  value: z.any().optional(),
});

export const Violation = z.object({
  code: z.string(),
  path: z.string(),
  message: z.string(),
  severity: z.enum(["info","warn","error"]),
});

export const WireCheckInput = z.object({
  document_ref: z.string(),
  paths: z.array(z.string()),
  options: z.record(z.any()).optional(),
});

export const WireCheckOutput = z.object({
  violations: z.array(Violation),
  patch: z.array(PatchOp).optional(),
  summary: z.record(z.any()),
});

export type TWireCheckInput = z.infer<typeof WireCheckInput>;
export type TWireCheckOutput = z.infer<typeof WireCheckOutput>;

export async function wireCheckCall(apiBase: string, token: string, payload: TWireCheckInput): Promise<TWireCheckOutput> {{
  const res = await fetch(`${{apiBase}}/tools/wire-check:run`, {{
    method: "POST",
    headers: {{
      "Authorization": `Bearer ${{token}}`,
      "Content-Type": "application/json",
      "Idempotency-Key": JSON.stringify(payload).slice(0, 64)
    }},
    body: JSON.stringify(payload),
  }});
  if (!res.ok) throw new Error(`wire_check failed: ${{res.status}}`);
  const data = await res.json();
  return WireCheckOutput.parse(data);
}}
```

---

## 4) Safety, RBAC & Governance Gates

- **Never eval**: Tools execute curated implementations only—**no** `eval()` or model‑generated code.  
- **RBAC scopes**: Declared in Spec Card; enforced at **API‑Gateway** and per‑tool.  
- **Side effects**:
  - `none` – pure function; output only.  
  - `read_only` – reads external systems; must declare connectors.  
  - `propose_odl_patch` – returns **JSON‑Patch** with `P` (propose) scope only; requires approver merge.  
  - `write_external` – writes to external system; requires ADR + explicit approvals.
- **Approvals**: Any tool returning patches affecting locked sections (phase gates) **requires approver roles** and produces a human‑readable **diff** before merge.
- **PII/Data classes**: Respect data classifications; redact/segment as required.
- **Dry‑run**: All mutating tools must support `{{dry_run:true}}` to produce patches without commit.

---

## 5) Observability & Telemetry (required)

- OpenTelemetry spans per invocation. Required attributes: `tool.id`, `tool.version`, `tenant.id`, `org.id`, `api.version`, `cache.hit`, `duration_ms`, `cost.tokens`, `cost.currency_minor`, `error.type` (if any).  
- Structured logs with `TRACE_ID` and tool‑specific fields.  
- Emit audit events for patch proposals and merges: `tool.invoked`, `tool.patch_proposed`, `tool.patch_applied|rejected`.

---

## 6) Caching, Idempotency & Cost Controls

- **CAG‑first**: Cache prompts/embeddings/tool outputs where safe; invalidations tied to **ODL‑SD** events and **tool version**.  
- **Idempotency**: All mutating endpoints require `Idempotency‑Key` headers.  
- **PSU budgets**: Each tool declares a **psu_cost** estimate; the **Policy Router** enforces per‑org/per‑agent budgets.

---

## 7) Versioning & Deprecation

- **SemVer**: Breaking output/behavior changes → MAJOR; optional field additions → MINOR; bugfixes → PATCH.  
- **Deprecation**: Announce, dual‑run window, deprecation headers/metadata, sunset → removal.  
- **Registry validation**: CI blocks deployment if versioning or lifecycle rules are violated.

---

## 8) Canonical Example Tools

> The following examples are ready to copy‑adapt into Spec Cards.

### 8.1 `parse_datasheet_pdf@1.2.0` (multimodal ingest)

- **Purpose**: Extract structured specs (ports, ratings, dimensions) from PDF/Images; attach hash & evidence.  
- **Scopes**: `libraries_propose`, `analysis_execute`.  
- **Side effects**: `propose_odl_patch` (adds/updates `libraries.components[]`).

**Inputs Schema (excerpt)**

```yaml
type: object
required: ["file_uri","component_hint"]
properties:
  file_uri: { type: string, format: uri }
  component_hint: { type: string, description: "e.g. PV Module, Inverter" }
  parse_options:
    type: object
    properties:
      language: { type: string, default: "en" }
      tables: { type: boolean, default: true }
      images: { type: boolean, default: true }
```

**Outputs Schema (excerpt)**

```yaml
type: object
required: ["extracted","confidence"]
properties:
  extracted: { type: object }                   # typed per component kind
  confidence: { type: number, minimum: 0, maximum: 1 }
  patch:
    type: array                                  # JSON‑Patch to update libraries
```

### 8.2 `rfq_issue@1.0.0` (procurement)

- **Purpose**: Create an RFQ for a BOM slice; invite approved suppliers; publish to marketplace.  
- **Scopes**: `procurement_write`, `supplier_manage`.  
- **Side effects**: `write_external` (marketplace backend) + `propose_odl_patch` (link RFQ id).  
- **Key fields**: `bom_lines[]`, `incoterms`, `due_date`, `attachments[]` (URIs).

### 8.3 `baseline_finance@2.1.0` (economics)

- **Purpose**: Compute baseline CAPEX/OPEX, cash flows, IRR/NPV under tariff & incentives.  
- **Scopes**: `finance_execute`.  
- **Side effects**: `propose_odl_patch` to `finance.baseline`.  
- **Outputs**: KPI table, sensitivity envelope, patch (optional).

### 8.4 `sld_generate@1.3.0` (documents)

- **Purpose**: Generate Single‑Line Diagram SVG/PNG from ODL‑SD `instances` & `connections`.  
- **Scopes**: `export_execute`.  
- **Outputs**: Artifact URL + hash; optional patch to attach under `external_models`.

### 8.5 `bid_score@1.0.0` (sourcing)

- **Purpose**: Score supplier bids by price, lead time, ESG, warranty.  
- **Scopes**: `procurement_read`.  
- **Outputs**: ranked list + rationale; optional patch to set `supplier_chain.rfq.awarded_to`.

---

## 9) Security Requirements (must‑haves)

- **Input validation**: Strict JSON Schema; reject unknown fields if `additionalProperties:false` is set.  
- **Output validation**: Validate before returning to agents.  
- **Secrets**: No secrets in payloads; credentials injected out‑of‑band.  
- **Regional routing**: Honour data residency (US/EU/APAC).  
- **Abuse controls**: Rate limits, request size & timeouts, circuit breakers.  
- **Model security**: When LLMs assist a tool (OCR/parse), use **prompt templates** with schema hints; detect prompt injection & sanitize content.

---

## 10) CI Governance & Checks

**CI must block** any tool change failing these checks:

- Spec Card passes JSON Schema validation & lint rules.  
- Version bump rule satisfied (per change type).  
- All I/O stubs regenerate cleanly (no diffs).  
- Unit & golden tests pass; eval gates meet thresholds (see Eval‑Plan).  
- Security checks: no forbidden scopes, side‑effects declared, idempotency present for writes.  
- Docs regen OK; deprecation headers added if applicable.

---

## 11) Minimal Execution API (internal)

All tools expose a consistent HTTP shape via the API‑Gateway:

```
POST /tools/{{id}}:run
Headers:
  Authorization: Bearer <token>
  Idempotency-Key: <hash>
Body: <inputs_schema JSON>
Returns: <outputs_schema JSON or error schema>
```

**Error schema**

```json
{{
  "error": {{"code":"INPUT_VALIDATION_FAILED","message":"...","details":{{}}}},
  "trace_id": "abcd-1234"
}}
```

---

## 12) Checklists

### Authoring (per tool)

- [ ] Spec Card authored & reviewed (owner team assigned)  
- [ ] Scopes, side‑effects, idempotency declared  
- [ ] Inputs/Outputs JSON Schemas complete (examples included)  
- [ ] PSU cost declared and budgeted  
- [ ] Golden tests and evals added  
- [ ] Docs & stubs regenerated

### Runtime (per deployment)

- [ ] OTEL traces present with required attributes  
- [ ] Dashboards show latency, error rate, cache hit rate, cost  
- [ ] Rate limits enforced & visible  
- [ ] Cache invalidations wired to ODL‑SD events  
- [ ] Deprecations announced with timelines

---

## 13) Cross‑References

- **JSON‑Patch & ODL‑SD** — see system spec for mutation rules and limits.  
- **Versioning & Deprecation** — see governance docs.  
- **Security & Threats** — see threat model and security guidelines.  
- **API Design & Testing** — see API spec and OpenAPI.  
- **Evaluation** — see Eval‑Plan thresholds and suites.

> **Note to implementers:** keep tools small, typed, observable, and governed. Let agents plan; let tools compute and verify.

---
owner: platform-team
last_review: 2025-09-22
status: template
tags: ["versioning", "governance", "api", "ml-models", "prompts", "schemas", "infra", "deprecation"]
references:
  - "../API-Governance.md"
  - "../../06-ml-ai/Model-Card.md"
  - "../../06-ml-ai/Prompt-Library.md"
  - "../../06-ml-ai/Tool-Specs.md"
  - "../../03-apis/API-Specification.md"
  - "../../03-apis/openapi.yaml"
  - "../ADR/ADR-0000-template.md"
---

# Versioning Policy

> **Purpose.** Establish consistent rules for how we version, deprecate, and retire **APIs, ML models, prompts, tools, data schemas, and infrastructure** across all products and tenants. Enforcement is automated in CI/CD; exceptions require an ADR with an expiry date.

---

## 1) Scope & Principles

- **Semantic Versioning everywhere** (MAJOR.MINOR.PATCH).
- **Compatibility by default**: minor/patch are backward‑compatible; major signals a breaking change with a migration plan.
- **Transparent deprecations**: announce early, provide headers, guidance, and a defined grace period.
- **Automated governance**: pipeline gates block non‑compliant releases; dashboards expose compliance and deprecation status.
- **SSOT**: one registry per artifact class (API registry, model registry, prompt registry, tool registry).

---

## 2) Semantic Versioning (SemVer)

**MAJOR** — breaking changes that require migration (e.g., removing endpoints/fields, auth changes).  
**MINOR** — additive, backward‑compatible features (new endpoints/fields, optional params).  
**PATCH** — bug fixes, security fixes, docs or non‑breaking dependency updates.

> **Lifecycle Stages**: Alpha → Beta → RC → GA → LTS → Deprecated → Sunset. Use pre‑release tags for Alpha/Beta/RC; GA is stable; LTS is maintained with patches only.

---

## 3) API Versioning

### 3.1 Strategy

- **URI versioning + header negotiation**  
  `GET /api/v{MAJOR}/resource` with optional `Accept-Version: {MAJOR.MINOR.PATCH}` and response header `API-Version: ...`.
- **Support window**: Each **major** is supported for **≥12 months** after deprecation notice. Minor/patch are indefinitely compatible.
- **Idempotency & contract testing**: Operation IDs are stable and kebab‑case; consumer‑driven contracts are required on PRs.

### 3.2 Breaking‑change rules (non‑exhaustive)

- Removing an endpoint or required field → **MAJOR**.  
- Changing field type, semantics, or auth method → **MAJOR**.  
- Adding an optional field/endpoint → **MINOR**.  
- Bug/security fix → **PATCH**.

### 3.3 Deprecation policy & headers

**Phases**: announcement → migration (≈6 mo) → warning (≈3 mo) → sunset notice (≈1 mo) → removal (≥12 mo total).

Example response headers on deprecated endpoints:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.example.com/v2/resource>; rel="successor-version"
Warning: 299 - "Deprecated API: Use /v2/resource. Removal date: 2025-12-31"
```

### 3.4 Governance checks for OpenAPI

Spectral rules (excerpt) to enforce version format, operationId style, examples, and AI metadata:

```yaml
# .spectral.yaml (excerpt)
extends: [spectral:oas]
rules:
  api-version-format:
    given: $.info.version
    severity: error
    then: {{ function: pattern, functionOptions: {{ match: "^[0-9]+\.[0-9]+\.[0-9]+$" }} }}
  operation-id-kebab-case:
    given: $.paths[*][*].operationId
    severity: error
    then: {{ function: pattern, functionOptions: {{ match: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$" }} }}
  response-examples-required:
    given: $.paths[*][*].responses[*].content[*]
    severity: error
    then:
      - field: example
        function: truthy
      - field: examples
        function: truthy
  ai-metadata-required:
    description: ML endpoints must include model metadata
    given: $.paths[*][post,put].responses[200].content[*].schema.properties
    severity: error
    then:
      function: schema
      functionOptions:
        schema:
          required: ["model_id", "model_version", "confidence"]
```

---

## 4) ML Model Versioning & Rollback

### 4.1 Naming & registry

- Artifact name: `{model_name}-vMAJOR.MINOR.PATCH` (e.g., `text-classifier-v2.3.1`).  
- **Immutable registry** with SHA‑256 hash, training dataset version, framework pin, metrics, and provenance. Hash verified on every load; mismatches are rejected.

### 4.2 Rollback triggers & process

**Triggers (any)**: accuracy drop >5%, latency +50%, error rate >1%, drift detected (e.g., KL > 0.1), or security finding.  
**Process**: detect → validate → switch to previous GA via blue‑green → notify → investigate. Target rollback <5 minutes.

---

## 5) Prompt Versioning

- ID format: `{prompt_id}@vMAJOR.MINOR` (e.g., `summarize-doc@v2.1`).  
- Stored in a **prompt registry** with template, variables, token limits, and flags (deprecated, owner).  
- **Compatibility**: MAJOR implies behavioral change; MINOR keeps interface and intent.

**Migration stub**:

```markdown
## summarize-doc@v1.0 → v2.0
- Breaking: input changes to JSON; output adds `confidence`
- Update client:
  # v1.0
  result = prompt("summarize-doc@v1.0", text=doc)
  # v2.0
  result = prompt("summarize-doc@v2.0", {{ "text": doc, "style": "executive_summary" }})
```

---

## 6) Tool & Function Versioning (Agent Tools)

- Tools are **declared contracts** (JSON Schema/Pydantic) with `{name, semver, inputs, outputs, side_effects, rbac_scope}`.
- **Breaking**: input/output schema change, side‑effects or auth scope change → **MAJOR**.
- **Additive**: new optional parameter → **MINOR**. Fixes → **PATCH**.
- Version bumps **auto‑invalidate caches** and enable A/B guards in the orchestrator.

---

## 7) Data & Schema Versioning

### 7.1 Database (relational)

- **Expand‑and‑contract** migrations: add nullable columns / backfill / switch reads → later remove legacy fields.
- All schema changes are **forward‑ and backward‑compatible** during the migration window.
- Use Alembic/Flyway with **idempotent** scripts and automated rollback tests.

### 7.2 Document & JSON Schemas

- JSON Schemas use explicit `$id` and versioned URLs; clients pin to a schema version.
- **ODL‑SD** and related supplements carry their own `schema_version` and `content_hash`. Breaking schema changes require MAJOR.

---

## 8) Infrastructure & Config Versioning

- Terraform modules and Helm charts use SemVer; releases are tagged and tracked per environment.  
- Config changes are versioned; feature flags are documented with owner and expiry.  
- Blue‑green or canary for risky updates; **health checks** and **automatic rollback** on failure criteria.

---

## 9) Enforcement in CI/CD

**Release gates** (non‑exhaustive):

- OpenAPI passes Spectral checks and contract tests.  
- Artifacts carry SemVer and changelog entries.  
- Deprecation headers and sunset dates present on deprecated endpoints.  
- Model/prompt/tool versions recorded in registries; diffs attached to release notes.  
- Breaking changes require: migration notes, deprecation plan, and **approved ADR**.

**Example CI (pseudo‑YAML)**:

```yaml
jobs:
  api-governance:
    steps:
      - run: spectral lint docs/03-apis/openapi.yaml
      - run: pact-broker can-i-deploy --pacticipant web --version $GIT_SHA
  versioning:
    steps:
      - run: scripts/check-semver.sh
      - run: scripts/ensure-changelog.sh
  models:
    steps:
      - run: scripts/verify-model-artifacts.sh  # hash, metadata, registry
  prompts:
    steps:
      - run: scripts/verify-prompt-registry.sh  # schema, owner, flags
```

---

## 10) Communication & Changelogs

- **CHANGELOG.md** per package/service; **MIGRATION.md** for majors.  
- Automatic **deprecation notices** via email, headers, and in‑app banners; monthly reminders during migration; weekly in warning phase.

---

## 11) Exceptions & ADRs

- Any deviation from this policy requires an **ADR** documenting scope, rationale, mitigations, and an **expiry date**. Exceptions are tracked in governance config and reviewed quarterly.

---

## 12) Checklists

**Before release**

- [ ] Version bumped following SemVer rules  
- [ ] Changelog updated; migration guide for majors  
- [ ] Deprecation headers (if applicable)  
- [ ] Contract tests passed; Spectral clean  
- [ ] Registry entries updated (models/prompts/tools)  
- [ ] Rollback plan validated

**Before removal**

- [ ] Migration window complete  
- [ ] Consumers confirmed migrated  
- [ ] Sunset communicated; monitoring in place  
- [ ] 410 Gone configured for removed endpoints

---

## 13) References

- API governance rules and review gates → `docs/09-governance/API-Governance.md`  
- Model documentation → `docs/06-ml-ai/Model-Card.md`  
- Prompt management and versioning → `docs/06-ml-ai/Prompt-Library.md`  
- Tool specifications → `docs/06-ml-ai/Tool-Specs.md`  
- OpenAPI schema → `docs/03-apis/openapi.yaml`  
- ADRs → `docs/09-governance/ADR/ADR-0000-template.md`

# AI Agentic Platform – Documentation Index

> **Purpose:** This index anchors the complete documentation set for building **multi‑tenant, multi‑user, multi‑domain** AI agentic platforms.  
> **How to use:** Start at the top (PRD) and move down. Each file is a _template_ designed to be **simple, clean, and AI‑friendly** so coding agents can implement platforms with minimal errors.

---

## 0) Quick Start

1. **Clone templates** for your use case (e.g., engineering design, property management, trading, e‑commerce, project management, customer support, business assistant).
2. **Replace tokens** like `<PRODUCT_NAME>`, `<TENANT_STRATEGY>`, `<PRIMARY_DOMAIN>`, `<DATA_RESIDENCY>`, `<TARGET_SLO>`, `<MODEL_NAME>`, `<OWNER_TEAM>`, and `<VERSION>` across all docs.
3. **Complete the PRD → Architecture → TRD** trio before touching APIs or data.
4. Run the **linters & validators** noted below (OpenAPI/Spectral, AsyncAPI, JSON Schema, policy checks).
5. Track changes with **ADRs** (architecture decision records) and follow the **Versioning Policy**.

> ✅ **AI‑readable promise:** All templates avoid ambiguity, use concrete checklists, and prefer typed contracts (JSON Schema / OpenAPI) to guide code‑gen agents.

---

## 1) Directory Tree (canonical)

```
docs/
  00-product/PRD.md
  01-architecture/System-Architecture.md
  02-requirements/TRD.md
  03-apis/API-Specification.md
  03-apis/openapi.yaml
  04-data/Database-Design.md
  04-data/Data-Governance.md
  04-data/DPIA.md
  05-dev/Dev-Env-Setup.md
  05-dev/Coding-Standards.md
  06-ml-ai/Model-Card.md
  06-ml-ai/Prompt-Library.md
  06-ml-ai/Tool-Specs.md
  06-ml-ai/Eval-Plan.md
  07-ops/Deployment-Infrastructure.md
  07-ops/Observability-Runbook.md
  07-ops/SLOs.md
  07-ops/Incident-Playbooks.md
  08-security/Security-Guidelines.md
  08-security/Threat-Model.md
  09-governance/API-Governance.md
  09-governance/Versioning-Policy.md
  09-governance/ADR/ADR-0000-template.md
  _index/README.md
```

**Optional extensions (already included for agentic platforms):**
```
  10-agents/Agent-Registry.md
  10-agents/Tool-Catalog.md
  10-agents/Guardrails-Policy.md
  10-agents/Prompt-Style-Guide.md
  03-apis/asyncapi.yaml
  07-ops/Cost-&-Token-Budgeting.md
  07-ops/Red-Team-Plan.md
  08-security/Secure-Prompting-&-PII-Redaction.md
  09-governance/Security-Exception-Register.md
```

---

## 2) Navigation (click to open)

### Product
- **PRD** → [../00-product/PRD.md](../00-product/PRD.md)

### Architecture
- **System Architecture** → [../01-architecture/System-Architecture.md](../01-architecture/System-Architecture.md)

### Requirements
- **TRD** → [../02-requirements/TRD.md](../02-requirements/TRD.md)

### APIs
- **API Specification** → [../03-apis/API-Specification.md](../03-apis/API-Specification.md)  
- **OpenAPI** → [../03-apis/openapi.yaml](../03-apis/openapi.yaml)  
- *(Optional)* **AsyncAPI** → [../03-apis/asyncapi.yaml](../03-apis/asyncapi.yaml)

### Data
- **Database Design** → [../04-data/Database-Design.md](../04-data/Database-Design.md)  
- **Data Governance** → [../04-data/Data-Governance.md](../04-data/Data-Governance.md)  
- **DPIA** → [../04-data/DPIA.md](../04-data/DPIA.md)

### Dev
- **Dev Env Setup** → [../05-dev/Dev-Env-Setup.md](../05-dev/Dev-Env-Setup.md)  
- **Coding Standards** → [../05-dev/Coding-Standards.md](../05-dev/Coding-Standards.md)

### ML & AI
- **Model Card** → [../06-ml-ai/Model-Card.md](../06-ml-ai/Model-Card.md)  
- **Prompt Library** → [../06-ml-ai/Prompt-Library.md](../06-ml-ai/Prompt-Library.md)  
- **Tool Specs** → [../06-ml-ai/Tool-Specs.md](../06-ml-ai/Tool-Specs.md)  
- **Eval Plan** → [../06-ml-ai/Eval-Plan.md](../06-ml-ai/Eval-Plan.md)

### Ops
- **Deployment Infrastructure** → [../07-ops/Deployment-Infrastructure.md](../07-ops/Deployment-Infrastructure.md)  
- **Observability Runbook** → [../07-ops/Observability-Runbook.md](../07-ops/Observability-Runbook.md)  
- **SLOs** → [../07-ops/SLOs.md](../07-ops/SLOs.md)  
- **Incident Playbooks** → [../07-ops/Incident-Playbooks.md](../07-ops/Incident-Playbooks.md)  
- *(Optional)* **Cost & Token Budgeting** → [../07-ops/Cost-&-Token-Budgeting.md](../07-ops/Cost-&-Token-Budgeting.md)  
- *(Optional)* **Red‑Team Plan** → [../07-ops/Red-Team-Plan.md](../07-ops/Red-Team-Plan.md)

### Security
- **Security Guidelines** → [../08-security/Security-Guidelines.md](../08-security/Security-Guidelines.md)  
- **Threat Model** → [../08-security/Threat-Model.md](../08-security/Threat-Model.md)  
- *(Optional)* **Secure Prompting & PII Redaction** → [../08-security/Secure-Prompting-&-PII-Redaction.md](../08-security/Secure-Prompting-&-PII-Redaction.md)

### Governance
- **API Governance** → [../09-governance/API-Governance.md](../09-governance/API-Governance.md)  
- **Versioning Policy** → [../09-governance/Versioning-Policy.md](../09-governance/Versioning-Policy.md)  
- **ADR Template** → [../09-governance/ADR/ADR-0000-template.md](../09-governance/ADR/ADR-0000-template.md)  
- *(Optional)* **Security Exception Register** → [../09-governance/Security-Exception-Register.md](../09-governance/Security-Exception-Register.md)

### Agents (Optional, recommended for agentic platforms)
- **Agent Registry** → [../10-agents/Agent-Registry.md](../10-agents/Agent-Registry.md)  
- **Tool Catalog** → [../10-agents/Tool-Catalog.md](../10-agents/Tool-Catalog.md)  
- **Guardrails Policy** → [../10-agents/Guardrails-Policy.md](../10-agents/Guardrails-Policy.md)  
- **Prompt Style Guide** → [../10-agents/Prompt-Style-Guide.md](../10-agents/Prompt-Style-Guide.md)

---

## 3) Cross‑cutting Conventions (for all templates)

- **Single Source of Truth:** Prefer contracts (OpenAPI/AsyncAPI, JSON Schema, Pydantic/Zod) over prose. Avoid duplicated type defs.
- **JSON‑Patch for Mutations:** All state changes should be explicit, auditable patches where applicable.
- **Multi‑Tenancy:** Document tenant isolation in data, caching, observability, model routing, and RBAC.
- **Security by Default:** Least privilege (RBAC), secrets management, data classification, de‑identification for prompts, supply‑chain scanning.
- **AI Cost/Latency:** Track tokens & latency; set **budgets** and fallbacks per model/tool.
- **Observability:** Traces (correlation IDs), metrics (latency, error rate, token cost), logs (structured, PII‑safe).
- **Versioning & Deprecations:** Semantic versioning across APIs, models, prompts, and tools with deprecation timelines.
- **Governance:** Use ADRs for any deviation; register APIs/agents/tools in central catalogs.

---

## 4) Linters & Validators

- **OpenAPI**: `spectral lint docs/03-apis/openapi.yaml`  
- **AsyncAPI**: `asyncapi validate docs/03-apis/asyncapi.yaml`  
- **JSON Schema**: `jsonschema -i <sample.json> <schema.json>`  
- **Policy checks** (where configured): CI enforces API/Model/Prompt version rules and required metadata.

---

## 5) Readiness Checklist (per release)

- [ ] PRD, System Architecture, TRD approved  
- [ ] API spec + examples complete, **no breaking changes unannounced**  
- [ ] Data model + DPIA reviewed (privacy, residency, retention)  
- [ ] Dev env reproducible; **Coding Standards** satisfied; CI green  
- [ ] Model Card, Prompts, Tools defined; **Eval Plan** with pass thresholds  
- [ ] Deployment plan, **SLOs**, Runbooks, Incidents in place  
- [ ] Security Guidelines, Threat Model, **Secure Prompting/PII** completed  
- [ ] **Versioning Policy** & **API Governance** checks pass  
- [ ] ADRs for key choices; **Exception Register** updated  
- [ ] Agent Registry, Tool Catalog, Guardrails, Prompt Style finalized

---

## 6) How to Customize for a New Platform

1. Duplicate `docs/` and **set product tokens** in PRD.  
2. Update **System Architecture** for your domain & tenancy model.  
3. Scope **TRD** user stories & NFRs.  
4. Design **APIs** (OpenAPI/AsyncAPI) with examples that match your domain.  
5. Define **data schema** & governance (plus DPIA).  
6. Finalize **Dev Standards** and **CI checks**.  
7. Fill **Model Card**, **Prompts**, **Tools**, and **Evals** for your AI tasks.  
8. Plan **Deployment**, **Observability**, **SLOs**, **Incidents**.  
9. Complete **Security** & **Threat Modeling**; apply **Secure Prompting**.  
10. Lock **Governance** (versioning, ADRs, exception handling).  
11. For agentic use‑cases, complete **Agents** folder and budgets.

---

## 7) Metadata

- **Owner:** <OWNER_TEAM>  
- **Version:** <VERSION>  
- **Last Updated:** 2025-09-24

---

### Notes for AI Coding Agents

- Prefer **structured outputs** and **schema validation** at every boundary.  
- Never bypass guardrails or tool scopes.  
- Log cost & latency per call; respect budgets and SLOs.  
- Use the **Registry** docs to discover approved agents/tools.  


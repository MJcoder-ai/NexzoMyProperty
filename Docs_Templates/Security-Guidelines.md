---
owner: security
last_review: 2025-09-21
status: template
tags: ["security", "compliance", "ai-security", "rbac", "api", "privacy"]
references:
  - "../08-security/Threat-Model.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/Versioning-Policy.md"
  - "../07-ops/Incident-Playbooks.md"
  - "../07-ops/Observability-Runbook.md"
  - "../04-data/DPIA.md"
  - "../06-ml-ai/Model-Card.md"
---

# Security Guidelines (Multi‑Tenant, Multi‑User, Multi‑Domain)

> **Purpose.** Define mandatory controls and secure‑by‑default patterns for apps and AI agents built on this platform. Applies across product lines (engineering design, property mgmt, trading, e‑commerce, PM, customer support, business assistant). These guidelines integrate our Threat Model (STRIDE), API governance, AI agent hardening, RBAC/phase gates, and incident practices. fileciteturn0file25 fileciteturn0file24 fileciteturn0file31

---

## 0) Executive Summary

- **Zero‑trust** service boundaries + explicit **RBAC** and phase‑gates at every write path (propose/approve/merge). fileciteturn0file31  
- **Contract‑first AI**: Ground‑before‑Generate, structured I/O validation, safe tool registry, and JSON‑Patch mutation contract. fileciteturn0file29 fileciteturn0file26  
- **Defense in depth** across the pipeline: API gateway policies, token & key hygiene, encryption in transit/at rest, container hardening, SCA/SBOM, and CI/CD policy gates. fileciteturn0file37 fileciteturn0file24  
- **Observability & response**: trace IDs on every call, cost/latency monitors, SLOs & error budgets, runbooks & drills. fileciteturn0file24  
- **Governance**: versioned changes, deprecation timelines, ADRs for exceptions, and “Right‑to‑Switch” portability. fileciteturn0file22 fileciteturn0file21 fileciteturn0file30

> **All security docs must include YAML front‑matter, cross‑refs, and review cadence.** (See documentation index standards.) fileciteturn0file20

---

## 1) Scope & Data Classification

**Scope**: Web/mobile apps, APIs, worker jobs, AI orchestrator & tools, data pipelines, model registry, and observability stack. **Tenancy**: org‑isolated, with per‑tenant RBAC and data residency controls.

**Data classes** (store the label on every record; enforce policy by label):
- `public` – templates & non‑identifying examples.  
- `internal` – project meta & hierarchy.  
- `restricted` – finance, operations, compliance, ESG, external_models.  
- `confidential` – supplier pricing, signatures, audit. fileciteturn0file31

**Trust boundaries**: Internet→DMZ (WAF/CDN)→Application→Data→AI/ML zones, each with dedicated controls (rate‑limit, JWT verification, prepared statements, model‑specific guards). fileciteturn0file25

---

## 2) Identity, Access, and Authorization

- **Identity**: OIDC/OAuth2; MFA required for sensitive roles (engineer, expert, compliance_officer, finance, asset_owner, super_user). fileciteturn0file31  
- **Authorization**: RBAC with resource & scope enforcement (R/W/P/A/X/S). *P* (propose) and *A* (approve) enable gated writes; merges are auditable. Apply **least privilege** and **scope inheritance** with explicit overrides. fileciteturn0file31  
- **Phase gates**: Lock sections by lifecycle (design→procurement→construction→commissioning→operations); require approver roles for merges & publish/baseline. fileciteturn0file31  
- **Tenant isolation**: Row‑level security (RLS) for multi‑tenant Postgres; org‑scoped tokens; per‑region keys for residency. (See ODL‑SD store + governance.) fileciteturn0file34  
- **Session & device**: Short‑lived access tokens (1h) with refresh; secure cookies; device binding for mobile field ops.

---

## 3) API Security (Gateway + Service Level)

Mandatory controls (gateway enforced, verified in code):  
- **TLS 1.3**, HSTS; **OAuth 2.0 with PKCE** for user auth; **JWT** with explicit claims; **RBAC scopes** at gateway & handler. fileciteturn0file24  
- **Rate limiting** (per user/IP), **DDoS protection**, **WAF** rules for OWASP Top‑10 patterns. fileciteturn0file24  
- **Schema validation** for every request/response (OpenAPI + Spectral rules); response examples; AI metadata on ML endpoints. fileciteturn0file24  
- **Versioning & deprecation**: URI versioning, header negotiation, 12‑month major support, Sunset headers, and migration guides. fileciteturn0file22  
- **Tracing headers**: X‑Request‑ID & correlation with span attributes (api.version, model.id, error.type). fileciteturn0file24  
- **Key management (legacy)**: API keys hashed (Argon2id), rotation every 90 days, revocation immediate; sunset legacy key auth. fileciteturn0file24

**Service level**: Input canonicalization, parameterized queries/ORM, output encoding, consistent error envelopes, and idempotency on POST where applicable. Use consumer‑driven contracts and “can‑I‑deploy” checks. fileciteturn0file24

---

## 4) Secure Coding & Supply Chain

- **No `eval` / dynamic code execution**; never execute LLM‑generated code; tools are **declared** and **validated** before execution. fileciteturn0file26 fileciteturn0file39  
- **Type safety & SSOT**: Import shared types from authoritative packages; avoid duplicated enums; handle all states; optional chaining on nested API data. fileciteturn0file37  
- **Dependency hygiene**: SCA scanning; pinned & reviewed updates; SBOM generation; lockfiles committed; CI fails on high CVEs. fileciteturn0file37  
- **Container hardening**: Multi‑stage builds, minimal images, non‑root users, healthchecks, .dockerignore hygiene. fileciteturn0file37  
- **Secrets**: Vault/Secret Manager; never in code or images; rotate; least‑privilege KMS.  
- **Infra as Code**: Terraform/Cloud Build with principle of least privilege; correct IAM roles (network admin vs service networking). fileciteturn0file37

---

## 5) AI/Agent Security (LLM & Tools)

**Design principles**: Contract‑first, **Ground‑before‑Generate**, deterministic tools > free text, **policy router** for budgets/regions, and visible Planner Trace. fileciteturn0file29  

**Controls**  
- **Structured I/O**: Pydantic schemas for prompts & outputs; validate every LLM response; auto‑repair loop with retry/backoff; unique trace IDs and cost tracking. fileciteturn0file26  
- **Tool registry & least privilege**: Declarative tool specs with scopes, JSON schemas for args, pre‑exec validation, and audit of results. fileciteturn0file39  
- **Prompt‑injection & jailbreak defenses**: Input sanitization, schema enforcement, content filtering, rate limits; red‑team tests. fileciteturn0file25  
- **Mutation safety**: All design writes are **JSON‑Patch** (max ops, dry‑run, evidence URIs, optimistic concurrency, inverse patch/rollback). fileciteturn0file29  
- **Memory & privacy**: Externalized state (Redis/DB), token‑aware pruning, PII scrubber on memory writes, region routing. fileciteturn0file26 fileciteturn0file29  
- **Agent transparency**: Plan→Act timeline, diff & approvals UI (“Intent → Plan → Action/Evidence → Proposed Change”). fileciteturn0file35

**Model security**  
- **Model registry**: Signed artifacts, versioned with hash; rollback via blue/green; drift & anomaly monitors. fileciteturn0file22  
- **Attack surface**: extraction, inversion, poisoning, membership inference—mitigate via rate limits, watermarking, DP, provenance checks. fileciteturn0file25

---

## 6) Data Security & Privacy

- **Encryption**: TLS in transit; at rest via cloud KMS; per‑region keys.  
- **Residency**: RegionRouter directs storage & model traffic by org region. fileciteturn0file29  
- **DPIA**: Conduct/refresh DPIAs for features handling PII/ESI; track mitigations and residual risk.  
- **Audit & immutability**: Append‑only audit logs for every change; SIEM hooks; log signing where applicable. fileciteturn0file25  
- **Right‑to‑Switch / Portability**: User/Org can reassign managing party; export baselines & warranty ledgers with full history. fileciteturn0file30  
- **ODL‑SD SSOT**: All domain state is in the ODL‑SD document, versioned and validated against JSON Schema. fileciteturn0file34

---

## 7) Observability, SLOs & Incident Response

- **Metrics**: p50/p99 latency, error rate, availability, request rate, token usage; model‑id on spans; dashboards per service. fileciteturn0file24  
- **Tracing**: Correlate across gateway→service→tool→model calls. fileciteturn0file24  
- **SLOs & error budgets**: Define per service & ML endpoint; page on budget burn; tie to release cadence.  
- **Runbooks**: Oncall rotation, clear escalation, secure comms, evidence capture; regular game‑days.  
- **Post‑mortems**: Blameless; track action items; update ADRs/policies. fileciteturn0file21

---

## 8) Governance & Compliance

- **API governance**: Spectral rules, version headers, deprecation process, consumer‑driven contracts, compliance dashboard and exception process. fileciteturn0file24  
- **Versioning policy**: SemVer for APIs, models, prompts, schemas & infra; lifecycle stages (Alpha→GA→LTS→Sunset); rollback strategy. fileciteturn0file22  
- **ADR discipline**: Decisions documented with context, options, rationale, metrics, and phased rollout. fileciteturn0file21  
- **Design transparency**: UI shows diffs & approvals; accessibility & internationalization baked in. fileciteturn0file31

---

## 9) Minimum Controls Checklist (Go‑Live Gate)

**Identity & Access**
- [ ] OIDC/OAuth2 + MFA for sensitive roles; short‑lived access tokens.  
- [ ] RBAC scopes enforced at gateway & service; phase‑gates applied. fileciteturn0file31

**API**
- [ ] TLS 1.3; OAuth2; JWT claims verified; rate limits & WAF applied. fileciteturn0file24  
- [ ] OpenAPI validated, Spectral rules passing, contract tests green. fileciteturn0file24  
- [ ] Deprecation/Sunset headers where applicable; migration guide linked. fileciteturn0file22

**App/Code**
- [ ] No `eval`; tool calls are declared & validated; structured I/O enforced. fileciteturn0file26 fileciteturn0file39  
- [ ] Type SSOT; no duplicated enums; optional chaining on nested data. fileciteturn0file37  
- [ ] SCA/SBOM produced; image runs non‑root; healthcheck in place. fileciteturn0file37

**AI/Model**
- [ ] Ground‑before‑Generate; memory scrubbed; JSON‑Patch writes only. fileciteturn0file29  
- [ ] Model artifacts signed & versioned; rollback path tested. fileciteturn0file22

**Data/Privacy**
- [ ] Residency honored; encryption at rest/in transit; SIEM hooks live. fileciteturn0file25  
- [ ] DPIA reviewed; retention & deletion policies enforced.

**Ops**
- [ ] Dashboards & alerts for latency/error/availability/token usage. fileciteturn0file24  
- [ ] Oncall runbook & incident playbooks rehearsed; ADRs updated. fileciteturn0file21

---

## 10) Appendix: Secure Headers & Defaults

**HTTP security headers (minimum)**  
`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera/mic/geolocation minimal).  
**AI output filtering**: block harmful/illegal content; redact PII; enforce max tokens; deterministic temperature for critical flows. fileciteturn0file25

---

*This document follows the platform’s living‑doc standard (YAML front‑matter, cross‑refs, diagrams where relevant, success metrics, and risk analysis), and should be reviewed quarterly or after any material architecture change.* fileciteturn0file20

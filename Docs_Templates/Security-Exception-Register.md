---
owner: security
last_review: 2025-09-25
status: living-document
tags: ["security", "governance", "exception-register", "risk", "audit"]
references:
  - "../08-security/Threat-Model.md"
  - "../09-governance/API-Governance.md"
  - "../09-governance/ADR/ADR-0000-template.md"
  - "../09-governance/Versioning-Policy.md"
  - "../07-ops/Incident-Playbooks.md"
---

# Security Exception Register

> **Purpose.** A single authoritative register for **time‑bound deviations** from our security, privacy, API, model, data, and infrastructure policies. Every exception is documented, risk‑assessed, mitigated with **compensating controls**, formally **approved**, and automatically **expires** or is renewed with justification.

---

## 1) Policy Summary (what counts as an exception)

An exception is a formally approved, time‑boxed deviation from a required control or standard. Typical categories:
- **Authentication/Authorization** — e.g., temporary API key usage where OAuth is mandated.
- **Transport & Network** — e.g., TLS termination outside gateway; temporary open inbound port.
- **Data Governance** — e.g., processing **restricted/confidential** data without a resident control; cross‑region transfer during incident response.
- **AI/ML** — e.g., model endpoint without watermarking/rate‑limits; prompt logs with PII before redaction pipeline.
- **Change/Release** — e.g., bypassing required contract tests for a hotfix.
- **Third‑Party/Vendor** — e.g., unvetted SaaS used during migration.

**All exceptions MUST:**
1. **Create an ADR** (decision record) describing context, options, and rationale. fileciteturn0file21  
2. Follow the **API governance exception process & approval matrix** (security → CISO; breaking change → consumer sign‑off). fileciteturn0file23  
3. Map to the **Threat Model** risk and STRIDE category; set likelihood/impact and owner. fileciteturn0file24  
4. Be **time‑boxed** with expiry; include **remediation plan** and **compensating controls**.  
5. Respect **Versioning/Deprecation** timelines when the exception affects API or model contracts. fileciteturn0file22  
6. Observe **data classifications** (public | internal | restricted | confidential) and RBAC phase gates. fileciteturn0file31  

---

## 2) Workflow (system of record)

**States:** `Draft → Under-Review → Approved (time-bound) → Active → Expiring (T-30) → Extended → Closed → Archived`

**Required steps (automated where possible):**
1. **Raise** exception request (template below) + attach ADR ID. fileciteturn0file21  
2. **Review** by security + affected domain owners; populate risk from Threat Model. fileciteturn0file24  
3. **Approval** per **API Governance approval_matrix** (minor vs major vs security). fileciteturn0file23  
4. **Implement** compensating controls & monitoring; link dashboards/alerts. fileciteturn0file23  
5. **Track** metrics and expiry; auto‑notify owners at **T‑30/T‑7/T‑1**.  
6. **Close** on remediation complete; update ADR with outcome; archive evidence.

---

## 3) Register — canonical fields

> Store one row per exception. The register is exportable as CSV/JSON; Markdown below is the human‑readable view.

### 3.1 Field dictionary
| Field | Type | Required | Notes |
|------|------|----------|------|
| `exception_id` | ULID/UUID | Yes | Global ID (e.g., `EXC_01H…`). |
| `title` | string | Yes | Short problem statement. |
| `category` | enum | Yes | `authz`,`network`,`data`,`ai`,`release`,`vendor`,`other`. |
| `policy_ref` | string[] | Yes | Links to violated policies/sections. |
| `adr_id` | string | Yes | Architecture Decision Record reference. fileciteturn0file21 |
| `requestor` | user | Yes | Name/email; team. |
| `tenant_org` | ULID | Yes | Multi‑tenant org ID (if applicable). |
| `environment` | enum | Yes | `dev`,`staging`,`prod`. |
| `data_classification` | enum | Yes | `public|internal|restricted|confidential`. fileciteturn0file31 |
| `threat_model_link` | url | Yes | Deep link to relevant Threat entry. fileciteturn0file24 |
| `stride` | enum | Yes | `S|T|R|I|D|E` category. fileciteturn0file24 |
| `likelihood` | enum | Yes | `Low|Medium|High`. |
| `impact` | enum | Yes | `Low|Medium|High|Critical`. |
| `risk_score` | int | Yes | Normalized score (e.g., 1–9 matrix). |
| `compensating_controls` | text | Yes | E.g., rate‑limits, isolation, monitoring. |
| `telemetry` | links | Yes | Dashboards, alerts, traces. fileciteturn0file23 |
| `approvals` | object | Yes | Approver, role, date, decision. |
| `effective_from` | date | Yes | Start date/time (UTC). |
| `expires_at` | date | Yes | Default ≤ 90 days; extensions require CISO. |
| `remediation_plan` | text | Yes | Steps, owners, milestones. |
| `dependencies` | text | No | Related systems/APIs/models. |
| `versioning_impact` | text | No | Migration window, deprecation. fileciteturn0file22 |
| `status` | enum | Yes | State machine above. |
| `evidence` | links | Yes | PRs, ticket IDs, docs. |

### 3.2 Record template (YAML)
```yaml
exception_id: EXC_01J6M9M5Y0Q2H6W2QF9Q1V
title: Temporary OAuth bypass for supplier webhook re-ingest
category: authz
policy_ref: ["08-security/Security-Guidelines#authn-authz", "03-apis/API-Governance#security"]
adr_id: "ADR-0217"
requestor: {{ name: "A. Rivera", email: "arivera@example.com", team: "Integrations" }}
tenant_org: "01H9Z3C2S6W5R4T3Q2P1" # multi-tenant context
environment: "prod"
data_classification: "restricted"
threat_model_link: "threat-model#spoofing_api_key"
stride: "S"
likelihood: "Medium"
impact: "High"
risk_score: 6
compensating_controls:
  - "Rate-limit 10/min per IP and key; anomaly alerts"
  - "Short-lived keys in Vault; rotate daily"
  - "Strict IP allowlist on gateway"
telemetry:
  dashboards: ["SLO/API Health", "Security/API Abuse"]
  alerts: ["api.error_rate>1%", "abuse.detector>baseline*10"]
approvals:
  - {{ role: "API-Owner", name: "J. Chen", decision: "approve", date: "2025-09-25" }}
  - {{ role: "Security (CISO)", name: "L. Okoye", decision: "approve", date: "2025-09-25" }}
effective_from: "2025-09-25T00:00:00Z"
expires_at: "2025-09-25T00:00:00Z"  # set ≤ 90 days from approval
remediation_plan: >
  Vendor OAuth migration ETA 45 days; track via ticket SEC-1421.
  Replace temporary API keys with OAuth2 + PKCE. Add consumer contract tests.
dependencies: ["api-gateway", "supplier-webhook", "vault"]
versioning_impact: "No breaking change; deprecation headers added to legacy key path"
status: "Approved"
evidence: ["https://git.example.com/pr/1234", "https://tickets/SEC-1421"]
```

> Replace `2025-09-25` during registration automation. Versioning & deprecation controls must follow deprecation‑timeline and headers examples. fileciteturn0file23 fileciteturn0file22

---

## 4) Operating rules

- **Duration:** Default max **90 days**; single extension ≤ **90 days** with CISO approval and fresh risk review.
- **Monitoring:** Must include **latency, error‑rate, availability, request‑rate, token usage** metrics and distributed tracing keys. fileciteturn0file23
- **Scope minimization:** Restrict to minimum tenants/endpoints/models needed; enforce RBAC per ODL‑SD roles and phase gates. fileciteturn0file31
- **Closure criteria:** Defined in remediation plan; verify by tests/evidence; update ADR with a **Decision Outcome**. fileciteturn0file21
- **Audit:** All records immutable; updates are append‑only with signer identity/time; retain **7 years** for regulated data.

---

## 5) Views & reporting (for dashboards)

- **By severity:** count of open exceptions (High/Med/Low); aging buckets (≤30, 31–60, 61–90, >90 days).
- **By domain:** `authz`, `network`, `data`, `ai`, `release`, `vendor`.
- **By environment & tenant.**
- **Impacted APIs/models:** cross‑reference to API catalog and model registry. fileciteturn0file23 fileciteturn0file22

---

## 6) Example records (quick starts)

### 6.1 AI/ML — Model extraction risk while tuning
- **Context:** New model fine‑tune lacks watermarking; extraction risk Medium/High.  
- **Controls:** Hard rate‑limits, output watermarking on gateway, audit sampling; region pinning.  
- **Expiry:** 60 days or until watermarking GA. fileciteturn0file24

### 6.2 Data — Cross‑region transfer for incident triage
- **Context:** Copy of restricted logs to EU SOC.  
- **Controls:** Pseudonymize user IDs, encrypt at rest & in transit, delete within 14 days.  
- **Approvals:** Security + Legal DPO; time‑boxed. fileciteturn0file24

### 6.3 API — Legacy header deprecation grace period
- **Context:** Consumers need extra runway for new auth headers.  
- **Controls:** Add `Deprecation`/`Sunset` headers; migration guides; monthly reminders per governance policy. fileciteturn0file23 fileciteturn0file22

---

## 7) Automation hooks

- **Can‑I‑deploy** check blocks deploy if any **Expired** exceptions remain Active.  
- **Spectral rules** flag specs that rely on exception IDs without expiry. fileciteturn0file23  
- **CI/CD** posts reminders at **T‑30/T‑7/T‑1** to owners + #security channel.  
- **Runbooks** auto‑open incident if an exception is violated and causes impact. (See Incident Playbooks).

---

## References

- **ADR Template** — use for each exception rationale and decision. fileciteturn0file21  
- **Versioning Policy** — API/model/prompt version & deprecation rules. fileciteturn0file22  
- **API Governance** — exception process, approval matrix, observability. fileciteturn0file23  
- **Threat Model** — risk categories, STRIDE mapping, AI‑specific threats. fileciteturn0file24  
- **RBAC & Data Classification** — roles, phase‑gates, data classes. fileciteturn0file31

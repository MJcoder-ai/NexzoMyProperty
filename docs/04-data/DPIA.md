---
owner: privacy-officer
last_review: 2025-09-25
status: draft
tags: ["dpia", "privacy", "gdpr"]
references:
  - "Data-Governance.md"
  - "../08-security/Threat-Model.md"
  - "../../nexzo-myproperty-concept.md"
---

# Data Protection Impact Assessment (DPIA)

## 1. Project Description
Nexzo MyProperty processes tenant, landlord, and service provider data to deliver energy-aware billing, maintenance, and AI-assisted experiences. Personal data includes contact info, usage data, payment details, and chat transcripts. Sensitive energy usage can infer occupancy patterns.

## 2. Stakeholders
- Data Controller: Nexzo Operations Ltd.
- Data Processors: Google Cloud, Stripe, communications vendors (email/SMS).
- Data Subjects: Tenants, landlords, service providers.
- Supervisory Authorities: ICO (UK), relevant US state regulators.

## 3. Data Inventory
| Category | Examples | Purpose | Lawful Basis |
| --- | --- | --- | --- |
| Identity | Names, emails, phone numbers | Account management | Contract |
| Property usage | Meter readings, allocation summaries | Billing, analytics | Legitimate interest / contract |
| Financial | Bank tokens, Stripe customer IDs | Payments | Contract |
| Communications | Chat logs, notifications | Support, audit | Legitimate interest |
| Compliance | Disclosure acknowledgements, consents | Regulatory compliance | Legal obligation |

## 4. Processing Activities
1. Collect meter/inverter data to calculate energy consumption per tenant.
2. Generate invoices with solar allocation and legal disclosures.
3. Orchestrate service workflows including provider matching and escrow release.
4. Run AI agents to suggest actions; persist decisions and justifications.
5. Sync limited project metadata with OriginFD.

## 5. Risk Assessment
| Risk | Impact | Likelihood | Rating | Mitigation |
| --- | --- | --- | --- | --- |
| Unauthorised access to tenant PII | High | Medium | High | RBAC, MFA, RLS, audit logs |
| Inference of occupancy patterns | Medium | Medium | Medium | Aggregation thresholds, consent management |
| Data breach at third-party processor | High | Low | Medium | Vendor due diligence, DPAs, encryption |
| AI misuse / erroneous actions | Medium | Medium | Medium | Guardrails, human approvals, audit trail |
| Cross-border transfer issues | Medium | Low | Medium | Standard Contractual Clauses, data residency |

## 6. Mitigation Actions
- Enforce encryption-at-rest and TLS; implement key rotation.
- Provide tenant opt-out for benchmarking; anonymise analytics datasets.
- Maintain incident response plan for data breaches; notify authorities within 72 hours.
- Validate AI outputs against policy; allow rollback for incorrect allocations.
- Perform annual DPIA review and update when new features (e.g., EV charging) launch.

## 7. Data Subject Rights
- Self-service portal for access/export (JSON, CSV) and deletion requests.
- Support rectification and restriction requests through support workflows.
- Retain audit of requests and fulfillment in privacy log (retention 7 years).

## 8. Residual Risk & Approval
Residual risk after mitigation: **Medium**.
- Privacy Officer: __________________ Date: __________
- DPO Approval: _____________________ Date: __________

Next review due 6 months after GA or upon major feature/region change.

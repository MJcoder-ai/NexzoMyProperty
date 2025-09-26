---
owner: security-team
last_review: 2025-09-25
status: draft
tags: ["security", "baseline"]
references:
  - "Threat-Model.md"
  - "Secure-Prompting-&-PII-Redaction.md"
  - "../04-data/Data-Governance.md"
  - "../07-ops/Red-Team-Plan.md"
---

# Security Guidelines

## 1. Authentication & Access Control
- Single sign-on using OIDC with short-lived access tokens (15 minutes) and refresh tokens stored server-side.
- Mandatory MFA for roles handling billing, payouts, or admin tasks.
- Role-based access control (RBAC) enforced in gateway and services; map roles to least privilege.
- Service-to-service auth via workload identity federation; no static service keys.

## 2. Data Protection
- Encryption in transit (TLS 1.3) and at rest (KMS-managed keys).
- Secrets stored in GCP Secret Manager; rotation schedule every 90 days.
- PII stored in Postgres encrypted columns where needed (e.g., contact info) using pgcrypto or KMS envelope.
- Audit all data exports; maintain logs for 7 years.

## 3. Secure Development Lifecycle
- Threat modeling for major features; update `Threat-Model.md` each quarter.
- Static analysis (ESLint security rules, Bandit) integrated in CI.
- Dependency scanning (Snyk, npm audit, pip audit) with policy gating (no high severity vulnerabilities).
- Security review required before enabling new AI tools or exposing new APIs.

## 4. Infrastructure Security
- Cloud Run services locked down to internal traffic where applicable; use Cloud Armor WAF for public endpoints.
- Network segmentation via VPC, private service connect for Cloud SQL, Redis.
- Centralised logging with alerting for anomalous behaviour (multiple failed logins, privilege escalations).
- Regular backups, tested restores.

## 5. Incident Response
- Follow `Incident-Playbooks.md`; record events in incident management system.
- Notify stakeholders promptly, including customers and regulators when required.
- Post-incident review to update controls and training.

## 6. Vendor Management
- Due diligence for processors (Stripe, OpenAI, Twilio, etc.).
- Maintain DPAs and evaluate SOC2/ISO reports annually.
- Monitor vendor status pages; subscribe to webhooks/feeds for outages.

## 7. AI-Specific Safeguards
- Guardrails controlling tool usage; prompts reviewed for injection resistance.
- Redact PII before sending context to LLM where possible.
- Validate outputs against policy (e.g., amounts must match ledger calculations) before execution.
- Maintain audit trail of agent decisions.

## 8. Training & Awareness
- Annual security and privacy training for all staff.
- Phishing simulations quarterly.
- Secure coding workshops for engineers and prompt design clinics for AI team.

## 9. Compliance Alignment
- SOC2 Type II target; roadmap for ISO 27001.
- GDPR/CCPA obligations tracked in DPIA.
- Maintain evidence repository for audits (access reviews, change logs).

Adhere to these guidelines; document exceptions in `../09-governance/Security-Exception-Register.md`.

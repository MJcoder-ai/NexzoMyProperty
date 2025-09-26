---
owner: privacy-officer
last_review: 2025-09-25
status: draft
tags: ["data", "governance", "privacy"]
references:
  - "Database-Design.md"
  - "DPIA.md"
  - "../08-security/Security-Guidelines.md"
  - "../../Nexzo MyProperty & OriginFD Integration Plan.md"
---

# Data Governance

## 1. Principles
- **Traceability:** Every data element tracked back to tenant, property, or project.
- **Minimisation:** Collect only the PII/energy data required to deliver billing, compliance, and support experiences.
- **Retention:** Align retention with financial/regulatory requirements; default deletion after retention windows.
- **Access Control:** Enforce RBAC + RLS at storage layer; audit privileged access.
- **Transparency:** Tenants can view usage, billing breakdown, and access logs via portal.

## 2. Data Classification
| Class | Description | Examples | Protection |
| --- | --- | --- | --- |
| Restricted | Sensitive PII, payment tokens, access logs | Tenant emails, bank details, Stripe tokens | Encryption, MFA, least privilege |
| Confidential | Business/operational data | Energy usage, invoices, service tickets | RLS, audit logging |
| Internal | Non-sensitive ops data | Feature flags, rate plans | RBAC |
| Public | Marketing docs | Feature overview, docs-site | none |

## 3. Retention & Deletion
| Data Type | Retention | Notes |
| --- | --- | --- |
| Financial records (invoices, ledger) | 7 years | Required for audit/compliance |
| Energy telemetry | 36 months | Extendable for analytics with consent |
| Chat transcripts | 24 months | Can be shortened per tenant | 
| Service tickets | 5 years | Extended for warranty tracking |
| Agent audit logs | 24 months | Supports safety investigations |
| Webhooks/logs | 90 days | For debugging |

Deletion workflow: request captured via portal → privacy queue → execution script updates Postgres + warehouse + storage; evidence stored in DPIA register.

## 4. Data Lineage & Catalog
- Use dbt docs to annotate warehouse models.
- Data Catalog (GCP) indexes BigQuery datasets, GCS buckets, and Postgres tables.
- Each ingestion job publishes lineage metadata via OpenMetadata.

## 5. Consent & Legal Basis
- Landlord agreements include clauses for tenant data processing.
- Tenant onboarding collects consent for energy usage analytics; optional consent for benchmarking and savings programs.
- GDPR/CCPA rights supported via export/delete API.
- DPIA tracks lawful bases and mitigations per region.

## 6. Data Sharing
- OriginFD integration shares only project metadata (capacity, install date, provider). No tenant PII leaves MyProperty.
- External partners (utilities, credit bureaus) use pseudonymised IDs; direct PII sharing requires explicit consent and DPA.
- Aggregated benchmarking data anonymised and thresholded to prevent re-identification.

## 7. Quality Management
- Daily validation checks for meter anomalies (>20% missing or negative values).
- Billing QA: random sampling of invoices for compliance checks before sending.
- Warehouse quality tests (dbt) for not-null, unique keys, referential integrity.
- Data issue triage board maintained by data team; root cause analysis for major incidents.

## 8. Roles & Responsibilities
- **Data Steward:** Owns data dictionary and lineage.
- **Privacy Officer:** Oversees DPIA, handles subject requests.
- **Security Team:** Manages encryption, access approvals, and monitoring.
- **Product Analytics:** Ensures metrics align with privacy commitments.
- **Engineering Managers:** Approve schema changes and retention overrides.

## 9. Tooling
- Secret storage in GCP Secret Manager with automated rotation.
- Activity logs stored in BigQuery for audit queries.
- Access reviews semi-annually with IAM export to GRC system.

Maintain alignment with regulatory updates; update retention schedule annually.

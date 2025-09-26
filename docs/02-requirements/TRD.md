---
owner: engineering-team
last_review: 2025-09-25
status: draft
tags: ["trd", "requirements"]
references:
  - "../00-product/PRD.md"
  - "../01-architecture/System-Architecture.md"
  - "../03-apis/API-Specification.md"
  - "../04-data/Database-Design.md"
  - "../05-dev/Coding-Standards.md"
  - "../07-ops/SLOs.md"
  - "../08-security/Threat-Model.md"
---

# Technical Requirements Document (TRD)

## 1. Purpose
Define the functional, non-functional, compliance and operational requirements that engineering teams must satisfy while implementing Nexzo MyProperty.

## 2. System Context
- Tenant/landlord portal, admin console and docs-site built with Next.js.
- Gateway Node provides REST/tRPC APIs, proxies to backend services and websocket chat.
- Backend services span Node (billing/auth/compliance) and Python (AI orchestration, meter analytics).
- Workers handle ingestion, allocation, anomalies and scheduled reporting.
- Shared infrastructure on GCP using Cloud Run, Cloud SQL, Redis, BigQuery and Secret Manager.

## 3. Functional Requirements
### 3.1 Tenant & Property Management
1. Create/update/delete tenants, landlords, properties, buildings, units and meters with RLS enforcement.
2. Import initial property portfolio via CSV or API; provide validation feedback within 5 seconds.
3. Support multi-tenant organisations with custom branding and configuration profiles.

### 3.2 Energy Data & Allocation
1. Accept 15-minute interval data from meters/inverters via ingestion API or batch uploads.
2. Store raw readings plus normalised kWh per property/unit; retain minimum 36 months.
3. Allocation engine must compute solar vs grid splits per unit per billing cycle; support override adjustments with audit trail.
4. Anomaly service flags deviations >20% over baseline and surface alerts in landlord dashboard.

### 3.3 Billing & Payments
1. Generate monthly invoices with solar credits, grid usage, fees, taxes, and compliance disclosures.
2. Support time-of-use and tiered rate structures configured per property.
3. Integrate with Stripe for payments (card, ACH, wallet) and maintain escrow ledger for service jobs.
4. Provide autopay, payment plans, partial payments, and automatic past-due reminders.
5. Maintain immutable ledger with double-entry accounting for rent, utilities and adjustments.

### 3.4 Service Operations
1. Tenants and landlords submit service requests via web/mobile or chat; attach media.
2. AI matching engine proposes at least three providers based on skills, SLA, distance, rating.
3. Support quote negotiation, scheduling, milestone tracking, and release of escrow after verification.
4. Capture post-service feedback to feed provider scorecards.

### 3.5 AI Copilot & Agents
1. Provide chat interface with retrieval-augmented responses and contextual cards.
2. Agents can trigger approved tools: create invoice draft, adjust allocation, create service ticket, escalate to human.
3. Implement human review workflow for high-impact actions (billing adjustments, provider approvals).
4. Maintain prompt templates and tool contracts under version control; enforce via code review.
5. Evaluate agents nightly with scripted tasks; escalate regression above threshold.

### 3.6 Compliance & Reporting
1. Compliance engine selects rule pack per property region (initial: UK, US-CA, US-NY).
2. Generate mandatory disclosures and attach to invoices.
3. Provide carbon footprint and ROI dashboards with exportable reports.
4. Support DPIA, GDPR/CCPA requests (export/delete personal data) within 30 days.

## 4. Non-Functional Requirements
| Category | Requirement |
| --- | --- |
| Availability | ≥ 99.9% core API uptime; fail open for read-only queries on write outages |
| Latency | P95 API latency < 400 ms for primary endpoints; chat response < 3 s including tool calls |
| Scalability | Support 50k active properties, 200k tenants, 1M meter readings/day with horizontal scaling |
| Security | MFA for financial roles, encrypted secrets, continuous vulnerability scanning |
| Privacy | Data minimisation, masked logs, per-tenant encryption keys (KMS) for sensitive data |
| Observability | Trace coverage > 95%; dashboards for billing throughput, allocation accuracy, AI tool usage |
| Accessibility | WCAG 2.1 AA compliance, responsive chat-first mobile experience |
| Internationalisation | Support multi-currency billing, localised disclosures and date formats |

## 5. Data Requirements
- ERD defined in `../04-data/Database-Design.md`; implement via migrations.
- All tables include `tenant_id`, `created_at`, `updated_at`; use UUID primary keys.
- Maintain warehouse star schema for metrics (fact_invoices, fact_usage, dim_property, dim_tenant, fact_service).
- Data retention: raw telemetry ≥ 36 months, financial records ≥ 7 years, chat transcripts ≥ 24 months (configurable).

## 6. Integration Requirements
- REST APIs per `../03-apis/openapi.yaml` with versioned base path `/v1`.
- Async messaging via Pub/Sub topics for meter ingestion, billing events, and OriginFD updates (`asyncapi.yaml`).
- Webhook endpoints for OriginFD project updates, Stripe events, third-party provider integrations.
- API portal issuing keys with rate limits (default 200 requests/minute per tenant).

## 7. DevOps & Tooling
- Monorepo managed via pnpm + TurboRepo; `pnpm install` completes < 10 minutes.
- Enforce lint, test, typecheck pipelines for every package; coverage > 80% on core services.
- Infrastructure as code with Terraform modules under `infra/terraform`.
- CI via GitHub Actions; promotions triggered through Git tags and environment approvals.

## 8. Compliance & Security
- Threat model maintained in `../08-security/Threat-Model.md`; revisit each quarter.
- DPIA actions tracked and resolved before new region launches.
- Ensure data export/delete endpoints exist for GDPR/CCPA; include audit logs.
- Penetration tests before GA; address critical/high findings prior to launch.

## 9. Open Items / Backlog
- Define cross-region data residency strategy for APAC expansion.
- Evaluate alternative payment providers for markets where Stripe coverage is limited.
- Investigate hardware gateway partnerships for direct inverter integration.
- Decide on canonical timeseries store (Postgres partitions vs Timescale vs Bigtable) before scale >1M readings/day.

All teams must confirm traceability from TRD requirements to implementation issues and tests.

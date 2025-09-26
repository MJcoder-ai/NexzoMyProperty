---
owner: product-team
last_review: 2025-09-25
status: draft
tags: ["prd", "property-management", "solar", "ai"]
references:
  - "../_index/README.md"
  - "../../Interface Design Guidelines for NexzoMyProperty.md"
  - "../../nexzo-myproperty-concept.md"
  - "../../Nexzo MyProperty & OriginFD Integration Plan.md"
  - "../01-architecture/System-Architecture.md"
  - "../02-requirements/TRD.md"
  - "../03-apis/API-Specification.md"
  - "../04-data/Database-Design.md"
  - "../06-ml-ai/Model-Card.md"
---

# Product Requirements Document (PRD)
**Product:** Nexzo MyProperty  
**Audience:** Product, Engineering, Design, Ops, Compliance  
**Goal:** Deliver an AI-assisted, solar-integrated property operations platform that keeps every kWh traceable, every ledger auditable, and every stakeholder informed.

---

## 1. Executive Summary
Landlords struggle to reconcile solar production, grid usage, tenant bills, and maintenance across distributed portfolios. Tenants want transparent charges and support. Service providers need predictable work pipelines. Nexzo MyProperty unifies these experiences with automation, AI copilots, and deep integration into OriginFD for capital projects. The platform ships with:
- A landlord command center with energy, financial and operations intelligence.
- A tenant portal focused on transparency, savings coaching, and payments.
- A service provider hub for work orchestration and escrow.
- Compliance-aware billing that adapts to regional policy and carbon accounting.
- An agentic layer spanning chat UI, allocation engines, anomaly detection, and automation tools.

Our MVP emphasises U.K. and U.S. multi-tenant buildings with rooftop solar, scaling to broader geos and utilities over the roadmap.

---

## 2. Problem, Objectives & Success Metrics
### Problems
1. **Fragmented data:** Meter/inverter feeds, utility bills, and tenant ledgers live in silos.  
2. **Opaque billing:** Solar benefits rarely reach tenants; disputes rise and NPS falls.  
3. **Manual orchestration:** Maintenance, quotes, and compliance tasks rely on spreadsheets.  
4. **Disconnected projects:** Capital projects (e.g. solar installs) run elsewhere with no back-feed into day-to-day ops.

### Objectives
- Trace every unit of energy and every dollar across tenants, units, and service work.
- Automate billing and service workflows while keeping humans in control via the AI copilot.
- Integrate OriginFD project lifecycle data so property and engineering teams stay aligned.
- Provide compliance, privacy and security guardrails from day one.

### Key Metrics
| Metric | Target (Year 1) |
| --- | --- |
| Active managed units | 10k |
| Tenant billing disputes | < 5% of invoices |
| Solar allocation accuracy | ≥ 98% reconciliation within month |
| AI-assisted task resolution rate | ≥ 60% tasks closed without human escalation |
| Service ticket time-to-resolution | < 48h median |

---

## 3. Personas & Journeys
- **Landlord / Portfolio Manager:** Oversees multi-property operations, monitors ROI, approves bills, configures rates.
- **Tenant:** Reviews transparent billing, pays charges, interacts via chat, submits service requests.
- **Service Provider:** Receives AI-curated jobs, submits quotes, schedules work, gets paid through escrow.
- **Property Operations (Internal):** Manages onboarding, compliance, escalations.
- **Finance / Billing Analyst:** Audits ledgers, handles Stripe payouts, reconciles disputes.
- **Compliance Officer:** Reviews regional policies, ensures DPIA actions, manages audits.
- **AI Orchestrator Steward:** Maintains agent registry, prompt library, evaluation suite.

User journeys are captured in `nexzo-myproperty-concept.md` §12 and should stay in sync.

---

## 4. Scope
### In Scope (Phase 1)
- Multi-tenant onboarding, RBAC, organization profiles.
- Property, unit, tenant, meter, and solar asset inventory.
- Billing engine with solar allocation, utility passthrough, Stripe payments.
- AI chat copilot with context from properties, invoices, and service tickets.
- Maintenance request lifecycle (request → quote → work order → escrow payment).
- Integration hooks to OriginFD for capital project creation and status sync.
- Compliance engine for U.K. MRP and U.S. state-level policies.
- Observability: audit logs, cost tracking, anomaly detection.

### Deferred (Phase 2+)
- Tenant mobility network, carbon credit marketplace, EV charging, blockchain receipts.
- White-label experiences, third-party marketplace integrations.
- International expansion beyond initial regions.

---

## 5. Requirements Overview
### Functional Highlights
1. **Energy & Billing Flow:** Collect 15-minute meter data, allocate solar vs grid, produce tenant invoices, support approvals, autopay, payment plans.
2. **Service Orchestration:** Intake requests, auto-match providers, manage quotes, schedule work, release escrow after verification.
3. **AI Agents:** Landlord, Tenant, Service, Finance, Compliance, Energy, and Matching agents with tool access as defined in the registry.
4. **Compliance Engine:** Apply jurisdiction rules, produce disclosures, maintain audit trail, support rate experiments with guardrails.
5. **Integration:** Webhooks and API for linking with OriginFD and external partners (utilities, insurers, credit bureaus).

### Non-Functional
- Availability ≥ 99.9% for core billing APIs; ≥ 99.5% for chat / AI services.
- Data residency: primary deployment in GCP europe-west + us-central with tenant-level routing.
- Security: SOC2-ready controls, MFA for financial operations, encrypted secrets, RLS enforced DB access.
- Accessibility: WCAG 2.1 AA UI, responsive layout per UI guidelines.
- Observability: end-to-end tracing, per-tenant metrics, anomaly alerts for energy and billing.

Detailed requirements captured in `../02-requirements/TRD.md`.

---

## 6. Success Metrics & Analytics
- **Activation:** Time from landlord invite → first approved bill ≤ 7 days.
- **Engagement:** ≥ 70% of tenants reviewing monthly energy insights.
- **Retention:** Tenant churn < 5%; landlord renewal > 90%.
- **Operational Excellence:** All Sev1 incidents resolved within 4 hours; ≤ 1 Sev1 per quarter.

Analytics instrumentation defined in the Observability Runbook.

---

## 7. Roadmap (Phased)
1. **Foundation (0-3 months):** Core billing, tenant/landlord portals, Stripe integration, baseline AI chat, U.K./U.S. compliance, OriginFD webhook stub.
2. **Intelligence (4-6 months):** Forecasting, anomaly detection, ROI simulator, service provider network launch, advanced billing (TOU, tiered), PWA optimisation.
3. **Ecosystem (7-12 months):** Lease automation, multi-utility support, demand response, community features, ESG dashboards.
4. **Scale (12+ months):** International expansion, white-label, EV charging, blockchain audit trail, property marketplace.

---

## 8. Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| Regulatory complexity across regions | Modular compliance engine, legal review gates per release |
| Data privacy for tenant usage | DPIA-driven controls, granular consent, anonymised analytics |
| AI hallucinations or unsafe actions | Guardrails, eval suite, human-in-loop approvals on high-impact tasks |
| Service provider supply constraints | Tiered provider incentives, escrow protection, performance scoring |
| Integration drift with OriginFD | Shared schema contracts, webhook contract tests, joint release checklist |

---

## 9. Acceptance Criteria
- All docs in `/docs` populated and linked.
- API spec validates and covers core objects (tenants, properties, meters, invoices, service tickets, projects).
- Database ERD reviewed with data team and privacy officer.
- AI agents defined with prompt + tool contracts; eval harness runs nightly.
- Compliance sign-off for U.K./U.S. launch and DPIA baseline complete.

---

## 10. Open Questions
- Preconditions for supporting non-solar utilities (gas, water) — captured in TRD backlog.
- Selection of primary meter ingestion partner (CSV, direct utility APIs, hardware vendor connectors).
- Escrow custody options beyond Stripe (e.g., TABA accounts).
- Policy for cross-tenant anonymised benchmarking and opt-out mechanics.

Document owners must update status after each major milestone.

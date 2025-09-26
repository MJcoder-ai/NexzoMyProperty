---
owner: ai-team
last_review: 2025-09-25
status: draft
tags: ["ai", "agents"]
references:
  - "../06-ml-ai/Model-Card.md"
  - "Tool-Catalog.md"
  - "Guardrails-Policy.md"
---

# Agent Registry

Catalog of agents deployed within Nexzo MyProperty. Update when adding, modifying, or retiring agents.

| Agent ID | Purpose | Primary Users | Tools | Notes |
| --- | --- | --- | --- | --- |
| landlord-agent | Explain billing, surface insights, suggest actions | Landlords, property managers | `fetch_property_context`, `generate_invoice_draft`, `adjust_allocation`, `schedule_follow_up` | Requires approval for adjustments |
| tenant-agent | Assist tenants with bills, savings, payments | Tenants | `fetch_property_context`, `create_service_ticket`, `schedule_follow_up` | No access to tenant-wide data |
| service-agent | Route and manage maintenance jobs | Ops, service providers | `recommend_providers`, `schedule_follow_up`, `update_ticket_status` | Limited to business hours actions |
| finance-agent | Reconcile payments, produce summaries | Finance analysts | `generate_invoice_draft`, `create_ledger_entry`, `export_statement` | High audit priority |
| compliance-agent | Draft disclosures, review regional rules | Compliance team | `fetch_compliance_pack`, `generate_disclosure`, `create_audit_log` | Must cite regulation sources |
| energy-agent | Monitor allocations, detect anomalies | Energy analysts | `fetch_allocation_metrics`, `raise_anomaly_alert`, `adjust_allocation` (read-only by default) | Elevated rights behind feature flag |
| matching-agent | Match tenants to properties/providers (future) | Growth team | `recommend_properties`, `recommend_providers` | Phase 2 feature |

## Metadata
- Version: 2025.09.25
- Default temperature: 0.3 for deterministic responses.
- Conversation memory: 20 turns retained per session; new context loaded on property switch.

## Lifecycle
- Proposals submitted via AI change request template.
- Safety review required by AI steward + security.
- Evaluate new agent with scenario set before enabling in production.

Keep registry accurate for operational and compliance purposes.

---
owner: ai-team
last_review: 2025-09-25
status: draft
tags: ["ai", "tools"]
references:
  - "../06-ml-ai/Tool-Specs.md"
  - "Guardrails-Policy.md"
---

# Tool Catalog

| Tool Name | Description | Input | Output | Access | Notes |
| --- | --- | --- | --- | --- | --- |
| `fetch_property_context` | Retrieve property/unit/tenant snapshot | `property_id`, optional `unit_id` | JSON context bundle | All agents (read-only) | Strips PII for tenant requests |
| `generate_invoice_draft` | Compose invoice draft using allocation + rates | `tenant_user_id`, `billing_period`, `notes` | Invoice ID, totals | Landlord, finance | Requires approval workflow |
| `adjust_allocation` | Adjust solar/grid allocation entry | `allocation_id`, `delta_kwh`, `reason` | Updated ledger entry | Landlord (with approval), energy agent | Max ±20% delta |
| `recommend_providers` | Score service providers for ticket | `ticket_id`, optional filters | Ranked providers | Service, landlord agents | Uses provider marketplace data |
| `create_service_ticket` | Open maintenance request | `property_id`, `summary`, `priority` | Ticket ID | Tenant, landlord agents | Prevent duplicates via hash |
| `update_ticket_status` | Progress ticket status/milestone | `ticket_id`, `status`, `note` | Updated ticket | Service agent | Allowed statuses validated |
| `schedule_follow_up` | Create task/reminder | `subject`, `due_at`, `assignee` | Task ID | All agents | Integrates with internal task system |
| `fetch_compliance_pack` | Load regional rule pack | `property_id` | Compliance JSON | Compliance agent | Read-only |
| `generate_disclosure` | Produce invoice disclosure snippet | `invoice_id`, `rule_ids` | Markdown text | Compliance agent | Must cite regulation |
| `raise_anomaly_alert` | Log anomaly for investigation | `property_id`, `metric`, `details` | Alert ID | Energy agent | Notifies ops |
| `create_ledger_entry` | Create manual ledger journal | `journal_type`, `amount`, `reference` | Entry ID | Finance agent | Dual approval required |
| `export_statement` | Generate financial statement PDF | `tenant_id`, `period` | Signed URL | Finance agent | Link expires 1 hour |
| `recommend_properties` | Suggest properties to tenants (future) | `tenant_profile`, `constraints` | Candidate list | Matching agent (experimental) | Offline evaluation only |

Tool definitions must match JSON schemas in `packages/agents/tool_specs`. Update catalog when tools change.

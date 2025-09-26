---
owner: ai-team
last_review: 2025-09-25
status: draft
tags: ["ai", "tools"]
references:
  - "Model-Card.md"
  - "Tool-Catalog.md"
  - "Eval-Plan.md"
---

# Tool Specifications

Tool contracts are defined in JSON/YAML within `packages/agents/tool_specs`. Summary below.

## 1. `fetch_property_context`
- **Description:** Retrieve property, unit, tenant, and billing context scoped to current conversation.
- **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "property_id": {"type": "string", "format": "uuid"},
    "unit_id": {"type": "string", "format": "uuid", "nullable": true}
  },
  "required": ["property_id"]
}
```
- **Output:** JSON document with property metadata, latest allocation, outstanding invoices.
- **Permissions:** Read-only; available to landlord, tenant, and service agents.

## 2. `generate_invoice_draft`
- **Description:** Compose an invoice draft using allocation ledger, rate plans, and manual adjustments.
- **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "billing_period": {"type": "string"},
    "tenant_user_id": {"type": "string", "format": "uuid"},
    "notes": {"type": "string"}
  },
  "required": ["billing_period", "tenant_user_id"]
}
```
- **Output:** Invoice draft ID, total amount, summary.
- **Safety:** Requires human approval before sending; flagged in audit log.
- **Cost:** High (invokes billing service, Stripe taxes). Limited to 20 calls per hour per tenant.

## 3. `recommend_providers`
- **Description:** Score service providers for a ticket using skills, distance, SLA, ratings.
- **Input Schema:** Accepts ticket ID and optional provider filters.
- **Output:** Ranked array with provider IDs, scores, reasons.
- **Safety:** Only landlord/service agents; requires review before auto-assignment.

## 4. `adjust_allocation`
- **Description:** Apply adjustment to allocation ledger with reason codes.
- **Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "allocation_id": {"type": "string", "format": "uuid"},
    "delta_kwh": {"type": "number"},
    "reason_code": {"type": "string"},
    "note": {"type": "string"}
  },
  "required": ["allocation_id", "delta_kwh", "reason_code"]
}
```
- **Safety:** Requires landlord confirmation; max absolute delta 20% from baseline; logs to audit.

## 5. `create_service_ticket`
- **Description:** Generate new maintenance ticket with optional attachments.
- **Input Schema:** Ticket summary, property/unit, priority.
- **Output:** Ticket ID, initial SLA.
- **Safety:** Tenant agent allowed; guardrail ensures no duplicate open ticket for same issue.

## 6. `schedule_follow_up`
- **Description:** Create calendar task/reminder for landlord/ops follow-up.
- **Integration:** Google Workspace or ICS feed; ensures compliance tasks tracked.

## 7. Execution Constraints
- Tools executed via orchestrator; each call includes `trace_id` and `actor` metadata.
- Timeout defaults: 3 s (read), 8 s (write); retries with exponential backoff when safe.
- Tools must be idempotent; require explicit idempotency keys for writes.

## 8. Testing & Validation
- JSON schemas validated in CI.
- Unit tests for each tool handler covering success/failure.
- Red-team scenarios simulate prompt injection attempts to bypass tool restrictions.

Maintain parity between this doc and tool spec files.

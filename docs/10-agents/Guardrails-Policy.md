---
owner: ai-stewardship
last_review: 2025-09-25
status: draft
tags: ["ai", "guardrails"]
references:
  - "Agent-Registry.md"
  - "Tool-Catalog.md"
  - "../08-security/Secure-Prompting-&-PII-Redaction.md"
  - "../06-ml-ai/Eval-Plan.md"
---

# Guardrails Policy

## 1. Principles
- Protect tenant data and financial integrity while leveraging AI assistance.
- Ensure every AI-triggered action is auditable and reversible.

## 2. Access Levels
| Level | Description | Example Agents | Notes |
| --- | --- | --- | --- |
| L0 | Read-only assistance (no tool use) | Tenant agent fallback | Default for unverified contexts |
| L1 | Low-risk tools (context fetch, reminders) | Tenant, landlord | Auto-approved |
| L2 | Medium-risk (service ticket creation, provider recommendations) | Tenant, service | Requires guard checks |
| L3 | High-risk (invoice draft, allocation adjustments, ledger entries) | Landlord, finance, compliance | Requires human confirmation |

## 3. Safeguards
- **Policy Engine:** Evaluate request context (role, tenant, tool, risk) before execution.
- **Confirmation Prompts:** For L3 actions, agent must present summary and request explicit confirmation in UI; default to no.
- **Change Windows:** High-risk writes disabled during maintenance windows or incidents.
- **Rate Limits:** Max 5 high-risk actions per hour per tenant unless override approved.
- **Audit:** Log actor, tool, inputs, outputs, decision, model version.

## 4. Content Restrictions
- Block prompts containing hate speech, self-harm, or disallowed content; escalate to human agent.
- Disallow direct legal/financial advice beyond system guidance.
- Provide disclaimers when AI outputs estimates or recommendations.

## 5. Review Process
- Guardrail policies reviewed monthly by AI steward + security.
- Any override must be documented with expiry date and mitigation.
- Run safety eval suite before guardrail changes.

## 6. Incident Handling
- Trigger incident (Sev1/Sev2) if guardrail breach occurs.
- Disable offending tool/agent and notify stakeholders.
- Perform root cause analysis, update prompts/policies.

## 7. Future Enhancements
- Adaptive guardrails based on tenant risk profile.
- Automatic detection of repeated refusal patterns for UX improvements.

Ensure guardrails documented here match orchestrator configuration.

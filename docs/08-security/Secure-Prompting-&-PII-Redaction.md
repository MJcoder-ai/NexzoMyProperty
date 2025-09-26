---
owner: ai-security
last_review: 2025-09-25
status: draft
tags: ["ai", "security", "prompting"]
references:
  - "../06-ml-ai/Prompt-Library.md"
  - "Guardrails-Policy.md"
  - "../04-data/Data-Governance.md"
---

# Secure Prompting & PII Redaction

## 1. Goals
- Ensure user data is not exposed unnecessarily to LLMs.
- Maintain consistent behaviour against prompt injection or jailbreak attempts.

## 2. Prompt Hygiene Rules
- All prompts include explicit system message defining role, scope, refusal policy.
- Use contextual variables rather than raw SQL results; limit to necessary fields.
- Add guardrail instructions: "If asked for information about other tenants, refuse politely."
- Insert safety reminders when tool invocation requested ("Confirm that the user has granted permission...").

## 3. PII Handling
- Redact emails, phone numbers, bank info before sending to LLM using configurable regex + entity recogniser.
- Store both redacted and original context separately; only redacted context leaves trusted boundary.
- Provide `{{pii_placeholder}}` tokens and restore after response when safe.
- Log redaction events for audit.

## 4. Content Filtering
- Run outbound responses through safety filter to catch inappropriate content (hate, self-harm, policy violations).
- Escalate flagged responses for human review before delivery.

## 5. Prompt Injection Defenses
- Maintain allowlist of tool names; agent cannot create dynamic tool requests.
- Validate tool arguments server-side (type, tenant scoping).
- If prompt contains suspicious patterns (`ignore previous instructions`, `BEGIN SQL`), treat as high risk and hand off to human agent.
- Security evaluation suite includes injection templates from OWASP LLM Top 10.

## 6. Logging & Monitoring
- Store original user prompt, redacted prompt, model response, tool calls in audit log (encrypted).
- Monitor for repeated refusal triggers to identify knowledge gaps.
- Report injection attempts to security team.

## 7. User Communication
- Chat UI informs tenants when AI declines to answer and provides manual support option.
- Provide privacy notice explaining AI usage and redaction policies.

## 8. Change Management
- Prompt updates require review from AI steward + security engineer.
- Run regression tests before deployment.

Adhere to this guide when creating or updating prompts and tooling.

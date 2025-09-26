---
owner: security-team
last_review: 2025-09-25
status: draft
tags: ["security", "red-team", "ai"]
references:
  - "../08-security/Security-Guidelines.md"
  - "../06-ml-ai/Guardrails-Policy.md"
  - "Incident-Playbooks.md"
---

# Red Team Plan

## 1. Purpose
Exercise Nexzo MyProperty defenses, especially AI-enabled features, to detect vulnerabilities before attackers do.

## 2. Scope
- Web and admin applications.
- API gateway and service endpoints.
- AI copilot (chat interface, tools, prompt ingestion).
- Integration points (Stripe, OriginFD webhooks, utility APIs).
- Infrastructure (Cloud Run, Cloud SQL, Redis, storage buckets).

## 3. Engagement Types
| Type | Description | Cadence |
| --- | --- | --- |
| Internal tabletop | Scenario-based incident response rehearsal | Quarterly |
| Adversarial simulation | Red team vs blue team exercise covering auth, API abuse, AI prompt injection | Semi-annual |
| Automated scanning | Dynamic testing using ZAP/Burp and LLM-specific fuzzers | Monthly |
| Third-party penetration test | External vendor assessment | Annually |

## 4. AI-Focused Tests
- Prompt injection attempts to bypass guardrails and trigger `adjust_allocation` or `generate_invoice_draft` without approval.
- Data exfiltration via AI (requesting other tenant data, PII leakage).
- Token smuggling: verifying tools enforce tenant scoping even when agent attempts cross-tenant IDs.
- Safety evaluation: ensure refusal to provide legal/financial advice beyond scope.

## 5. Logistics
- Establish rules of engagement; production testing requires approval.
- Create dedicated red-team tenant and sandbox to avoid impacting customers.
- Provide monitoring hooks to red team (`ai.agent.audit`, security logs).

## 6. Reporting & Remediation
- Findings documented with severity, reproduction steps, impact.
- Owners assigned with remediation deadlines (30 days high, 90 days medium, 180 low).
- Track progress in security Jira board; verify fixes with regression tests.

## 7. Tooling
- LLM adversarial frameworks (Gandalf, PromptBench).
- Traditional tools: Burp Suite, Nmap, OWASP ZAP, CloudSploit.
- Custom scripts for API fuzzing (`scripts/security/`).

## 8. Success Metrics
- Time to detect simulated attack.
- Mean time to remediate high severity findings.
- Reduction in repeated findings between cycles.

Align exercise schedule with compliance requirements (SOC2, ISO 27001).

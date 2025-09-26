---
owner: security-team
last_review: 2025-09-25
status: draft
tags: ["threat-model", "security"]
references:
  - "Security-Guidelines.md"
  - "../01-architecture/System-Architecture.md"
  - "../04-data/DPIA.md"
  - "../06-ml-ai/Guardrails-Policy.md"
---

# Threat Model – Nexzo MyProperty

## 1. Architecture Summary
Assets: Web/admin apps, API gateway, backend services, AI orchestrator, workers, database (Postgres), Redis, storage, external integrations (Stripe, OriginFD, utilities), notifications.

## 2. Trust Boundaries
- **Client ↔ Gateway:** Browser/mobile to Cloud Run; TLS required.
- **Gateway ↔ Services:** Authenticated internal traffic; JWT + IAM.
- **Services ↔ Database/Redis:** Private VPC, service accounts.
- **AI Orchestrator ↔ LLM provider:** External outbound; guardrails applied.
- **Webhook Integrations:** Stripe/OriginFD inbound via public endpoint.

## 3. Assets & Sensitivities
| Asset | Sensitivity |
| --- | --- |
| Tenant PII | High |
| Billing & Payment Data | High |
| Energy usage telemetry | Medium |
| AI prompt/response logs | Medium |
| Credentials/Secrets | Critical |

## 4. Threat Scenarios
| ID | Scenario | Impact | Likelihood | Mitigations |
| --- | --- | --- | --- | --- |
| T1 | Compromised tenant credential logs in, exfiltrates data | High | Medium | MFA, anomaly detection, RBAC |
| T2 | API key leakage causing mass data export | High | Low | Rate limiting, IP allowlists, monitoring |
| T3 | Prompt injection causing unauthorized tool action | High | Medium | Guardrails, tool policy checks, confirmation dialogs |
| T4 | SQL injection in API service | High | Low | ORM, prepared statements, SAST |
| T5 | Stripe webhook spoofed | High | Low | Signature validation, replay protection |
| T6 | Service provider portal cross-tenant data leakage | High | Low | RLS, tenant scoping in queries |
| T7 | Cloud SQL credential exposure via misconfigured IAM | High | Low | IAM least privilege, secret rotation, audit logs |
| T8 | OriginFD integration sends malicious payload | Medium | Low | Schema validation, allowlist events |
| T9 | AI model outputs PII of other tenants | Medium | Medium | Context scoping, PII redaction, evaluation |
| T10 | Insider modifies ledger entries bypassing approvals | High | Low | Dual control, audit logs, immutable ledger |

## 5. Mitigation Summary
- Enforce security headers (CSP, HSTS, X-Frame-Options).
- Rate limit login, API, and webhook endpoints.
- Use WAF with bot protection.
- Run dependency scanning and patching policy.
- Monitor unusual billing adjustments and service ticket activity.

## 6. Residual Risks
- Dependence on third-party LLM reliability and potential data retention.
- Social engineering against landlords/tenants leading to fraud.
- Hardware integrator security posture (future integration).

## 7. Action Items
- [ ] Implement anomaly detection on login patterns.
- [ ] Establish kill-switch for AI tools (feature flag) — due Q4 2025.
- [ ] Conduct joint tabletop with OriginFD for shared incident response.

Review this threat model quarterly or after major architectural changes.

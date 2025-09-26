---
owner: sre-team
last_review: 2025-09-25
status: draft
tags: ["slo", "reliability"]
references:
  - "Observability-Runbook.md"
  - "Deployment-Infrastructure.md"
---

# Service Level Objectives (SLOs)

## 1. Overview
Reliability targets for Nexzo MyProperty services. Error budgets calculated monthly.

## 2. SLO Summary
| Service | SLI | Target | Measurement |
| --- | --- | --- | --- |
| Gateway API | Availability (success responses / total) | 99.9% | Cloud Monitoring uptime checks |
| Billing Service | Successful invoice generation (%) | 99.5% | Ratio of invoices created vs attempted |
| Meter Ingestion | Timely processing (≤5 min lag) | 99.0% | Pub/Sub lag metrics |
| AI Orchestrator | Tool success rate | 95% | agent audit | 
| Tenant Chat | P95 latency < 3 s | 99% | OTEL traces |
| Payment Processing | Settled payments within 2 hours | 99.8% | Stripe webhook + ledger entries |

## 3. Error Budgets
- Gateway: 43 min / month downtime budget.
- Billing: 3.6 hours/month of failed invoice attempts.
- Meter ingestion: 7.2 hours/month allowed above lag threshold.

## 4. Alerting Policy
- Burn rate alerts at 2% (warning) and 10% (critical) consumption of error budget over rolling 1h and 6h windows.
- Automate Slack notifications to #oncall, integrate with PagerDuty.

## 5. Dependencies & Contracted SLAs
- Stripe SLA 99.9%; monitor and adjust error budget when third-party issues ongoing.
- OpenAI/LLM provider SLA 99.9%; fallback to secondary if degradation >10 minutes.
- OriginFD API: coordinate SLO reviews quarterly.

## 6. Review Cadence
- SLO review monthly in reliability council meeting.
- Adjust targets as platform scales (e.g., upgrade gateway to 99.95% when traffic warrants).

## 7. Reporting
- Monthly SLO report in Notion/Confluence, includes uptime, incidents, corrective actions.
- Error budget policy: freeze feature deploys if budget exhausted until corrective action plan approved.

Keep SLOs aligned with customer contracts and postmortem learnings.

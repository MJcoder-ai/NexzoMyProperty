---
owner: finance-ops
last_review: 2025-09-25
status: draft
tags: ["cost", "budget", "ai"]
references:
  - "../06-ml-ai/Model-Card.md"
  - "Deployment-Infrastructure.md"
  - "SLOs.md"
---

# Cost & Token Budgeting

## 1. Objectives
- Keep cloud and AI spend within planned budgets while supporting growth.
- Provide visibility to stakeholders with per-tenant cost allocation.

## 2. Budget Overview (Monthly)
| Category | Budget | Notes |
| --- | --- | --- |
| Cloud Run & Compute | $18,000 | Includes autoscaling buffer |
| Cloud SQL & Storage | $7,500 | HA Postgres, BigQuery slots |
| Redis / PubSub | $2,000 | |
| Vercel & Frontend | $1,200 | Web, docs |
| Stripe Fees | 2.9% + $0.30 per txn | Pass-through to tenants |
| LLM Usage | $6,000 | GPT-4.1 primary |
| Observability | $1,000 | Cloud Monitoring, logging |
| Misc (email, SMS) | $800 | Postmark, Twilio |

## 3. Token Budgeting
- **Base allowance:** 100K tokens/day per tenant for chat interactions.
- **Burst allowance:** Additional 50K tokens/day for high usage; tracked via feature flags.
- **Cost tracking:** Orchestrator publishes cost metrics per tenant to BigQuery; dashboards show $$ per action.
- **Fallback routing:** Use cheaper model (Claude Haiku, GPT-4.1 mini) when conversation classified as low-risk.
- **Caching:** Retrieve previous responses for repeated queries to reduce token spend.

## 4. Metering & Chargeback
- Tag all resources with `tenant`, `environment`, `service` labels.
- BigQuery cost allocation jobs aggregate spend; monthly landlord bill summarises platform fees vs pass-through.
- Evaluate usage-based pricing triggers (units >20) against cost.

## 5. Alerting
- Budget alerts at 70%, 90%, 100% of monthly forecast (GCP Budget API + Slack notifications).
- AI spend alert when daily tokens exceed 120% of forecast.
- Run bookings vs budget review weekly with finance.

## 6. Optimisation Levers
- Autoscale min instances during off-peak hours.
- Batch meter ingestion to reduce Pub/Sub overhead.
- Use BigQuery reservations instead of on-demand when volume increases.
- Archive old chat transcripts to Nearline storage after 12 months.
- Explore dedicated LLM contracts for committed use discounts.

## 7. Reporting
- Monthly cost memo summarising actual vs budget, drivers, corrective actions.
- Share insights with product to adjust pricing tiers (see `nexzo-myproperty-concept.md` revenue model).

Update budgets each quarter or when customer growth accelerates beyond forecast.

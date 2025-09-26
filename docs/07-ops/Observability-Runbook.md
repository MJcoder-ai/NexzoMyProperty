---
owner: sre-team
last_review: 2025-09-25
status: draft
tags: ["observability", "runbook"]
references:
  - "SLOs.md"
  - "Incident-Playbooks.md"
  - "Deployment-Infrastructure.md"
---

# Observability Runbook

## 1. Telemetry Stack
- **Tracing:** OpenTelemetry SDKs instrument gateway, services, AI orchestrator. Export to Cloud Trace.
- **Metrics:** Cloud Monitoring custom metrics via OpenTelemetry collector (deployed under `infra/observability`).
- **Logging:** Structured JSON logs shipped to Cloud Logging with sinks to BigQuery for analytics.
- **Alerting:** Cloud Monitoring alert policies mapped to PagerDuty and Slack.

## 2. Key Dashboards
| Dashboard | Description |
| --- | --- |
| API Gateway | Request rate, latency, error rate (4xx/5xx) per endpoint & tenant |
| Billing Pipeline | Invoice generation throughput, Stripe failures, allocation drift |
| Meter Ingestion | Lag, failure counts, anomaly detections |
| AI Agents | Tool call success, latency, safety violations, cost per task |
| Service Tickets | Queue backlog, SLA adherence |

## 3. Metrics to Watch
- `gateway/request_latency_p95` < 400 ms.
- `billing/invoices_generated_total` vs expected monthly volume.
- `allocation/drift_percentage` < 2% daily.
- `ai/tool_failure_ratio` < 5%.
- `service_tickets/backlog` < 20 per tenant.
- Infrastructure: CPU/memory for key services, Cloud SQL connections, Redis evictions.

## 4. Alerts & Thresholds
| Alert | Condition | Action |
| --- | --- | --- |
| Gateway Errors | 5xx rate > 2% for 5 min | Page on-call, check recent deploys, roll back if needed |
| Stripe Failures | `payment.failed` events > 5 in 10 min | Verify Stripe status, investigate logs |
| Allocation Drift | Daily drift > 5% | Trigger anomaly investigation, notify data team |
| AI Safety | `ai.agent.audit` outcome = error > 3/min | Disable risky tool, escalate to AI steward |
| Database Connections | Utilisation > 80% | Scale Cloud SQL or inspect poolers |

## 5. Troubleshooting Steps
### Gateway 5xx Spike
1. Check Cloud Monitoring for correlated deploys (revision IDs).
2. Inspect logs for error codes (`trace_id` to follow through services).
3. Use `kubectl` (for collectors) or Cloud Run logs to isolate service.
4. Roll back to previous revision if root cause unclear.

### Billing Job Failures
1. Inspect Pub/Sub dead-letter queue.
2. Review allocation worker logs for parsing errors.
3. Validate database connectivity and Stripe availability.
4. Manually requeue failed jobs via `scripts/ci/requeue_billing.ps1`.

### AI Tool Errors
1. Query `agent_audit` table for failing tool names.
2. Review prompt inputs; ensure PII redaction working.
3. Run targeted evals (`pnpm eval:run --filter <tool>`).
4. Temporarily disable tool via feature flag if necessary.

## 6. Logging Guidance
- Include `tenant_id`, `property_id`, `trace_id`, `actor_type` in log fields.
- Use severity levels consistently (`DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL`).
- PII masks applied before logging; sensitive payloads stored in encrypted vault accessible via privileged tooling only.

## 7. On-Call Checklist
- Review overnight alerts and dashboards at shift start.
- Verify backups completed (Cloud SQL, GCS) and replication healthy.
- Confirm red-team or load tests scheduled; adjust alert thresholds accordingly.
- Document incidents in PagerDuty with tags.

## 8. Tooling
- `scripts/observability/` for querying logs, traces.
- Use `gcloud logging read` for ad-hoc queries when console unavailable.
- `otto` or `lightstep` exporters can be added if multi-cloud required.

Keep this runbook updated as telemetry stack evolves.

---
owner: ops-team
last_review: 2025-09-25
status: draft
tags: ["incident-response"]
references:
  - "Observability-Runbook.md"
  - "SLOs.md"
  - "Red-Team-Plan.md"
---

# Incident Playbooks

## 1. General Process
1. **Detect:** Alert triggers via PagerDuty/Slack.
2. **Triage:** Incident commander (IC) assigned, scribe appointed, severity assessed.
3. **Mitigate:** Follow playbook steps, communicate status updates every 30 minutes.
4. **Resolve:** Confirm service restoration, monitor for regression.
5. **Postmortem:** Document root cause, corrective actions within 5 business days.

Severity levels: Sev0 (regulatory impact), Sev1 (major outage), Sev2 (partial), Sev3 (degraded), Sev4 (informational).

## 2. Billing Failure (Sev1)
**Symptoms:** Invoice generation job failing, Stripe webhooks missing, landlords unable to approve bills.

Steps:
1. Verify Cloud Monitoring alert `billing_invoice_failure` triggered.
2. Check Pub/Sub backlog; inspect worker logs for errors.
3. Validate database connectivity; run `SELECT count(*) FROM invoice_jobs WHERE status='failed' AND created_at > now() - interval '1 hour'`.
4. If upstream service (Stripe) outage, activate fallback: pause billing approvals, notify customers via status page.
5. Re-run failed jobs using `scripts/ci/requeue_billing.ps1` after fix.
6. Record affected tenants and invoices; coordinate messaging with support.

## 3. Meter Ingestion Lag (Sev2)
**Symptoms:** Telemetry delayed > 30 minutes; allocation accuracy drops.

Steps:
1. Check Pub/Sub lag metrics; confirm ingestion workers healthy.
2. Review GCS ingestion bucket for stuck files.
3. Inspect external integrations (utility API downtime?).
4. Scale ingestion workers (increase Cloud Run instances) if CPU-bound.
5. Notify data team; run anomaly detection catch-up once backlog cleared.
6. Document missing intervals; ensure adjustments in billing cycle.

## 4. AI Agent Misbehaviour (Sev1/Sev2)
**Symptoms:** Agent suggesting incorrect billing adjustments or leaking data.

Steps:
1. Disable impacted tool via feature flag (`packages/agents/feature_flags`).
2. Review `agent_audit` entries for scope and impacted tenants.
3. Trigger red-team investigation; run targeted evals.
4. Communicate with support if tenant-facing impact.
5. Restore tool only after root cause resolved and tests pass.

## 5. Security Breach Suspected (Sev0)
**Symptoms:** Unauthorised access alerts, suspicious admin actions, leaked credentials.

Steps:
1. Activate incident response: notify CISO, legal, leadership.
2. Revoke affected tokens/keys; rotate secrets (Stripe, JWT, API keys).
3. Capture forensic data (logs, database snapshots).
4. Engage external IR firm if needed; follow DPIA breach reporting (<72h).
5. Prepare customer communication template.

## 6. OriginFD Integration Failure (Sev2)
**Symptoms:** Project status updates not syncing, project creation failing.

Steps:
1. Check webhook logs (`originfd.project.sync`).
2. Validate OriginFD API availability; contact OriginFD ops if needed.
3. Retry sync jobs manually using `scripts/ci/sync_originfd.ps1`.
4. Inform internal project managers; provide manual status export if necessary.

## 7. Postmortem Template Highlights
- Timeline, impact, root cause, contributing factors.
- Detection & response evaluation.
- Action items with owners and due dates.
- Lessons learned & follow-up tasks linked to Jira.

Maintain playbooks alongside evolving architecture.

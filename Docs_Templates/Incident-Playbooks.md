---
owner: oncall-team
last_review: 2025-09-21
status: template
tags: ["incident-response", "ops", "ai-platform", "security", "multi-tenant"]
references:
  - "../Observability-Runbook.md"
  - "../SLOs.md"
  - "../Deployment-Infrastructure.md"
  - "../../08-security/Security-Guidelines.md"
  - "../../08-security/Threat-Model.md"
  - "../../06-ml-ai/Eval-Plan.md"
  - "../../06-ml-ai/Tool-Specs.md"
  - "../../06-ml-ai/Model-Card.md"
  - "../../06-ml-ai/Prompt-Library.md"
  - "../../09-governance/Versioning-Policy.md"
  - "../../09-governance/API-Governance.md"
---

# Incident Playbooks — AI Agentic Platform (Multi‑Tenant, Multi‑User, Multi‑Domain)

> **Purpose.** Operational, practical, _copy‑paste runnable_ guidance for handling the top incidents you’ll face in an AI agentic, multi‑tenant SaaS. These playbooks integrate with our SLOs, Observability Runbook, Security Guidelines, Threat Model, and Eval Plan.

---

## 0) How to use this document

1. **Decide severity** with the SEV matrix below.
2. **Declare the incident** (open a ticket and page on‑call).
3. **Assign ICS roles:** _Incident Commander (IC)_, _Comms Lead_, _Ops Lead_, _Security Lead_ (as needed), _Scribe_.
4. **Follow the global 15‑minute checklist**; then jump to the relevant playbook.
5. **Stabilise → Mitigate → Recover → Post‑mortem**. Keep status updates flowing.

### 0.1 Severity matrix (SEV)

| SEV | Customer impact | Scope | SLO breach | Examples |
|-----|------------------|-------|------------|----------|
| **SEV‑1 (P0)** | Broad outage/data exposure | Multi‑region or many tenants | Active/inevitable | API 5xx > 50%, tenant isolation failure, data breach |
| **SEV‑2 (P1)** | Major degradation | Single region / many users | Likely | LLM provider outage, DB failover, cost runaway |
| **SEV‑3 (P2)** | Partial impairment | Specific feature or tenant | Maybe | Tool registry down, queue backlog, prompt injection attempt |
| **SEV‑4 (P3)** | Minor defect | Workaround exists | No | Single component bug |
| **SEV‑5 (P4)** | Cosmetic | None | No | UI glitch, docs typo |

> **Rule of thumb:** If you’re unsure, **page as SEV‑2** and adjust after triage.

### 0.2 Roles & RACI (Incident Command System)

- **Incident Commander (IC):** Owns decisions, severity, comms cadence.
- **Ops Lead:** Mitigation, rollback, scaling, infra changes.
- **Security Lead:** Forensics, breach handling, notifications.
- **Scribe:** Accurate timeline of events (times in UTC ISO‑8601).
- **Comms Lead:** Customer Status Page, support macros, stakeholder updates.

### 0.3 Global first‑15‑minutes checklist (printable)

- [ ] Declare incident; assign **IC** and **Scribe**.
- [ ] Set **comms cadence** (e.g., every 30 min for SEV‑1/2).
- [ ] Freeze deploys: `change_freeze = ON`.
- [ ] Snapshot telemetry links (dashboards, traces, logs).
- [ ] Identify blast radius (which tenants/regions/endpoints).
- [ ] Choose **playbook** below and begin mitigation.
- [ ] Create shared war‑room (chat channel) + bridge.
- [ ] Draft Status Page update; notify support/execs as needed.

---

## 1) Universal procedures & snippets

### 1.1 Standard communications (fill in your systems)

**Internal (war‑room):**  
- `#inc-YYYYMMDD-<short-name>` channel created by IC  
- Pinned: runbook links, dashboards, on‑call rota, latest status

**Customer Status Page (template):**  
> _Identified (hh:mm UTC)_ — We are investigating elevated errors affecting **{services}**. Mitigation is in progress. Next update in **30 minutes**.

> _Monitoring (hh:mm UTC)_ — A fix has been deployed. We are monitoring recovery and will provide a final update within **60 minutes**.

**Support macro (email/chat):**  
> We’re experiencing an incident impacting **{feature}** for some customers. Our engineers are working on it with high priority. Status: **{link}**. We’ll keep you updated.

### 1.2 Change freeze and rollback

```bash
# Cloud Run: freeze deploy and rollback last release
gcloud run services update-traffic api --to-revisions LATEST=0  # stop auto-traffic
gcloud run services update-traffic api --to-revisions {good_rev}=100

# Kubernetes (if applicable): scale down new replica set
kubectl rollout undo deploy/api
kubectl scale deploy/orchestrator --replicas=0  # stop runaway jobs
```

### 1.3 Feature flags & policy clamps

```bash
# Disable heavy AI features / autonomy
flags set orchestrator.autonomy=off
flags set scheduler.enabled=false
flags set tools.high_psu=off

# Clamp budgets per tenant (PSU/token caps)
policy set tenant/*/psu_daily_cap=0
policy set tenant/*/llm_rate=low
```

### 1.4 Cache and queue controls

```bash
# Redis
redis-cli INFO | grep -E "used_memory_human|evicted_keys"
redis-cli FLUSHDB       # only if safe; prefer targeted key deletion
redis-cli KEYS "cag:*:model:*" | xargs redis-cli DEL

# Workers
celery -A workers purge  # confirm! clears pending tasks
```

### 1.5 Data protection quick‑actions

```bash
# Secrets rotation (example)
gcloud secrets versions add OPENAI_API_KEY --data-file ./new-key.txt
gcloud run services update orchestrator --update-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest

# Force logout all sessions
POST /api/v1/auth/sessions/revoke_all  # admin only
```

---

## 2) Playbooks (by scenario)

Each playbook contains: **Triggers → Triage → Mitigation → Recovery → Comms → Post‑incident tasks**.

### 2.1 SEV‑1: Production outage (HTTP 5xx spike / downtime)

**Triggers**
- Availability drops below SLO; API 5xx > 5% for 5 minutes; p99 latency > 2× baseline.

**Triage**
- Check `status/health` endpoints; confirm infra vs app scope.
- Identify last change (deploy, config, migration).

**Mitigation**
- Roll back to last green revision.  
- Enable read‑only mode if writes unsafe.  
- Scale up instances; enable circuit breakers and rate limits.

**Recovery**
- Verify SLO trends normalising; re‑enable features gradually.  
- Unfreeze deploy after 60 min stable.

**Comms**
- Status Page: Identified → Monitoring → Resolved.

**Post‑incident**
- Capture timelines, contributing causes, preventing actions.
- Add regression tests and monitors.

---

### 2.2 LLM provider outage/degradation (OpenAI/Anthropic/etc.)

**Triggers**
- Upstream 5xx/429; latency > 5s; timeouts in orchestrator.

**Mitigation**
- **Failover** via ModelSelector to secondary model/provider.  
- **Degrade** to retrieval‑only answers for chat; block high‑PSU tools.  
- **Backoff** retries; cache recent answers (CAG).

**Recovery**
- Canary a small % of traffic back to primary; watch quality and latency.

**Post‑incident**
- Update Tool Specs with failover policy; add provider‑health probes.

---

### 2.3 Prompt injection / unsafe output detected

**Triggers**
- Guardrail trip; tool call with anomalous args; jailbreak content in logs.

**Mitigation**
- **Quarantine session** (block further tool calls); flag tenant/user.  
- Switch to **strict prompt profile**; enforce schema‑validated outputs.  
- Patch vulnerable tools to validate inputs; add allow‑lists/deny‑lists.

**Forensics**
- Preserve chat, tool I/O, evidence; do not alter raw logs.  
- If data exfil suspected, hand over to Security Lead.

**Post‑incident**
- Add red‑team test to Eval Plan; update prompt templates and Critic rules.

---

### 2.4 Suspected data breach / PII leak

**Triggers**
- DLP alerts; anomalous exports; public claims; leaked credentials.

**Immediate actions (Security‑led)**
- Isolate affected systems; **revoke keys/tokens**; rotate secrets.  
- Restrict access to incident responders; enable enhanced logging.  
- Preserve evidence (disk snapshots/logs).

**Notifications**
- IC coordinates with Legal/Privacy for regulatory timelines.  
- Customer communications via Comms Lead; transparent and factual.

**Post‑incident**
- Root cause + containment + eradication + recovery; update DPIA and Security Guidelines.

---

### 2.5 Multi‑tenant isolation failure (data crossed tenants)

**Triggers**
- RLS violation alert; cross‑tenant object ID observed; customer report.

**Mitigation**
- Immediately **disable suspect endpoints**; set platform to **read‑only** for affected region.  
- Run tenant‑scoped integrity checks; snapshot DB; identify leaked records.  
- Hotfix: enforce RLS/policy at service and DB layer.

**Comms**
- Proactive outreach to impacted tenants; incident letter with scope & remediation.

**Post‑incident**
- Add contract tests for tenancy, expand canaries, run privacy postmortem.

---

### 2.6 Cost anomaly / token‑spend runaway

**Triggers**
- Token usage > 3× baseline; PSU budget hit; sudden spike per tenant/agent.

**Mitigation**
- **Clamp budgets** (policy router); disable autonomous scheduler.  
- Identify runaway loop (trace IDs); kill long‑running jobs.  
- Switch heavy tasks to batch/off‑peak or cheaper models.

**Post‑incident**
- Add budget alarms and kill‑switch hooks; refine guardrails/prompt constraints.

---

### 2.7 Model drift / quality regression

**Triggers**
- Eval suite fails; complaint spike; accuracy metrics dip; higher deflection to human support.

**Mitigation**
- **Rollback model/prompt version** in Model Registry/Prompt Library.  
- Re‑enable previous guard chains; purge tainted caches.  
- Pause canary until evaluation passes.

**Post‑incident**
- Update Model Card; add new eval cases; schedule retrain/fine‑tune plan.

---

### 2.8 Queue backlog / worker starvation (latency SLO burn)

**Triggers**
- Queue depth > threshold; job age growing; timeouts in API.

**Mitigation**
- Scale workers; add rate limits and backpressure to API.  
- Drop/skip non‑critical jobs; prioritise critical queues.  
- Investigate deadlocks and external dependencies.

**Recovery**
- Drain queues; re‑enable background jobs progressively.

---

### 2.9 Database primary failure / replication lag

**Triggers**
- Primary unavailable; failover occurs; read replicas stale.

**Mitigation**
- Promote replica; **switch services to read‑only** if data integrity at risk.  
- Queue writes; throttle heavy read endpoints; warm caches.  
- Confirm RPO/RTO within objectives.

**Post‑incident**
- Run failover game‑day learnings; tune timeouts and pool sizes.

---

### 2.10 Secret/API‑key compromise

**Triggers**
- Unauthorised calls; Git leak; credential stuffing.

**Mitigation**
- **Revoke & rotate** secrets; invalidate sessions; update allow‑lists.  
- Add WAF rules; increase auth friction (MFA).

**Post‑incident**
- Add pre‑commit secret scanning; enforce short token TTLs; tighten scopes.

---

### 2.11 Cache poisoning / stale grounding (RAG/CAG drift)

**Triggers**
- Incorrect answers referencing outdated or malicious sources; low cache hit quality.

**Mitigation**
- **Invalidate** affected keys; disable CAG fallback for impacted domains.  
- Re‑fetch sources; enable source‑of‑truth pinning; increase freshness checks.

**Post‑incident**
- Add drift detectors; expiration policies; provenance scoring in retriever.

---

### 2.12 Supply‑chain vulnerability (high CVE in critical package)

**Triggers**
- SCA scan alert for high/critical CVE in runtime path.

**Mitigation**
- Patch or pin to safe version; rebuild and **canary** before full rollout.  
- Blocklist compromised versions in CI.

**Post‑incident**
- Add SBOM attestation checks; scheduled dependency audits.

---

## 3) Coordination with SLOs & Observability

- **Declare SLO burn** if error budget for the window is exhausted; engage Prod Review.  
- **Link dashboards** for latency, error rate, availability, token usage, cost per request, model quality (evals).  
- **Trace IDs everywhere:** include in comms and tickets.

---

## 4) Templates

### 4.1 Incident Ticket

```md
**Title:** [SEV‑X] <short description>
**Start:** 2025‑01‑01T12:34:56Z
**IC:** <name> • **Scribe:** <name>
**Scope:** Tenants/regions/features affected
**Impact:** What users see / % traffic
**Hypotheses:** <list>
**Actions taken:** <timeline bullets, with UTC times>
**Next update:** <time + channel>
```

### 4.2 Blameless Post‑mortem (due within 5 business days)

```md
## Summary
What happened, why it mattered, user impact, time to detect/mitigate/resolve.

## Timeline (UTC)
- 12:34 Detect — monitor fired (link)
- 12:36 Declare — IC set, severity SEV‑2
- ...

## Root Causes & Contributing Factors
- Primary:
- Contributing:

## What Went Well / What Didn’t
- + Pager escalation worked fast
- – Canary missing for X

## Remediations (DOR/owner/date)
- [ ] Add tenancy contract tests — Owner — 2025‑10‑15
- [ ] Budget clamp for agent loops — Owner — 2025‑10‑08

## Attachments
Dashboards, traces, diffs, PRs.
```

---

## 5) Fill‑in‑the‑blanks (org‑specific)

- PagerDuty/On‑Call rotation: **<link>**  
- Status Page: **<link>**  
- War‑room chat template: **#inc-YYYYMMDD-XXXX**  
- Customer comms contacts: **<emails>**  
- Legal/Privacy contacts (breach): **<emails>**  
- Critical dashboards: **<links>**

---

### Appendix A — One‑page quick sheet (print)

1. Declare → Assign roles → Freeze deploys.  
2. Identify blast radius and pick playbook.  
3. Stabilise: roll back, scale, clamp, disable.  
4. Recover and monitor; communicate regularly.  
5. Post‑mortem and preventative actions.

---

### Appendix B — Cross‑references

- See **Observability‑Runbook** for dashboards, queries, and triage flow.
- See **SLOs** for error budgets and burn policies.
- See **Security‑Guidelines** and **Threat‑Model** for breach and isolation incidents.
- See **Eval‑Plan** for model quality regression responses.
- See **Tool‑Specs**, **Model‑Card**, **Prompt‑Library** for model/prompt/tool rollbacks.
- See **Versioning‑Policy** and **API‑Governance** for rollback/deprecation rules.

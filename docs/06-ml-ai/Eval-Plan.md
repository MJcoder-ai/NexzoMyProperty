---
owner: ai-stewardship
last_review: 2025-09-25
status: draft
tags: ["ai", "evaluation"]
references:
  - "Model-Card.md"
  - "Tool-Specs.md"
  - "Guardrails-Policy.md"
---

# AI Evaluation Plan

## 1. Objectives
Ensure Nexzo MyProperty agents remain accurate, safe, and cost-effective. Detect regression before it impacts production users.

## 2. Evaluation Types
| Eval | Purpose | Frequency |
| --- | --- | --- |
| Baseline QA | Validate prompt outputs on canonical scenarios | Nightly |
| Tool Success | Confirm each tool contract executes correctly | Nightly |
| Safety Guardrails | Test prompt injection, data exfiltration attempts | Weekly |
| Cost Monitoring | Track token spend vs budget | Continuous |
| User Feedback Loop | Review thumbs up/down + manual escalations | Weekly |
| Human-in-loop Review | Random sample of high-impact actions | Weekly |

## 3. Scenario Library
- **Billing Explanation:** 30 curated test cases covering solar-heavy, grid-heavy, shared meters.
- **Anomaly Diagnosis:** Cases with missing data, meter fault, sudden spike.
- **Service Routing:** Tickets with varying provider availability.
- **Compliance Messaging:** Region-specific disclosures (UK MRP, US-CA, US-NY).
- **Tenant Savings Tips:** Personalized suggestion tests ensuring fairness.

Scenarios stored as JSON in `packages/agents/evals/` with expected outputs and scoring logic.

## 4. Metrics & Thresholds
| Metric | Description | Threshold |
| --- | --- | --- |
| Accuracy | % of test cases meeting acceptance criteria | ≥ 90% |
| Hallucination Rate | Unsupported factual claims | ≤ 5% |
| Tool Success | Successful tool calls / total | ≥ 95% |
| Safety Violations | Guardrail breaches | 0 critical, ≤ 1 medium |
| Cost per Task | Average tokens per standardized scenario | ≤ 30% above baseline |
| Latency | P95 response time | ≤ 3 s |

## 5. Tooling
- Eval harness implemented with `langsmith` or custom evaluator stored under `packages/agents/evals`.
- Results exported to BigQuery and visualised in Looker Studio dashboard.
- Alerts triggered when metrics cross thresholds.

## 6. Workflow
1. Nightly GitHub Action runs evals against staging models/tools.
2. Results posted to Slack #ai-stewards channel with summary and diff vs previous run.
3. Failures create Jira tickets tagged `AI-EVAL-BLOCKER`.
4. Deployments blocked if baseline QA < threshold or safety tests fail.

## 7. Human Feedback Integration
- Capture thumbs up/down and reason codes in chat UI.
- Weekly review to label misgrounded responses; feed into scenario library.
- Evaluate fairness: ensure savings tips and ROI suggestions do not disproportionately favour certain tenant segments.

## 8. Change Management
- Update baseline data when product features change; record version in YAML front-matter.
- Any new tool requires eval cases before production enablement.
- Track evaluation suite changes in release notes.

Maintain audit trail of eval results for compliance.

---
owner: ml-team
last_review: 2025-09-21
status: template
tags: ["evals", "ai-agents", "safety", "observability", "multi-tenant"]
references:
  - "./Model-Card.md"
  - "./Prompt-Library.md"
  - "./Tool-Specs.md"
  - "../07-ops/Observability-Runbook.md"
  - "../07-ops/SLOs.md"
  - "../07-ops/Incident-Playbooks.md"
  - "../08-security/Threat-Model.md"
  - "../09-governance/Versioning-Policy.md"
  - "../09-governance/API-Governance.md"
---

# Evaluation Plan (Agents • Models • Prompts • Tools)

> **Purpose.** Define *what we test, how we measure, and when we ship* for AI agentic platforms spanning multiple tenants, users, and domains. This plan provides offline and online evaluation procedures, safety & security tests, quality gates, and CI/CD wiring so coding agents can ship without regressions.

---

## 1) Executive Summary

- **Scope:** LLMs, Orchestrator/Agents, Tools (function calls), Retrieval (RAG/Graph), Memory, and Guardrails.
- **Primary targets:** (set per project)
  - **Grounded‑answer rate ≥ 95%** on curated golden tasks
  - **Hallucination ≤ 5%** (tool‑verified) on knowledge tasks
  - **p95 latency ≤ 2 s** for grounded answers (per endpoint)
  - **Avg request cost < $0.01** at steady state
- **Release gates:** Shipping is blocked if any *critical* quality gate fails (see §7). Canary deploys roll back automatically on breach.

---

## 2) Systems‑Under‑Test (SUT)

We evaluate the complete stack, with contracts serving as the source of truth:

- **Models:** Foundation or fine‑tuned models referenced in Model Card(s)
- **Agents:** Planner/Router, Policy Router, Critic/Verifier, Scheduler
- **Tools:** Versioned, typed tool functions (JSON schemas) and adapters
- **Retrieval:** Hybrid RAG (vector + lexical) and Graph‑backed knowledge
- **Memory:** Episodic + semantic memory, pruning/summarization
- **APIs:** Public endpoints and internal bridges; idempotency and tracing

Each SUT declares interfaces (I/O schemas), KPIs, and ownership; all evals bind to these contracts.

---

## 3) Quality Attributes & Targets

| Attribute | Metric | Target (default) | Notes |
|---|---|---|---|
| **Correctness (Grounding)** | grounded_answer_rate | ≥ 95% | Evidence‑first workflow; validated facts |
| **Safety** | jailbreak & injection success | 0 P1; ≤ 1% overall | Red‑team suite; content controls |
| **Latency** | p95 (ms) | ≤ 2000 | Model+tool end‑to‑end |
| **Cost** | $/request | < $0.01 avg | Includes tools & retrieval |
| **Reliability** | error rate | < 0.1% | 5xx + tool failures |
| **Determinism (contracts)** | parse/validate pass | 100% | JSON schema/Pydantic |
| **Drift** | KL divergence | < 0.1 | Output & embedding drift |
| **Fairness** | disparity | < 5% | Domain‑specific axes |

> **Project note:** Adjust thresholds per domain (engineering design, e‑commerce, trading, support, PM, property mgmt, business assistant). Record exceptions in an ADR and link here.

---

## 4) Datasets, Golden Tasks & Fixtures

### 4.1 Dataset Registry

Maintain a versioned registry with metadata:

```yaml
datasets:
  - id: "golden_design_v1"
    domain: "engineering-design"
    tasks: 120
    labels: "curated+double-review"
    storage: "s3://eval/golden/design/v1/"
    hash: "sha256:..."
  - id: "support_faq_v2"
    domain: "customer-support"
    tasks: 500
    labels: "programmatic+spot-check"
```

**Golden tasks** are minimal, unambiguous, and map to *contracted outputs* (schemas). Include adversarial variants for prompt‑injection, ambiguity, and boundary values.

### 4.2 Tenancy & Privacy Fixtures

- Synthetic multi‑tenant prompts with similar content to test isolation
- PII‑bearing inputs to verify scrubbing/redaction
- Regional residency cases (US/EU/APAC) to test routing

---

## 5) Offline Evaluation (Pre‑merge)

Run in CI on every PR; fast, deterministic, and hermetic.

### 5.1 Functional Correctness

- **Schema conformance:** Every response must validate against the declared output schema (Pydantic/Zod).
- **Tool call validity:** Tool selections must be permitted by scopes; arguments must validate.
- **Golden answers:** Exact/approx metrics (Exact‑match, F1/EM, BLEU/ROUGE where applicable).

### 5.2 Safety & Security

- **Prompt‑injection suite:** templated + model‑specific strings
- **Jailbreak suite:** curated jailbreak attempts
- **Data leakage:** tenant cross‑talk, PII echo tests
- **Output filtering:** toxicity/PII/unsafe actions checks

### 5.3 Performance & Cost Budgets

- **Token & latency budgets:** Unit tests enforce max tokens and p95 latency (mocked/stubbed tools allowed).
- **Fallback behavior:** Simulate provider errors; verify retries/backoff and model fallbacks.

### 5.4 Reproducibility

- Pin model & prompt versions, tool versions, seeds, and corpora hashes.
- Produce an *Eval Report* artifact (JSON + HTML) per run.

---

## 6) Online Evaluation (Pre‑release & Post‑release)

### 6.1 Shadow & Canary

- **Shadow:** Mirror a % of prod traffic into a sandbox; compute deltas vs GA model.
- **Canary:** Route 5–10% live traffic; guarded by rollout rules and automatic rollback triggers.

### 6.2 Post‑release Monitoring

- Continuous drift detection on inputs/outputs & embeddings
- Safety event monitoring (blocked content, elevated injection signals)
- Cost/latency/error SLO tracking

---

## 7) Quality Gates & Rollback Rules

Define **blockers** (ship‑stop) and **warn** gates:

```yaml
gates:
  blockers:
    grounded_answer_rate: "< 0.90"        # CI blocks
    schema_validation: "< 1.0"            # any parse error
    jailbreak_success_p1: "> 0"           # any critical bypass
  warnings:
    p95_latency_ms: "> 2000"
    avg_cost_usd: ">= 0.01"
    error_rate: ">= 0.001"
rollout:
  canary_auto_rollback:
    accuracy_drop_pct: "> 5"
    latency_increase_pct: "> 50"
    error_rate_pct: "> 1"
    drift_kl: "> 0.1"
```

> Rollback creates an incident ticket, flips traffic to the previous version, and attaches the Eval Report.

---

## 8) Test Matrix (by layer & domain)

| Layer | Category | Example tests | Metric |
|---|---|---|---|
| **Model** | Reasoning | math word problems, chain‑of‑thought hidden | EM / Pass@k |
| **Prompt** | Format adherence | JSON only, keys present, enums valid | Parse rate |
| **Tool** | Selection & args | choose `price_lookup` over `web_search`; arg schema | Valid call % |
| **Retriever** | Grounding | doc retrieval, top‑k correctness | R@k, MRR |
| **Agent** | Plan‑act loop | uses Critic before merge | Plan success % |
| **End‑to‑end** | Domain tasks | design validation, RFQ creation, support triage | Task score |

---

## 9) Harness & Implementation

### 9.1 Minimal Python harness (pytest)

```python
# tests/evals/test_grounding.py
import json, time
from pathlib import Path
from pydantic import BaseModel, ValidationError

class Answer(BaseModel):
    summary: str
    citations: list[str]

def call_model(prompt: str) -> str:
    # stub: integrate your Intelligence Layer here
    return json.dumps({
        "summary": "stub",
        "citations": ["doc://kb/123"]
    })

def test_grounded_sample():
    start = time.perf_counter()
    raw = call_model("Summarize: PV array on 10kW roof using docs A,B.")
    latency = (time.perf_counter() - start) * 1000
    ans = Answer.model_validate_json(raw)
    assert ans.summary
    assert all(c.startswith(("http", "doc://", "s3://")) for c in ans.citations)
    assert latency <= 2000
```

### 9.2 JSON test spec (portable)

```json
{
  "id": "design_validate_001",
  "domain": "engineering-design",
  "prompt": "Validate DC voltage limits for string S-12 using spec sheets.",
  "expect": {
    "schema": "Answer@1.0",
    "must_include": ["max_voltage", "evidence"]
  },
  "budgets": { "p95_ms": 2000, "max_tokens": 1200 }
}
```

### 9.3 CI wiring (GitHub Actions excerpt)

```yaml
name: evals
on:
  pull_request:
  workflow_dispatch:
jobs:
  offline-evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest -q tests/evals
      - name: Upload eval report
        uses: actions/upload-artifact@v4
        with:
          name: eval-report
          path: reports/eval/**
```

---

## 10) Safety & Security Evaluation

- **Prompt injection & jailbreak**: canned + fuzzed payloads
- **Unsafe action prevention**: ensure tools with side‑effects require approvals; dry‑run patches first
- **PII & compliance**: redaction checks; DP‑friendly modes
- **Supply‑chain**: model signing, SBOM scanning for tool deps

Outputs feed the Threat Model and Incident Playbooks; any P1 finding blocks release.

---

## 11) Fairness, Bias & Accessibility

Define domain‑specific slices (region, language, device class, etc.). Measure output parity and accessibility‑related issues (e.g., alt‑text coverage). Document mitigations and risk acceptance if trade‑offs are necessary.

---

## 12) Observability & Reproducibility

- **Tracing & metrics:** record model/tool calls, latency, tokens, cost, and error types with TRACE_ID.
- **Run registry:** store model id/version, prompt id/version, tool versions, dataset hash, and seed in each eval record.
- **Dashboards:** performance, safety events, drift, and cost over time.

---

## 13) Governance & Change Management

- All changes to prompts, tools, or models require version bumps and migration notes.
- Document exceptions in ADRs; add an expiry to all exceptions.
- Maintain deprecation timelines and communicate to consumers.

---

## 14) Roles & RACI

| Role | Accountabilities |
|---|---|
| **ML Owner** | Accepts eval results, owns gates & rollout |
| **Security** | Owns red‑team suite and response |
| **Platform** | Observability, rollback automation |
| **Domain SMEs** | Curate golden tasks, review outputs |
| **QA** | CI harness, reports & artifacts |

---

## 15) Appendix – Checklists

**Pre‑merge (offline):** schema pass, golden pass ≥ target, safety pass, budgets pass, report artifact stored.  
**Pre‑release (shadow/canary):** deltas within tolerance, safety events ≤ baseline, error/latency within SLO.  
**Post‑release:** drift monitors active, dashboards updated, periodic re‑eval scheduled.

---

*End of template.*

---
owner: ml-team
last_review: 2025-09-21
status: template
tags: ["model-card", "agentic", "multi-tenant", "multi-domain", "safety"]
references:
  - "../Eval-Plan.md"
  - "../Prompt-Library.md"
  - "../Tool-Specs.md"
  - "../../09-governance/Versioning-Policy.md"
  - "../../08-security/Threat-Model.md"
  - "../../01-architecture/System-Architecture.md"
---

# Model Card — Agentic Platform Models

> **Scope:** This model card documents all AI models used by the platform (reasoning LLMs, embeddings, rerankers, vision, and speech) **per environment and tenant tier**. It encodes guardrails, evals, cost/SLO expectations, drift monitoring, and deprecation rules so coding agents and humans can deploy safely with zero ambiguity.

**Architectural alignment.** The platform follows _Ground‑before‑Generate_, deterministic **Tool I/O schemas**, **JSON‑Patch** for safe writes, a **Policy Router** for PSU/cost budgets, and **CAG caching** for efficiency. These principles are defined in the ODL‑SD AI Architecture blueprint. fileciteturn0file28

---

## 1) Executive Summary

- **Primary purpose:** Reasoning + tool‑using agents that plan → act → verify across design, procurement, operations, CRM, and revenue use‑cases (multi‑tenant, multi‑domain). fileciteturn0file37
- **Safety posture:** Prompt‑injection defenses, output validation, RBAC/phase gates, audit trails, and model/endpoint rate‑limits. fileciteturn0file34
- **Reliability posture:** Provider abstraction with fallbacks, exponential backoff/retry, structured I/O enforcement, and cost/latency logging at every call. fileciteturn0file25
- **Versioning posture:** Strict SemVer for APIs, models, prompts & tools; deprecation schedule with migration guides & headers. fileciteturn0file22

---

## 2) Model Inventory (per environment)

> _Update this table for each environment (dev, staging, prod). For private fine‑tunes, add a row per artifact._

| Role | Model ID | Provider | Modalities | Context window | Max output | Cost class | Residency | Notes |
|------|----------|----------|------------|----------------|------------|------------|-----------|-------|
| **Primary Reasoning** | `openai/gpt-4.1-mini` (example) | OpenAI | text, tool‑use | 128k | 4k | $$ | US/EU routing | Fallback to `anthropic/claude-3.7-sonnet` if 429/5xx. fileciteturn0file25 |
| **Extraction / Fast** | `openai/gpt-4o-mini` (example) | OpenAI | text | 128k | 2k | $ | region‑routed | Used for schema‑bound parsing & summaries. fileciteturn0file25 |
| **Embeddings** | `text-embedding-3-large` (example) | OpenAI | text | — | — | $ | region‑routed | For hybrid/Graph‑RAG retrieval. fileciteturn0file28 |
| **Reranker** | `cohere/rerank-3` (example) | Cohere | text | — | — | $ | — | Improves top‑k grounding. fileciteturn0file28 |
| **Vision** | `gpt-4.1` vision (example) | OpenAI | image+text | 32k | 2k | $$ | — | Datasheet OCR/QA assist. fileciteturn0file28 |
| **ASR (Speech→Text)** | `openai/whisper-large-v3` (example) | OpenAI | audio | — | — | $ | — | Session/field ops capture. fileciteturn0file28 |
| **TTS (Text→Speech)** | `azure/tts-neural` (example) | Azure | audio | — | — | $ | regional | Optional customer UX. |

> **Tenant routing & budgets:** PSU (Premium Simulation Unit) budgets and plan limits (Free/Pro/Enterprise) are enforced by the Policy Router and monetisation rules. Configure per tier. fileciteturn0file29

---

## 3) Intended Use & Out‑of‑Scope

**Intended:** design validation, wiring checks, BOM generation, RFQ & bid scoring, logistics milestones, commissioning checklists, fault triage, ROI/IRR scenarios, lead gen and pricing nudges. fileciteturn0file28

**Out‑of‑scope:** legal/medical advice; autonomous changes without human approval in gated phases; direct execution of arbitrary code (tool calls are declarative & pre‑registered only). fileciteturn0file38

---

## 4) Data, Privacy & Governance

- **Inputs:** ODL‑SD JSON (project state), structured tool I/O, curated knowledge snippets, and grounded evidence from Graph‑RAG. Personal data is minimized and redacted on write. fileciteturn0file28
- **PII Handling:** Memory writes scrub PII; media (images/docs) pass privacy filters; tenant‑scoped stores; region routing per org policy. fileciteturn0file28
- **RBAC & phase gates:** Access and write scopes are enforced via the ODL‑SD roles/rights matrix with approvals and audit. fileciteturn0file31

---

## 5) Risks & Mitigations

| Risk | Example | Mitigation |
|------|---------|------------|
| Prompt injection / jailbreak | Malicious spec in a datasheet | Input schema enforcement, tool whitelist, output filters, rate limiting, red‑team tests. fileciteturn0file34 |
| Hallucination | Ungrounded recommendations | **Ground‑before‑Generate**, evidence links, Critic/Verifier gate. fileciteturn0file28 |
| Model extraction | Over‑querying inference API | Rate limits, watermarking/monitoring. fileciteturn0file34 |
| Cost run‑away | Long contexts / loops | Policy Router PSU budgets, context minimalism, CAG caching. fileciteturn0file28 |
| Supply‑chain / dependency risk | Library CVEs | SCA/SBOM and container standards. fileciteturn0file36 |

---

## 6) Quality, Evals & SLOs

- **Eval suites:** See `06-ml-ai/Eval-Plan.md` for grounded‑answer rates, hallucination counters, wiring limit checks, finance deltas, and task success KPIs. Link eval cases to PRs. (Cross‑ref in repo.)  
- **Acceptance gates:** Block promotion if evals fall below thresholds or regress > 2σ.  
- **SLOs (per tier):** p95 latency, availability, error budgets, and cost per task; surface on dashboards with request/trace IDs and token usage. Tracing headers and span attributes are required. fileciteturn0file33

---

## 7) Versioning & Deprecation

- **SemVer** for models, prompts, tools, and OpenAPI; **URI versioning + headers** for APIs; **12‑month** support window for major API lines. fileciteturn0file22  
- **Registry:** Each artifact is registered with hash, training/eval metadata, and rollback pointer; model loads verify SHA‑256 before accept. fileciteturn0file22  
- **Deprecation workflow:** Announcement → migration period → warnings → sunset → removal, with migration guides and links to successor versions. fileciteturn0file22

---

## 8) Operational Playbook (per model)

```yaml
runbook:
  retries: exponential_backoff: {min_s: 1, max_s: 60, attempts: 3}   # transient 429/5xx
  fallback_chain: ["primary", "secondary"]                            # provider abstraction
  rate_limits:
    read: 100 rpm
    write: 30 rpm
  observability:
    trace: "X-Request-ID, X-Correlation-ID, B3 headers"
    metrics: ["latency_ms_p95", "error_rate", "token_in", "token_out", "cache_hit"]
  cache:
    layers: ["prompt", "embedding", "tool_output"]
    invalidation: ["ttl", "event"]
  guardrails:
    io_validation: "JSON Schema/Pydantic"
    tool_whitelist: true
    max_context_tokens: 60_000
```

_These defaults align with Cookbook patterns (abstraction, retries, structured I/O, logging) and our platform caches/policies._ fileciteturn0file25

---

## 9) Implementation Snippets (copy‑paste ready)

> **Python (production‑grade Intelligence Layer)** — provider abstraction, retries, schema validation

```python
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_random_exponential
from typing import Literal

class Out(BaseModel):
    summary: str
    sentiment: Literal["positive","neutral","negative"]

@retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=60))
def call_llm(messages, model_name: str) -> dict:
    # Wrap the provider SDK here; log model_name, tokens, latency, cost
    ...

def analyze(text: str) -> Out:
    prompt = [
        {{"role":"system","content":f"Return JSON matching schema: {{Out.model_json_schema()}}"}},
        {{"role":"user","content": text}}
    ]
    try:
        raw = call_llm(prompt, model_name="primary")        # fallback handled in call_llm
    except Exception:
        raw = call_llm(prompt, model_name="secondary")
    return Out.model_validate_json(raw)
```

_This mirrors the Cookbook’s structured I/O + fallback strategy._ fileciteturn0file25

> **TypeScript (agent tool call with Zod)** — contract‑first, minimal context, explicit tool access

```ts
import { z } from "zod";

const Out = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive","neutral","negative"]),
});

export async function analyze(text: string) {
  const system = "Return JSON exactly matching this schema";
  const raw = await llm.chat({ system, messages: [{ role: "user", content: text }] });
  return Out.parse(JSON.parse(raw));
}
```

_Use single source of truth for types; avoid duplicated enums and hardcoded status sets._ fileciteturn0file36

---

## 10) Tool Use & Grounding

- **Deterministic tools over free‑text:** LLMs plan & select, tools compute/verify; all tool inputs/outputs typed and versioned. fileciteturn0file28  
- **Registry & least privilege:** Declare tool scopes and rate‑limits; orchestrator enforces; log every call. fileciteturn0file38  
- **Grounding:** Hybrid retriever + Graph‑RAG projection of ODL‑SD; cache hits logged; stale data detection refreshes evidence. fileciteturn0file28

---

## 11) Tenant Tiers & Cost Controls

- **Plans:** Free / Pro / Enterprise with transparent PSUs and add‑ons (Boost Pack, Sustainability Pack). Budgets enforced before tool or model calls. fileciteturn0file29  
- **Per‑tenant rate‑limits & quotas** on AI endpoints; cost dashboards expose token & PSU spend to owners. fileciteturn0file22

---

## 12) Change Log (append entries)

| Date | Artifact | Version | Change | Owner |
|------|----------|---------|--------|-------|
| 2025‑09‑21 | Model‑Card | 0.1.0 | Initial template aligned to platform standards | ml‑team |

---

## 13) Cross‑References

- **Eval Plan:** metrics, thresholds, golden cases, and canary tests.  
- **Prompt Library:** canonical prompts + variables for each model/task.  
- **Tool Specs:** JSON Schemas + adapters; version‑pinned and audited.  
- **Threat Model:** STRIDE table incl. AI‑specific attacks & mitigations. fileciteturn0file34  
- **Versioning Policy:** SemVer, deprecation, registry, rollback. fileciteturn0file22  
- **API Governance:** tracing headers, metrics, testing matrix. fileciteturn0file33

---

### Authoring checklist (must pass before merge)

- [ ] Inventory table filled for each environment (IDs, regions, fallbacks)  
- [ ] Evals mapped to tasks; thresholds set; canaries defined  
- [ ] SLOs set per tier; alerts configured; tracing on  
- [ ] Risks & mitigations reviewed with Security  
- [ ] Version & deprecation plan registered (SemVer + sunset)  
- [ ] Prompt + Tool specs cross‑linked; contracts validated


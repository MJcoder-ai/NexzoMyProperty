---
owner: ai-team
last_review: 2025-09-25
status: draft
tags: ["ai", "model-card"]
references:
  - "../../nexzo-myproperty-concept.md"
  - "Tool-Specs.md"
  - "Eval-Plan.md"
  - "../07-ops/Cost-&-Token-Budgeting.md"
---

# Model Card – Nexzo MyProperty Agents

## 1. Overview
The Nexzo MyProperty agentic layer orchestrates domain-specific agents to assist landlords, tenants, service providers, and internal teams. The current production stack leverages:
- **LLM:** GPT-4.1 Turbo (primary) with fallback to Claude 3.5 Sonnet and Mistral Large.
- **Embedding model:** OpenAI `text-embedding-3-large` for retrieval.
- **Routing:** Policy engine selects model based on task sensitivity, token budget, and latency requirements.

## 2. Intended Use
- Answer property, billing, and energy questions via chat.
- Draft invoices, explain allocations, and propose adjustments (human approval required).
- Triage service requests, recommend providers, create schedules.
- Provide ROI simulations and savings tips.
- Generate compliance disclosures and incident summaries.

Not intended for: legal advice, final financial sign-off, or any irreversible actions without human review.

## 3. Training Data & Knowledge Sources
- Proprietary knowledge base built from product docs, jurisdiction rule packs, onboarding guides.
- Indexed Postgres views: property profiles, invoices, allocation ledgers, service tickets.
- External references: utility tariffs, weather feeds (through tools).
- No direct fine-tuning on tenant chat transcripts; retrieval-only with access controls.

## 4. Evaluation Summary
- Automated eval suite covers question answering, allocation explanation, compliance prompts, and anomaly investigations.
- Key metrics (Aug 2025):
  - Accuracy on grounded Q&A scenarios: 92% (target ≥ 90%).
  - Tool call success rate: 97% (target ≥ 95%).
  - Hallucination rate (unsupported claim): <4% (target ≤ 5%).
  - Prompt-injection resilience: passes baseline tests; see `Eval-Plan.md`.

## 5. Safety Mitigations
- Guardrail policies restrict tool usage based on role and risk level.
- Every high-impact action (billing adjustments, project updates) requires explicit user confirmation.
- Sensitive data filtered using PII redaction module before LLM exposure.
- Prompt templates enforce context injection and instruction hierarchy.
- All agent actions logged to `agent_audit` table and Pub/Sub topic for monitoring.

## 6. Ethical Considerations
- Provide transparent reasoning steps to users where possible.
- Avoid tenant profiling beyond legitimate business purpose; fairness reviews for savings recommendations.
- Support opt-out for AI assistance per tenant.

## 7. Limitations
- Reliance on upstream data quality (meter readings, compliance packs).
- Latency tied to external LLM provider availability.
- Multi-language support limited to English in MVP; roadmap includes Spanish/French.

## 8. Maintenance
- Prompt templates versioned in `packages/agents/prompts`.
- Weekly evaluation reports reviewed by AI stewardship council.
- Incidents involving AI behaviour tracked via red-team plan and postmortems.

Update this card when models, prompts, or safety controls change.

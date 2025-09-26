---
owner: docs-team
last_review: 2025-09-25
status: draft
tags: ["index", "navigation"]
---

# Nexzo MyProperty Documentation Index

Welcome to the living documentation set for **Nexzo MyProperty**, an AI-enabled, solar-aware property management platform. The goal of this tree is to keep product, engineering, security and operations aligned as we move from concept to production.

## How to use this repository
- Start with the **Product Requirements Document** to understand the customer problem and roadmap.
- Use the **System Architecture** and **Technical Requirements** docs when implementing or reviewing system changes.
- Reference the **Data**, **Security**, **Governance**, and **Ops** sections during design reviews, audits and go-lives.
- Keep the **Agents** section in sync with the orchestrator registry and tool contracts so AI behaviour stays predictable.

## Quality checklist
- Every document contains current YAML front-matter and references upstream sources (concept brief, integration plan, UI guidelines).
- Diagrams are expressed with Mermaid blocks so they render in markdown viewers.
- All specs (OpenAPI, AsyncAPI, database schemas) validate in CI before merge.
- Security, privacy and compliance impacts are captured before code ships.
- ADRs are raised for any architectural decision that affects cross-team interfaces or SLAs.

## Directory map
- `00-product/` — product strategy, roadmap, stakeholder value.
- `01-architecture/` — logical/physical architecture, deployment topology, integration with OriginFD.
- `02-requirements/` — functional, non-functional and compliance requirements.
- `03-apis/` — REST and event contracts, SDK guidance, API portal process.
- `04-data/` — database design, governance, privacy assessments.
- `05-dev/` — developer enablement, tooling standards, inner loop.
- `06-ml-ai/` — agent registry, prompt library, evaluation plans.
- `07-ops/` — infrastructure, SLOs, observability and incident response.
- `08-security/` — security baselines, threat model, prompt safety.
- `09-governance/` — API governance, versioning and exception handling.
- `10-agents/` — detailed agent cards, tool catalogue, guardrails.

## Primary references
- `../Interface Design Guidelines for NexzoMyProperty.md`
- `../Nexzo MyProperty & OriginFD Integration Plan.md`
- `../nexzo-myproperty-concept.md`
- `../Docs_Templates/` (source templates and prior art)

Keep this index updated as new documents are added or ownership changes.

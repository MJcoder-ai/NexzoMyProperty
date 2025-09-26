---
owner: architecture-council
last_review: 2025-09-25
status: draft
tags: ["governance", "api"]
references:
  - "Versioning-Policy.md"
  - "../03-apis/API-Specification.md"
  - "../03-apis/openapi.yaml"
  - "../03-apis/asyncapi.yaml"
---

# API Governance

## 1. Objectives
- Ensure consistent, secure, and evolvable APIs across MyProperty services.
- Prevent breaking changes without notice; enable automation for SDK generation.

## 2. Governance Workflow
1. Propose change via PR modifying OpenAPI/AsyncAPI spec.
2. Run Spectral lint rules (naming conventions, description coverage, security schemes).
3. Review by API guild (architecture + domain owner).
4. Update `CHANGELOG.md` under `docs/03-apis` and communicate to stakeholders.
5. Generate SDKs, publish to internal registries.

## 3. Standards
- REST endpoints use `kebab-case` for paths, `camelCase` for JSON fields.
- Use nouns for resources, avoid verbs.
- Include `id`, `createdAt`, `updatedAt` on resources; timestamps in ISO 8601.
- Errors follow canonical structure defined in `openapi.yaml`.
- Webhooks namespaced by domain (`billing`, `service`, `originfd`).

## 4. Review Checklist
- Auth scheme correct? (bearer + tenant header?).
- Input validation and response schema defined with examples.
- Idempotency requirements documented.
- Deprecation plan for replaced endpoints.
- Audit requirements considered (traceability, logs).

## 5. Tooling
- GitHub Action `api-governance` runs Spectral, Schemathesis smoke tests, AsyncAPI validator.
- Post-merge job regenerates SDKs in `packages/sdk` and opens PR for review.
- API docs site built from spec and deployed to docs-site.

## 6. Exceptions
- Temporary deviations recorded in `Security-Exception-Register.md` with expiry date.
- Emergency fixes allowed with post-hoc review within 48 hours.

Maintain governance process to keep APIs predictable for internal/external consumers.

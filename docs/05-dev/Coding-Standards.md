---
owner: engineering-team
last_review: 2025-09-25
status: draft
tags: ["standards", "coding"]
references:
  - "Dev-Env-Setup.md"
  - "../../Docs_Templates/Coding-Standards.md"
---

# Coding Standards

## 1. General Principles
- **Clarity over cleverness:** Optimise for readability and maintainability.
- **Type safety:** Prefer TypeScript strict mode and Python type hints (mypy, pyright).
- **Contract-driven:** API, event, and tool contracts live in source control; generate clients to avoid drift.
- **Security first:** Follow secure coding guidelines, input validation, output encoding, least privilege.
- **Automate:** Use linters, formatters, tests in CI; no manual steps.

## 2. Languages & Frameworks
| Area | Language | Framework |
| --- | --- | --- |
| Web/Admin | TypeScript | Next.js + tRPC/React Query |
| Gateway Services | TypeScript | Fastify/Express with Zod validation |
| AI Orchestrator | Python 3.12 | FastAPI, Pydantic, LangChain (lightweight) |
| Workers | TypeScript (Node) & Python | BullMQ/PubSub, Prefect (optional) |

## 3. Project Structure
- Use pnpm workspaces; packages expose typed APIs via `index.ts`.
- Shared utilities live in `packages/core`, domain types in `packages/types`, DB ORM in `packages/db`.
- Services follow hexagonal architecture: `application`, `domain`, `infrastructure` layers.
- AI tools defined declaratively in `packages/agents/tool_specs` and referenced by orchestrator.

## 4. Style Guides
- **TypeScript:** Prettier defaults, ESLint with AirBnB base + custom rules. Avoid default exports when possible.
- **Python:** Ruff for linting, Black formatting, mypy strict optional, abide by PEP8/PEP484.
- **Markdown:** Use `markdownlint` configured in repo; include YAML front-matter.
- **Terraform:** Use `terraform fmt`; modules documented with README.

## 5. Testing
- Unit tests with Vitest/Jest (TS) and Pytest (Python) targeting 80% coverage on critical paths.
- Contract tests for APIs using Pact or Postman/newman.
- Integration tests orchestrated via Playwright/Cypress for web flows; integrate with preview environments.
- AI evaluations defined in `docs/06-ml-ai/Eval-Plan.md` and executed with `pnpm eval:run`.
- Snapshot tests permitted for deterministic outputs only.

## 6. Error Handling & Logging
- Use typed error classes; include `code`, `message`, `context`.
- Log at appropriate levels: `info` for lifecycle, `warn` for retriable, `error` for failures with alerting.
- Include `tenantId`, `propertyId`, `traceId` in structured logs.
- No PII in logs; mask emails/phones.

## 7. Dependency Management
- Rely on pnpm lockfile; do not commit package-lock or yarn.lock.
- Third-party libraries require security review (npm audit, Snyk).
- Python dependencies pinned in `pyproject.toml`/`requirements.lock`; manage via uv/poetry.

## 8. Code Reviews
- Minimum two approvals for critical services; at least one domain expert.
- Review checklist: requirements coverage, tests, observability, security, documentation updates.
- Block merges lacking tests, docs, or failing pipelines.
- Architecture-impacting changes require ADR update or new ADR.

## 9. Feature Flags & Config
- Use `packages/config` for typed configuration; no environment-dependent logic in code.
- Feature flags stored in LaunchDarkly (or custom service) keyed by tenant/property.
- Provide default fallback behaviour.

## 10. Documentation Expectations
- Update relevant docs (PRD/TRD/Architecture) when adding new capabilities.
- Maintain README.md in each app/service directory with run commands.
- Document new AI tools in `Tool-Catalog.md` and guardrails update.

## 11. Security Practices
- Input validation via Zod/Pydantic; never trust client-supplied data.
- Avoid SQL string concatenation; use parameterised queries.
- Secrets read from environment at runtime; no hard-coded credentials.
- Implement rate limiting and CSRF protection in web apps.

Adhere to standards; deviations require documented justification.

# Nexzo MyProperty

An AI-assisted, solar-integrated property operations platform that brings together landlords, tenants, and service providers with transparency and automation.

## Repository Layout
```
apps/               Web, admin, docs-site frontends
services/           Backend services (gateway, billing, auth, compliance, etc.)
workers/            Background jobs (ingestion, allocation, anomaly, reports)
packages/           Shared UI, domain, types, db, agent tooling, configs
platform/           Domain-specific modules (billing, meters, solar, analytics)
rulesets/           Compliance rule packs and tests
data/               Timeseries schemas, warehouse models, report templates
infra/              Terraform, Kubernetes, Vercel, observability configs
scripts/            Tooling for seeds, CI, automation
mocks/              Contract test fixtures, mock servers
schemas/            JSON schemas for events/DTOs
docs/               Product, architecture, ops, security documentation
```

## Getting Started
1. Install prerequisites (Node 20, pnpm 9, Python 3.12, Docker).
2. `pnpm install`
3. Configure `.env.local` from `.env.example`.
4. Start services: `pnpm turbo run dev --filter web` (or use Tilt/Compose).
5. Review documentation under `docs/` for detailed architecture, APIs, and operations.

## Documentation
- `docs/_index/README.md` – navigation and quality checklist.
- Product/architecture requirements, data models, API contracts, security, AI guardrails all included in respective subdirectories.

## Contributing
- Follow `docs/05-dev/Coding-Standards.md`.
- Update relevant docs alongside code changes.
- Run `pnpm run validate` before opening a PR.

## Licensing & Ownership
Copyright © 2025 Nexzo. Internal use only.

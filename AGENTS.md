# Repository Guidelines

## Project Structure & Module Organization
Nexzo MyProperty is a pnpm/turbo monorepo. Customer and admin frontends live under `apps/` (`web`, `web-portal`, `admin`, `api-portal`), while service APIs sit under `services/` (gateway, billing, onboarding, auth, etc.). Shared domain logic, UI kits, Prisma schema, typed clients, and agent tooling are in `packages/` (`core`, `ui`, `db`, `types`, `agents`). Automations and background jobs belong in `workers/`. Domain-specific engines (billing, meters, analytics) are in `platform/`. Infrastructure, compliance rules, data models, and documentation assets live in `infra/`, `rulesets/`, `data/`, `docs/`, and `mocks/`. Keep new modules aligned with this layout and register them in `pnpm-workspace.yaml`.

## Build, Test, and Development Commands
- `pnpm install` - install workspace dependencies on Node >=20.10.
- `pnpm run dev -- --filter apps/web-portal` - launch a single frontend via Turbo (swap the filter for other targets).
- `pnpm run db:generate` / `pnpm run db:migrate` - run Prisma client generation and local migrations from `packages/db`.
- `pnpm run lint`, `pnpm run typecheck`, `pnpm run test` - execute linting, TypeScript, and Jest suites across the monorepo.
- `pnpm run validate` - aggregated gate; run before any PR to catch regressions.

## Coding Style & Naming Conventions
TypeScript and React follow ESLint with `@typescript-eslint` and Prettier (`singleQuote`, `trailingComma: all`, `printWidth: 100`). Use descriptive PascalCase for components, camelCase for functions and variables, and dash-case for folder names. Flag intentionally unused identifiers with a leading underscore to satisfy lint rules. Collocate module exports under `src/` and expose public APIs through barrel files where it improves discoverability.

## Testing Guidelines
Jest with `ts-jest` and Testing Library is the default. Place unit tests alongside sources as `*.test.ts` (for example `services/api-gateway/src/index.test.ts`). Coverage reports write to `coverage/`; include meaningful assertions for new branches and mocked integrations. Run scoped tests with `pnpm run test -- --filter services/api-gateway` when iterating, and ensure `pnpm run test` passes before merging.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat(db): ...`, `chore: ...`) and keep messages scoped to a single concern. Squash fixup commits locally. PRs must describe business context, outline testing performed, and reference Jira or GitHub issues. Attach screenshots or API payload diffs for UI or contract changes, update related docs under `docs/` or `packages/agents`, and request reviews from the owning team.

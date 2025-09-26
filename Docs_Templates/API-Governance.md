---
owner: api-team
last_review: 2025-09-22
status: template
tags: ["api-governance", "standards", "versioning", "security", "ai-endpoints", "multi-tenant"]
references:
  - "../../02-requirements/TRD.md"
  - "../../03-apis/API-Specification.md"
  - "../../03-apis/openapi.yaml"
  - "../../09-governance/Versioning-Policy.md"
  - "../../08-security/Security-Guidelines.md"
  - "../../08-security/Threat-Model.md"
  - "../../07-ops/SLOs.md"
  - "../../07-ops/Observability-Runbook.md"
  - "../../09-governance/ADR/ADR-0000-template.md"
---

# API Governance

## Executive Summary
This document defines **how APIs are designed, versioned, reviewed, tested, secured, and operated** across the platform.
It establishes automated gates in CI/CD, clear review criteria, and uniform rules for REST, event, and AI endpoints
to keep a multi-tenant, multi-user, multi-domain system consistent, secure, and evolvable.

**Read this if you are**: building or changing any endpoint, schema, SDK/client, webhook, or AI tool interface.

## Scope
Applies to internal and external APIs, including:
- REST/HTTP (synchronous) and webhooks (asynchronous)
- AI/ML endpoints (inference, tools/functions, evaluations)
- Event contracts (Pub/Sub topics), model registries, and internal service interfaces

## Governance Lifecycle & Gates

```mermaid
graph LR
  A[Propose change<br/>(Issue/ADR)] --> B[Design review<br/>(API Spec PR)]
  B --> C[Lint & policy checks<br/>(Spectral, custom rules)]
  C --> D[Security review<br/>(authN/Z, data classes)]
  D --> E[Contract tests<br/>(CDC) & SDK regen]
  E --> F[Staging deploy + load & sec tests]
  F --> G[Release gate<br/>(owner sign‑off, change window)]
  G --> H[Observability & SLO monitor<br/>(error budget, alerts)]
```

### Required Artifacts
- **API-Specification.md** updated with rationale and examples
- **OpenAPI schema** updated (machine readable)
- **Version bump** per Versioning-Policy (SemVer)
- **Security notes** (threats, data classification, scopes)
- **Contract tests** (provider + consumer)
- **Migration notes** (if breaking/deprecating)

### Review Roles
- **Author team**: implementation + tests
- **API governance**: spec quality, naming, compatibility
- **Security**: authN/Z, data exposure, rate limiting
- **Platform**: reliability, quotas, observability
- **Data/ML**: AI metadata, eval/rollback hooks

## Design Standards (HTTP/REST)

- **Resource naming**: plural, kebab-case in paths (e.g., `/components`, `/project-designs`)
- **Operations**: standard verbs; avoid custom actions; use sub-resources (`/projects/<built-in function id>/members`)
- **Pagination**: cursor-based (`page[size]`, `page[cursor]`), include `next_cursor`
- **Errors**: RFC 7807 `application/problem+json`
- **Idempotency**: all POSTs with side effects must accept `Idempotency-Key`
- **Tenancy**: tenant isolation via JWT claims; optional `X-Tenant-Id` header for admin flows
- **RBAC mapping**: every endpoint declares required scopes (see Security Guidelines)
- **Consistency**: timestamp fields are ISO‑8601 UTC; money in minor units + ISO 4217 currency code

## AI/ML Endpoint Rules
AI endpoints (inference, tool calls) **must** return structured metadata:
```json
{
  "model_id": "provider/model",
  "model_version": "2.3.1",
  "confidence": 0.92,
  "trace_id": "ULID...",
  "cache": { "hit": true, "layer": "CAG" }
}
```
- Require **tool I/O schemas** (contract-first), with strict validation and safe fallbacks.
- Enforce **guardrails**: input size limits, content filters, and per-tenant rate/PSU budgets.
- Support **rollback**: model/route pinning, blue‑green deploys, and A/B guards.
- Log cost, latency, and drift signals for all AI calls.

## Versioning & Compatibility

- **URI versioning** with header negotiation: `/api/v{MAJOR}/…` and `API-Version` response header.
- **SemVer** across APIs, schemas, models, and prompts.
- **Deprecation policy**: announce → migrate (6 mo) → warning (3 mo) → sunset (1 mo) → removal.
- Breaking change? **Major** version, migration guide, and overlap window with live canary tests.

**Deprecation headers example**
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: <https://api.example.com/v2/resource>; rel="successor-version"
Warning: 299 - "Deprecated API: Use /v2/resource. Removal date: 2025-12-31"
```

## Security Requirements (summary)
- **AuthN**: OAuth2/OIDC (Authorization Code + PKCE; Client Credentials for M2M)
- **AuthZ**: RBAC with resource-scoped permissions; JWT claims checked at gateway + service
- **Transport**: HTTPS only (TLS 1.3+), strict CORS allowlist, CSP for browser clients
- **Key policy**: API keys are legacy; rotate/retire with audit; prefer OAuth
- **Tenant limits**: per-tenant quotas, rate limits, and isolation tests
- **Audit**: append-only audit logs; SIEM integration

## Observability & SLOs
- Required metrics: latency p50/p99, error rate, availability, request rate, token usage for AI
- Distributed tracing headers: `X-Request-ID`, `X-Correlation-ID`, `B3` set
- Dashboards: API performance, health, cache, drift & cost
- Error budget policy: release freeze if SLOs breached until burn rate normalizes

## Testing Policy
- **Unit**: >90% core logic
- **Contract**: 100% endpoints (consumer‑driven contracts) before release
- **Integration**: critical paths on each deploy
- **Load**: weekly k6/Gatling tests
- **Security**: monthly OWASP scans (ZAP/Burp)
- **Chaos**: quarterly for core services

## API Registry (catalog)
#### Minimum fields
```yaml
metadata:
  name: "User Management API"
  version: "2.3.1"
  status: "GA"
  owner: "identity-team"
  repository: "github.com/example/user-api"
  documentation: "https://docs.example.com/apis/users"
technical:
  base_url: "https://api.example.com/v2"
  openapi_spec: "https://api.example.com/v2/openapi.yaml"
  authentication: ["oauth2"]
  rate_limits: { tier: "standard" }
compliance:
  data_classification: "PII"
  gdpr_compliant: true
  pen_test_date: "2025-01-15"
dependencies:
  upstream: ["auth-service"]
  downstream: ["billing-api"]
```

## Enforcement in CI/CD

1) **Spec Linting** (.spectral.yml — extended OpenAPI rules)  
2) **Breaking-change detection** (SemVer + openapi-diff)  
3) **Contract tests** (Pact broker can‑i‑deploy)  
4) **SDK regeneration** (typed clients)  
5) **Security scan** (SCA, secret scan)  
6) **Docs completeness** (front-matter, examples, cross‑refs)

### Spectral Rules (starter)
```yaml
extends:
  - spectral:oas
rules:
  api-version-semver:
    description: info.version must be semantic (MAJOR.MINOR.PATCH)
    given: $.info.version
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[0-9]+\.[0-9]+\.[0-9]+$"

  operation-id-kebab-case:
    description: operationId must be kebab-case
    given: $.paths[*][*].operationId
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"

  response-examples-required:
    description: All responses must include examples
    given: $.paths[*][*].responses[*].content[*]
    severity: error
    then:
      - field: example
        function: truthy
      - field: examples
        function: truthy

  ai-metadata-required:
    description: ML endpoints must expose model_id, model_version, confidence
    given: $.paths[*][post,put].responses[200].content[*].schema.properties
    severity: error
    then:
      function: schema
      functionOptions:
        schema:
          required: ["model_id", "model_version", "confidence"]
```

## Exception Process
- Record an **ADR** describing the exception, scope, and sunset date.
- Obtain approvals from the API governance board (and CISO for security exceptions).
- Add an entry to the governance config; define remediation plan.
- Time‑box exceptions; auto‑expire and notify owners.

## Change Control & Deprecations
- Maintain a public **Changelog** per API.
- Communicate deprecations at least 6 months in advance for MAJOR bumps.
- Provide migration guides, sample requests/responses, and SDK upgrade notes.
- Add `Deprecation`/`Sunset` headers and successor links on responses.

## PR Checklist (copy into description)
- [ ] Spec updated (OpenAPI + API-Specification.md)
- [ ] SemVer bump & changelog
- [ ] Security review done (authZ scopes, data class)
- [ ] Contract tests added/updated (Pact)
- [ ] SDK regenerated & published
- [ ] Dashboards/alerts updated (if new endpoints)
- [ ] Migration guide (if breaking/deprecating)

## References
- Versioning Policy (SemVer, lifecycle, deprecation)
- Security Guidelines & Threat Model
- Observability Runbook & SLOs
- ADR template (for exceptions & major decisions)

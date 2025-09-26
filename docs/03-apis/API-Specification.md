---
owner: api-team
last_review: 2025-09-25
status: draft
tags: ["api", "rest", "contract"]
references:
  - "openapi.yaml"
  - "asyncapi.yaml"
  - "Clients-and-API-Portal.md"
  - "../04-data/Database-Design.md"
  - "../09-governance/API-Governance.md"
---

# API Specification Overview

This document summarises Nexzo MyProperty's public and private APIs. Full contracts live in `openapi.yaml` (REST) and `asyncapi.yaml` (events).

## 1. Principles
- **Contract-first:** All changes originate from `openapi.yaml` and must pass Spectral + Schemathesis checks.
- **Stable base path:** External APIs served under `/api/v1`; internal services use `/internal/v1` with mTLS.
- **Tenant scoping:** Every request requires `X-Tenant-Id` header and JWT with domain scope; responses exclude data outside the tenant.
- **Idempotency:** Write operations accept `Idempotency-Key` header for safe retries.
- **Pagination:** Cursor-based pagination with `limit` (≤100) and `cursor` tokens.

## 2. Core Resources
| Resource | Description | Key Endpoints |
| --- | --- | --- |
| Tenants & Users | Organisations, landlords, tenants, roles | `POST /tenants`, `GET /tenants/{id}`, `POST /users` |
| Properties & Units | Buildings, units, meters, solar assets | `GET /properties`, `POST /properties`, `POST /units` |
| Energy Data | Meter readings, allocations, anomalies | `POST /meters/{id}/readings`, `GET /allocations` |
| Billing | Invoices, ledger entries, payment intents | `POST /invoices`, `GET /invoices/{id}`, `POST /payments/intent` |
| Service Requests | Maintenance tickets, quotes, schedules | `POST /tickets`, `POST /tickets/{id}/quotes`, `POST /tickets/{id}/complete` |
| Projects | OriginFD project links, status | `POST /projects`, `GET /projects/{id}` |
| Webhooks | Stripe, OriginFD, provider events | `POST /webhooks/stripe`, `POST /webhooks/originfd` |

Detailed field definitions and examples in `openapi.yaml`.

## 3. Authentication & Authorization
- JWT issued by shared identity provider; include `sub`, `tenant_id`, `roles`, `domains` claims.
- OAuth2 client credentials for service-to-service, auth server exposes `/oauth/token`.
- Role matrix: `LANDLORD_ADMIN`, `PROPERTY_MANAGER`, `TENANT`, `SERVICE_PROVIDER`, `OPS_ADMIN`, `AI_AGENT`.
- Fine-grained RBAC enforced in gateway and services; refer to `../08-security/Security-Guidelines.md`.

## 4. Eventing
Key topics described in `asyncapi.yaml`:
- `meter.reading.ingested` — ingestion workers publish after validation.
- `billing.invoice.finalized` — billing service emits for downstream ledger/warehouse.
- `service.ticket.updated` — state changes broadcast to notify service.
- `originfd.project.sync` — updates from OriginFD integration.
- `ai.agent.audit` — actions taken by agents for audit pipeline.

Consumers subscribe via service accounts; event ordering guaranteed per tenant using keyed partitions.

## 5. Error Handling
- Standard error envelope:
```json
{
  "error": {
    "code": "string",
    "message": "human readable",
    "details": {"field": ["issue"]},
    "trace_id": "uuid"
  }
}
```
- HTTP status codes follow RFC 9110; `422` for validation, `409` for conflict, `429` for rate-limits.
- Errors include remediation hints for UI and partners.

## 6. Versioning Policy
- Semantic versioning; breaking changes bump major version (see `../09-governance/Versioning-Policy.md`).
- Deprecations announced via changelog and `Deprecation` header with retirement date.

## 7. Tooling & SDKs
- TypeScript and Python SDKs generated using `openapi-generator` and published under `packages/sdk`.
- Postman/Stoplight collections generated automatically for developer onboarding.
- AsyncAPI generator used for schema-driven consumer code.

## 8. Testing
- Contract tests with Pact for consumer-driven validation.
- Schemathesis fuzz tests covering required query/path combinations; run nightly and in CI on master.
- Webhook replay harness to ensure idempotent handling.

For detailed onboarding and key management see `Clients-and-API-Portal.md`.

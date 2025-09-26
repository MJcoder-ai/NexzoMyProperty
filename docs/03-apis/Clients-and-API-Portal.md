---
owner: developer-relations
last_review: 2025-09-25
status: draft
tags: ["api-portal", "sdk"]
references:
  - "API-Specification.md"
  - "openapi.yaml"
  - "asyncapi.yaml"
  - "../05-dev/Dev-Env-Setup.md"
  - "../../Docs_Templates/README.md"
---

# Clients and API Portal

## 1. Portal Overview
External partners and premium landlords access APIs through the Nexzo developer portal (`https://developers.nexzo.com/myproperty`). The portal provides API key management, SDK downloads, documentation, webhook testing tools, and release notes.

## 2. Onboarding Flow
1. **Tenant admin request:** Landlord admin submits request via portal or account manager.
2. **Verification:** Ops validates organisation, billing status, and compliance requirements.
3. **Provisioning:** Portal issues OAuth2 client credentials and API keys scoped to the tenant. Keys are environment-specific.
4. **Acceptance:** Customer must accept API terms of use and data processing addendum.
5. **Monitoring:** Usage appears in portal dashboard with per-key analytics and error logs.

## 3. Authentication Options
- **OAuth2 Client Credentials:** Recommended for backend integrations. Token endpoint `POST /oauth/token` with scopes `mp.read`, `mp.write`, `mp.billing`, `mp.service`.
- **API Keys:** Lightweight access for low-risk read APIs (e.g. dashboards). Keys delivered with rate limit default 200 rpm. Include `X-Api-Key` and `X-Tenant-Id` headers.
- **Webhook Secrets:** Shared secrets per endpoint; rotate via portal UI.

## 4. SDKs & Tools
- **JavaScript/TypeScript SDK:** Published to npm as `@nexzo/myproperty-sdk`. Provides typed clients for all `/v1` endpoints and handles retries + idempotency.
- **Python SDK:** Published to internal PyPI. Mirrors TypeScript features, includes async support.
- **Postman Collection:** Auto-generated from OpenAPI and synced to portal.
- **CLI:** Planned addition for bulk data uploads and billing reconciliation.

## 5. Webhooks
| Event | Description | Payload Spec |
| --- | --- | --- |
| `billing.invoice.finalized` | Invoice ready for delivery | `asyncapi.yaml` → `InvoiceFinalized` |
| `billing.payment.settled` | Payment captured or failed | `PaymentSettled` |
| `service.ticket.updated` | Status change for maintenance ticket | `ServiceTicketUpdated` |
| `originfd.project.sync` | OriginFD project status | `OriginFdProjectSync` |

### Verification & Retries
- HMAC signatures using SHA256, header `X-Nexzo-Signature`.
- Retries with exponential backoff (max 8 attempts). Customers must return `2xx` to acknowledge.
- Replay portal available for debugging with 30-day retention.

## 6. Rate Limits & Quotas
- Default per-tenant quotas: 200 rpm, 50k requests/day. Higher quotas require review.
- Burst handling via leaky bucket; responses include `X-Rate-Limit-*` headers.
- Webhook sends limited to 5 concurrent deliveries per tenant.

## 7. Versioning & Change Management
- Breaking changes follow 90-day deprecation cycle with release notes and email alerts.
- Portal exposes changelog feed and upcoming schema diffs.
- Beta endpoints flagged with `/beta` prefix and require opt-in.

## 8. Support
- Self-serve knowledge base, API explorer, and sample apps.
- Dedicated Slack/Teams channel for enterprise tenants.
- Support SLAs: High (4h), Medium (1 business day), Low (3 business days).

Keep this document updated alongside portal improvements.

# Downstream Integration Notes

This guide explains how the shared onboarding, billing, and service-ticket services are intended to be consumed by the API gateway and AI assistant tools. The focus is on the new database-backed routes and the rich payloads they expose.

## Common Conventions

- All services expect `Authorization: Bearer <token>` and a tenant context via `X-Tenant-Id` when the authenticated subject is multi-tenant.
- JSON bodies leverage snake-case keys for external consumers; internal Prisma models handle camelCase conversion.
- Error payloads follow the `{ "error": string, "statusCode": number }` pattern provided by `@nexzo/core`.

## Onboarding Service

### POST `/v1/invitations/:token/accept`
- **Purpose**: Accept a pending invitation and upsert the tenant user.
- **Request Body**: `{ "firstName": string?, "lastName": string? }`
- **Response** 200: `{ "tenantId", "userId", "email", "role", "acceptedAt" }`
- **Failure Modes**: `404` if token invalid, `409` if already used, `400` when expired.
- **Gateway Action**: expose as `/onboarding/invitations/:token/accept` (public route, no tenant header).
- **AI Tool Hook**: `create_tenant_user_from_invite` should call this endpoint after validating invite tokens delivered via email.

### PATCH `/v1/tenants/:tenantId/users/:userId/profile`
- Allows profile completion (first/last name, status). Ensure tenant scoping.

### POST `/v1/properties`
- Creates a property with JSON address metadata. When the gateway proxies, validate address shape before forwarding. For AI assistant, the `create_property` tool should marshal address as nested JSON and expect `createdAt` ISO string in response.

### POST `/v1/properties/:propertyId/units` & `/v1/units/:unitId/tenancies`
- These endpoints enable downstream services to attach units and tenancies. The API gateway should surface them under `/onboarding/properties` and `/onboarding/tenancies` namespaces for landlord dashboards.

## Billing Service

### POST `/v1/invoices`
- **Required Body**:
  ```json
  {
    "tenantId": "uuid",
    "tenantUserId": "uuid",
    "propertyId": "uuid?",
    "billingPeriod": "2025-06",
    "currency": "USD",
    "usage": { "solarKwh": 128.4, "gridKwh": 302.1 },
    "lineItems": [
      { "description": "Solar allocation", "category": "energy", "amount": 120.5 },
      { "description": "Grid usage", "category": "energy", "amount": 220.3 }
    ]
  }
  ```
- **Response**: includes `allocationSummary` (kWh totals & percentages) and `compliance` note derived from regional rule packs.
- **Gateway Mapping**: the API gateway should expose a landlord-facing `POST /billing/invoices` that forwards the payload as-is and passes through the summary data for the UI. Ensure `usage` fields are preserved for analytics.
- **AI Tools**: update `generate_invoice_draft` to include the allocation summary in its response to end-users. The tool should propagate `compliance.note` verbatim into messaging but add clarifying copy indicating the source (`rule-pack` vs `fallback`).

## Service-Tickets Service

### POST `/v1/tickets`
- Creates tickets and automatically logs an activity (`created`). The gateway can expose `/tickets` for landlords/tenants depending on RBAC.

### POST `/v1/tickets/:ticketId/status`
- Validates status transitions through the `allowedStatusTransitions` matrix. Downstream clients should handle `400` with the message suggesting the invalid transition. AI assistants must reference this matrix before attempting automated escalations.

### POST `/v1/tickets/:ticketId/activity`
- Appends custom activities; payload supports optional `note` for free-form context. Use in web UI timelines.

### POST `/v1/tickets/:ticketId/assignment`
- Updates or creates provider schedule records, logging an `assignment:provider` activity. The response includes the effective `scheduledFor` timestamp (or `null`). The gateway should normalize contact data before persisting; AI tooling can surface provider scheduling confirmations using these fields.

## Configuration Updates

| Service | Required Action |
|---------|-----------------|
| API Gateway | Add proxy routes for onboarding (`/onboarding/*`), billing (`/billing/invoices`), and service tickets (`/tickets/*`). Ensure tenant-header passthrough and reuse `requireAuth` middleware. |
| AI Assistant | Update tool manifest to include: `accept_invitation`, `complete_profile`, `create_invoice_draft`, `log_ticket_status`, `assign_ticket_provider`. Map each tool to the endpoints listed above and include role-based guards before issuing requests. |

## Testing Guidance

- Use the Prisma SQLite test harness (or Docker Postgres from `docker-compose.yml`) to seed tenants/company data before calling the new endpoints.
- Service-specific Jest suites should stub Prisma via dependency injection; when adding tests ensure `allocationSummary` math is covered with zero usage, solar-only, and grid-only scenarios.
- For manual verification run:
  ```bash
  pnpm --filter @nexzo/onboarding dev
  pnpm --filter @nexzo/billing dev
  pnpm --filter @nexzo/service-tickets dev
  ```
  and use `httpie`/`curl` to test the above routes.

## Next Steps

- Extend the API gateway with dedicated controllers that compose these services.
- Regenerate shared API clients (`packages/api-client`) once the OpenAPI spec is updated to reflect the new schemas.
- Coordinate with the AI assistant team to align prompt templates with the new compliance messaging.

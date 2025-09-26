---
owner: release-management
last_review: 2025-09-25
status: draft
tags: ["versioning", "governance"]
references:
  - "API-Governance.md"
  - "../03-apis/API-Specification.md"
  - "../07-ops/Deployment-Infrastructure.md"
---

# Versioning Policy

## 1. Semantic Versioning
- Follow `MAJOR.MINOR.PATCH` for services, SDKs, and APIs.
- **MAJOR:** Breaking change (removing field, altering contract, incompatible behaviour).
- **MINOR:** Backward-compatible feature (new field, endpoint).
- **PATCH:** Bug fix or documentation correction.

## 2. API Versioning
- REST endpoints include `/v1` base path. Breaking changes require new version (`/v2`).
- Deprecations communicated at least 90 days prior; include `Deprecation` and `Sunset` headers.
- Maintain two concurrent API versions max; older versions removed after sunset.

## 3. Event Versioning
- Async messages include `schemaVersion` field.
- Breaking change requires new topic or version suffix (e.g., `billing.invoice.finalized.v2`).
- Maintain compatibility for consumer grace period (≥ 60 days).

## 4. SDKs & Packages
- SDK release triggered by OpenAPI changes; version matches API MINOR/PATCH when possible.
- Deprecation warnings in SDK outputs for fields/endpoints scheduled for removal.

## 5. Database Migrations
- Migrations versioned sequentially with timestamp prefix.
- Breaking schema changes require backward-compatible rollout (add columns, backfill, switch, drop).
- Rollback scripts mandatory for non-trivial migrations.

## 6. Communication
- Version changes recorded in release notes and Slack #release channel.
- Customers notified via email/portal for MAJOR changes.
- Internal docs updated (PRD/TRD) when version increments include new capabilities.

Adhere to this policy for consistent releases.

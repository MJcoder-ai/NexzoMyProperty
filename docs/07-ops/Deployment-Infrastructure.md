---
owner: platform-engineering
last_review: 2025-09-25
status: draft
tags: ["deployment", "infrastructure", "gcp"]
references:
  - "../01-architecture/System-Architecture.md"
  - "../../Nexzo MyProperty & OriginFD Integration Plan.md"
  - "Observability-Runbook.md"
  - "SLOs.md"
---

# Deployment & Infrastructure Plan

## 1. Environment Strategy
| Environment | Purpose | Notes |
| --- | --- | --- |
| `dev` | Shared sandbox for developers | Lightweight resources, seeded data |
| `staging` | Pre-prod integration testing | Mirrors production configs, smoke tests |
| `prod` | Customer-facing | High availability, limited access |

Feature previews use ephemeral environments spun up via Vercel preview + Cloud Run revisions.

## 2. Infrastructure Components
- **Compute:** Cloud Run services per microservice (gateway, billing, meter, compliance, notify, orchestrator) and Cloud Run jobs for workers. Web/docs on Vercel.
- **Networking:** Serverless VPC Access connectors, Cloud Load Balancer, Cloud Armor for WAF.
- **Database:** Cloud SQL Postgres (HA configuration, PITR enabled). BigQuery for analytics. Redis (Memorystore) for cache/session/queues.
- **Storage:** GCS buckets for documents, attachments, exports. Lifecycle rules for archives.
- **Messaging:** Pub/Sub topics for meter ingestion, billing events, agent audit, OriginFD sync.
- **Secrets:** Secret Manager with automatic rotation via Cloud Scheduler.
- **CI/CD:** Cloud Build + GitHub Actions; Terraform for infra provisioning.

## 3. Deployment Pipeline
1. Developer PR merged into `main` triggers GitHub Actions.
2. `pnpm lint/test/typecheck` + Python tests run.
3. Build Docker images per service, push to Artifact Registry.
4. Cloud Build deploys to `staging` using Terraform workspace variables.
5. Smoke tests (Postman, Cypress) run; if successful, manual approval gates release to `prod`.
6. Production deployment uses Cloud Run traffic splitting (10% canary → 100%).

## 4. Configuration Management
- Config stored in `packages/config` with environment overlays (dev/staging/prod) stored in `infra/config` as YAML.
- Secrets injected via Cloud Run environment variables referencing Secret Manager.
- Feature flags managed via LaunchDarkly (or equivalent) with change auditing.

## 5. Scaling & Resilience
- Cloud Run min instances: 1 (prod), 0 (dev). Max: gateway 20, billing 10, orchestrator 10, workers 5.
- Autoscaling based on request concurrency / CPU; tune per service.
- Database with read replica for analytics; consider dedicated replica for heavy reporting jobs.
- Redis configured with HA; failover playbook in `Observability-Runbook.md`.
- Backups: daily SQL backups, object versioning for GCS.

## 6. Security & Compliance
- IAM roles principle of least privilege; use service accounts per service.
- VPC Service Controls around Cloud Storage and BigQuery.
- Terraform state stored in Terraform Cloud or GCS bucket with versioning.
- Cloud Armor policies to block malicious IP ranges, enforce rate limits.

## 7. Release Management
- Semantic version tags for services; release notes in GitHub.
- Blue/green (traffic splitting) for low-risk deploys; roll back by setting previous revision to 100%.
- Database migrations executed via Cloud Build step (with manual approval for prod).
- Observability dashboards updated automatically via Terraform modules.

## 8. Future Enhancements
- Evaluate GKE Autopilot for long-running workloads if Cloud Run limits reached.
- Multi-region failover using Cloud SQL cross-region replicas.
- Integrate policy-as-code (OPA/Conftest) for Terraform.

Document updates required when infrastructure changes.

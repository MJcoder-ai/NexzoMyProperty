---
owner: data-team
last_review: 2025-09-25
status: draft
tags: ["database", "schema", "postgres"]
references:
  - "../../nexzo-myproperty-concept.md"
  - "../03-apis/openapi.yaml"
  - "Data-Governance.md"
  - "DPIA.md"
---

# Database Design

## 1. Overview
Primary OLTP datastore is PostgreSQL (Cloud SQL) with schemas:
- `myproperty`: Core application data (tenants, properties, billing, service, AI logs).
- `originfd`: Managed by OriginFD (read-only for MyProperty services).
- `warehouse_staging`: ETL landing tables before loading into BigQuery.

Row Level Security enforced per tenant on all tables. Every table has `tenant_id`, `created_at`, `updated_at`, and `version` for optimistic locking.

## 2. Entity-Relationship Diagram (textual)
```
Tenant (tenant_id PK)
  ├── User (user_id PK, tenant_id FK)
  ├── Property (property_id PK, tenant_id FK)
       ├── Unit (unit_id PK, property_id FK)
       │     ├── Tenancy (tenancy_id PK, unit_id FK, user_id FK)
       │     └── MeterAssignment (meter_assignment_id PK, unit_id FK, meter_id FK)
       ├── Meter (meter_id PK, property_id FK)
       │     └── MeterReading (reading_id PK, meter_id FK)
       └── SolarAsset (asset_id PK, property_id FK)
  ├── AllocationLedger (allocation_id PK, property_id FK, unit_id FK)
  ├── Invoice (invoice_id PK, tenant_user_id FK)
       └── InvoiceLine (line_id PK, invoice_id FK)
  ├── Payment (payment_id PK, invoice_id FK)
  ├── LedgerEntry (ledger_entry_id PK, tenant_id FK)
  ├── ServiceTicket (ticket_id PK, property_id FK)
       ├── TicketQuote (quote_id PK, ticket_id FK)
       ├── TicketSchedule (schedule_id PK, ticket_id FK)
       └── TicketActivity (activity_id PK, ticket_id FK)
  ├── ProjectLink (link_id PK, property_id FK, originfd_project_id FK)
  ├── ComplianceRuleState (rule_state_id PK, property_id FK)
  ├── NotificationPreference (preference_id PK, user_id FK)
  └── AgentAudit (audit_id PK, tenant_id FK)
```

## 3. Table Definitions (selected)
### tenants
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| name | text | |
| region | text | ISO country |
| status | text | enum: active, suspended |
| metadata | jsonb | arbitrary config |
| created_at | timestamptz | default now |
| updated_at | timestamptz | |

### users
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| tenant_id | uuid | FK tenants(id) |
| email | citext | unique per tenant |
| role | text | enum |
| status | text | |
| mfa_enabled | boolean | |
| last_login_at | timestamptz | |

### properties
| Column | Type | Notes |
| id | uuid | PK |
| tenant_id | uuid | FK |
| name | text | |
| address | jsonb | stored structured |
| timezone | text | |
| utility_account_number | text | |
| solar_capacity_kw | numeric | |
| metadata | jsonb | |
| created_at | timestamptz | |

### units
| Column | Type | Notes |
| id | uuid | PK |
| property_id | uuid | FK |
| label | text | |
| floor | text | optional |
| sq_ft | numeric | optional |
| active | boolean | |

### meters
| Column | Type | Notes |
| id | uuid | PK |
| property_id | uuid | FK |
| type | text | enum: solar, grid, water, gas |
| make_model | text | |
| serial_number | text | unique per tenant |
| timezone | text | |
| created_at | timestamptz | |

### meter_readings
Partitioned by `reading_date` (daily).  
Columns: `id`, `tenant_id`, `meter_id`, `reading_ts`, `value_kwh`, `quality`, `source`, `ingestion_job_id`.

### allocation_ledger
- `id`, `tenant_id`, `property_id`, `unit_id`, `billing_period`, `solar_kwh`, `grid_kwh`, `loss_kwh`, `allocation_method`, `confidence`, `adjusted_by`, `adjusted_at`, `notes`.
- Unique constraint `(tenant_id, unit_id, billing_period)`.

### invoices & invoice_lines
- `invoices`: `id`, `tenant_id`, `tenant_user_id`, `billing_period`, `status`, `total_amount`, `currency`, `issued_at`, `due_at`, `metadata`.
- `invoice_lines`: `id`, `invoice_id`, `description`, `category`, `quantity`, `unit_amount`, `total_amount`, `tax_rate`, `solar_band`.

### ledger_entries
Implements double-entry accounting with `debit_account`, `credit_account`, `amount`, `currency`, `reference_type`, `reference_id`.

### service_tickets
- `id`, `tenant_id`, `property_id`, `unit_id`, `opened_by`, `status`, `priority`, `summary`, `description`, `category`, `attachments`, `sla_target_at`.
- `TicketActivity` stores timeline items (status change, note, attachment, AI action).

### project_links
- `id`, `tenant_id`, `property_id`, `originfd_project_id`, `project_type`, `status`, `scope_summary`, `target_live_date`, `sync_payload`.

### agent_audit
- `id`, `tenant_id`, `agent_id`, `tool_name`, `input_hash`, `outcome`, `latency_ms`, `trace_id`, `performed_by_user_id`, `payload`.

## 4. Indexing Strategy
- Primary keys as UUID (v7 recommended).  
- Composite indexes for high-volume queries: `(tenant_id, property_id)`, `(tenant_id, billing_period)`, `(tenant_id, meter_id, reading_ts)`.  
- Partial index on invoices for `status = 'overdue'`.  
- Full-text GIN index on service ticket `summary` and `description` for search.

## 5. Data Integrity & Constraints
- Foreign keys with `ON DELETE RESTRICT` to prevent accidental cascade; use soft deletes by toggling status.
- Unique constraint on `users` combining `tenant_id + email`.
- Check constraints for positive numeric values (kWh, monetary amounts).
- Trigger to ensure invoice totals equal sum of lines.
- Allocation adjustments stored in history table `allocation_adjustments` with references to actor.

## 6. Auditing & History
- `audit.logged_actions` extension for generic change auditing.
- Temporal tables for invoices and ledger entries (via history tables + triggers).
- Chat transcripts stored in `agent_messages` table (not shown) with encryption-at-rest for PII fields.

## 7. Warehouse Model (BigQuery)
Star schema with facts and dimensions:
- `dim_tenant`, `dim_property`, `dim_unit`, `dim_provider`, `dim_rate_plan`.
- `fact_energy_usage`, `fact_invoice`, `fact_payment`, `fact_service_ticket`, `fact_agent_session`.
- `mart_roi_summary`, `mart_carbon_savings`, `mart_solar_performance`.

DBT models housed in `data/warehouse` with snapshots for slowly changing dimensions.

## 8. Future Enhancements
- Evaluate storing high-resolution telemetry in `data/timeseries` using Parquet + Iceberg or TimescaleDB.
- Consider separate ledger service using Event Sourcing for high throughput.
- Add multi-region replicas with logical decoding for reporting.

Maintain schema definitions in migrations and ensure docs match production.

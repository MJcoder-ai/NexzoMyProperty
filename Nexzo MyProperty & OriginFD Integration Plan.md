# **Nexzo MyProperty & OriginFD Integration Plan**

This document explains how Nexzo MyProperty (a multi‑tenant property management system) and **OriginFD** (a multi‑domain project management and design tool) should share infrastructure, authentication and data while remaining logically separated. The goal is to let landlords create and manage solar or other capital projects through OriginFD while keeping day‑to‑day property, tenant and rent data isolated in MyProperty. It follows the architectural patterns defined in the OriginFD repository and adapts them to the MyProperty domain.

## **1\. High‑level relationship**

* **Separation of concerns.** MyProperty owns all property, tenancy and rent‑related data. OriginFD remains the system of record for design files, project lifecycles, work orders and AI‑assisted tooling. Each system has its own micro‑services, database schema and CI/CD pipeline. Cross‑links are established via unique identifiers (e.g. `property_id` and `project_id`). This ensures that tenancy operations (billing, lease management, maintenance requests) do not leak into the engineering/design domain and vice‑versa.

* **Shared infrastructure patterns.** Both systems run on the same Google Cloud project using **Cloud Run** services and a shared **Cloud SQL (PostgreSQL) instance** with **Redis (Memorystore)** for queues and caching. The OriginFD deployment guide lists the baseline components: API service, AI orchestrator, background workers, Next.js web front‑end, PostgreSQL database and Redis cache[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L18-L28). MyProperty will reuse these patterns but spin up its own services and tables on the same managed instances.

* **Single sign‑on (SSO).** A common identity provider issues JWT tokens for users across both platforms. Users sign in once and are authorized to either or both systems based on roles (Landlord, Tenant, Service Provider, Admin). The existing deployment already injects `JWT_SECRET_KEY` and sets up JWT‑based authentication[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L151-L165)[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L186-L189); MyProperty will leverage this infrastructure and add role scopes for property management.

* **OriginFD as a multi‑domain hub.** Over time OriginFD is intended to handle solar installations, energy storage, HVAC, elevators, and other hardware projects. MyProperty acts as a tenant‑facing portal and rental ledger. When a landlord requests a new capital project (e.g. a solar installation), MyProperty triggers the creation of an associated OriginFD project. All engineering calculations, permits, procurement and installation tasks are executed within OriginFD. Once complete, a simplified summary (capacity, warranty, installation date, service provider) is persisted back to MyProperty for ongoing operations and tenant billing.

## **2\. Database & data model**

### **2.1 Multi‑tenant Postgres**

The OriginFD repository shows how to set up a multi‑tenant PostgreSQL database with row‑level security (RLS). A session helper sets the `app.current_tenant` variable on every request; the database policy then restricts all queries to the given tenant[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/OriginFD_Canonical%20Development%20Guide.md#L411-L424). MyProperty will adopt the same pattern. Both systems can share the same **Cloud SQL** instance but must store data in **separate schemas** (`originfd` and `myproperty`) or separate logical databases within the instance. Each micro‑service will set its own `current_tenant` ID when opening a session.

### **2.2 Schema separation and cross‑links**

* **OriginFD schema.** Houses projects, documents, design artefacts, work orders, AI run‑books and tool outputs. Entities include `project`, `document`, `work_order`, `component`, `payment_milestone`, etc. The canonical guide mandates that you set the tenant for each session and enforce RLS[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/OriginFD_Canonical%20Development%20Guide.md#L411-L424).

* **MyProperty schema.** Contains properties, units, leases, rent ledgers, tenants, payments, and maintenance tickets. Each row is tagged with `tenant_id` and optionally a `property_id` to enable RLS.

* **Cross‑reference table.** A mapping table (e.g. `property_project_link`) stores `property_id`, `project_id` and metadata (scope, installation date, status). MyProperty writes to this table when it requests a new project; OriginFD reads it to scope notifications back to the right property. This table lives in the MyProperty schema but references project IDs from the OriginFD schema.

* **Data flow**

  1. **Landlord onboarding:** When a new landlord signs up via MyProperty, a `tenant_id` is created and stored in both systems. MyProperty holds the user profile, property list and payment method; OriginFD stores an empty `organisation` record to be populated once a project is created.

  2. **Project creation:** A landlord requests a solar installation. MyProperty calls OriginFD’s project‑creation API, passing the landlord’s `tenant_id`, `property_id`, scope (e.g. solar PV), and initial requirements. OriginFD creates a new `project` record, links it to the landlord’s tenant ID and returns a `project_id`. MyProperty records this `project_id` in the `property_project_link` table.

  3. **Execution:** All engineering and procurement activities occur in OriginFD. MyProperty continues to manage leases, rents and maintenance independently.

  4. **Handover:** Upon completion, OriginFD publishes a summary to the `property_project_link` record (capacity, installation date, warranty, maintenance provider). MyProperty uses this summary to adjust rent or service charges and to display the asset in tenant dashboards.

### **2.3 Future domains**

OriginFD is designed to be multi‑domain: PV, BESS, HVAC, elevators, etc. Adding new domains will follow the same pattern—MyProperty triggers project creation in OriginFD and stores the returned `project_id` and summary metadata. Keeping separate schemas ensures that adding new domains does not pollute the property management tables.

## **3\. Authentication & identity**

### **3.1 Single sign‑on and role management**

The existing OriginFD deployment injects `DATABASE_URL`, `REDIS_URL` and `JWT_SECRET_KEY` into the API, orchestrator and workers[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L151-L165). Authentication is JWT‑based and uses rotating secret keys; all backend services require valid authorization headers[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L186-L189). MyProperty will reuse this infrastructure:

* **Identity provider:** A central auth service (e.g. NextAuth or custom FastAPI Auth) issues JWTs. Users log in once and can access both MyProperty and OriginFD. Each token contains claims such as `user_id`, `roles`, and an array of `domains` (e.g. `"myproperty"`, `"originfd"`).

* **Roles and scopes:** Define roles for MyProperty (`landlord`, `tenant`, `service_provider`, `property_admin`) and roles for OriginFD (`engineer`, `designer`, `project_manager`). Permissions are managed via RBAC tables. When a user accesses a resource, the service checks the domain claim and the role before authorizing.

* **Cross‑app authorisation:** A landlord can access both MyProperty and OriginFD, but a tenant or service provider may only access MyProperty. The auth service ensures that tokens used with OriginFD include the `originfd` domain claim and at least one matching role.

* **User provisioning:** When a landlord signs up in MyProperty, the auth service automatically creates a corresponding user in OriginFD with a default role (e.g. `project_owner`). Conversely, a user created in OriginFD for a service provider can be granted MyProperty access by adding the appropriate domain claim.

### **3.2 Session management and tokens**

* **Frontend:** Both web applications load a common login page and store the JWT in a secure cookie or local storage. The token is sent to whichever backend is being called. The Next.js front‑ends configure `NEXT_PUBLIC_API_URL` for each app[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L151-L165).

* **Backend:** FastAPI services verify tokens using the shared `JWT_SECRET_KEY` and check the domain claim. Tokens have short lifetimes (e.g. 15 minutes) with refresh tokens stored server‑side. Blacklist refresh tokens on logout or password change.

* **Service‑to‑service calls:** OriginFD’s orchestrator and worker pods call MyProperty APIs using service accounts with their own tokens. These tokens are stored in Secret Manager and rotated automatically.

## **4\. Hosting & infrastructure**

### **4.1 Shared cloud resources**

The OriginFD deployment guide outlines a standard GCP architecture: Cloud Build triggers build Docker images, provisions infrastructure (Cloud SQL, Memorystore, VPC) and deploys four services to Cloud Run[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L18-L28)[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L119-L125). MyProperty will reuse these resources:

* **Cloud Run services:** Deploy MyProperty’s API (`/myproperty/api/*`), orchestrator (`/myproperty/orchestrator/*`), workers and web front‑end as separate Cloud Run services. Use a naming convention (`myproperty‑api‑dev`, `originfd‑api‑dev`, etc.) to avoid clashes. Each service has its own concurrency and scaling limits, similar to OriginFD’s configuration[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L143-L150).

* **Database and cache:** Use the same Cloud SQL instance and Redis cluster but with separate databases or namespaces for MyProperty. Secrets for the MyProperty `DATABASE_URL` and `REDIS_URL` are stored in Secret Manager with restricted access. Environment variables are injected at deployment time, just like for OriginFD[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L151-L165).

* **VPC and networking:** Both systems remain in the same VPC. Backend services are not publicly accessible[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/DEPLOYMENT.md#L170-L177); only the web front‑ends have public endpoints via the load balancer. Service‑to‑service traffic stays on the private network.

* **CI/CD:** Create a separate Cloud Build trigger for the MyProperty repository, reusing the existing `cloudbuild.yaml` template but parameterizing it to target different service names and environment variables. Each project can have its own environments (dev, staging, prod) but share Terraform modules and base Docker images.

### **4.2 Resource isolation and scaling**

* **Scaling:** Set conservative scaling policies for MyProperty services at first (e.g. 1–5 instances) and monitor usage. Use separate autoscaling metrics for each service. This prevents heavy design computations in OriginFD from starving property management endpoints.

* **Secrets and service accounts:** Use dedicated service accounts for MyProperty services with only the permissions they need. Do not re‑use the same Cloud Run service accounts as OriginFD; this limits the blast radius if credentials are compromised.

* **Monitoring and logging:** All services emit logs to Cloud Logging and metrics to Cloud Monitoring. Dashboards should be segmented by service name. Common alerts (e.g. database connection errors, latency spikes) can be reused across both apps.

## **5\. Code & domain boundaries**

### **5.1 Repository layout**

* **Separate repositories or monorepo packages:** Keep MyProperty and OriginFD code bases in separate repositories or as separate top‑level `apps` in a monorepo. Do **not** mix domain logic. For example, OriginFD’s canonical guide instructs that business logic belongs in `domains/` packages and that each mutation is subject to RBAC and approval[GitHub](https://github.com/MJcoder-ai/OriginFD/blob/955562ae8d5e7c70d9df6b14d55af83af37a0246/OriginFD_Canonical%20Development%20Guide.md#L449-L476). MyProperty should follow the same discipline, placing property management logic in its own domain package and exposing a thin HTTP layer.

* **Shared libraries:** Extract common utilities (authentication middleware, database session management, type definitions, UI components) into shared packages (e.g. `@nexzo/core`, `@nexzo/ui`, `@nexzo/types`) that both projects import. Version these packages and publish them to an internal registry. This reduces duplication while keeping core logic separated.

* **API contracts:** Define OpenAPI contracts for both systems. OriginFD already exposes a REST/AsyncAPI specification. MyProperty should do the same, documenting endpoints for property CRUD, tenant management, rent ledger, maintenance tickets and the project creation callback. Use consistent patterns for error handling and pagination. Review API governance guidelines to ensure versioning and backwards compatibility.

* **Separate migrations:** Each schema maintains its own Alembic (or equivalent) migration history. Running `alembic upgrade head` in MyProperty should only affect the MyProperty schema and never touch OriginFD tables.

### **5.2 Developer workflows**

* **CI policies:** Both projects should run linting, type‑checking and unit tests. Code generation (e.g. client SDKs from OpenAPI) should be triggered only when API specs change. Follow the same PR review standards as OriginFD, including ADR updates and security reviews.

* **Tooling:** Use the same AI orchestrator framework for MyProperty if it requires tool‑calling agents (e.g. to generate invoices or allocate utility charges). Register MyProperty‑specific tools in a separate registry to avoid conflicts with OriginFD tool sets. Follow the guardrails and prompt guidelines to prevent cross‑domain data leakage.

## **6\. Lifecycle example**

Below is an example of how the two systems work together when a landlord requests a solar project for a rental property:

1. **Landlord logs in:** The landlord signs into MyProperty via the shared SSO. The JWT token contains `user_id`, `roles` (e.g. landlord), and domains (`myproperty`, `originfd`).

2. **Property selection:** The landlord selects one of their properties (e.g. 123 Main St.). MyProperty displays tenant information, rent ledger and any linked projects. It queries the `property_project_link` table to show existing OriginFD projects.

3. **Request solar project:** The landlord clicks “Add Solar Installation”. MyProperty presents a form (size, roof type, budget). Upon submission, MyProperty calls the OriginFD API with the landlord’s `tenant_id` and property details. OriginFD creates a new `project` in its schema and returns a `project_id`.

4. **Project execution:** Designers and engineers work in OriginFD. MyProperty continues to handle rent and maintenance, unaware of the engineering details.

5. **Completion:** Once installation is complete, OriginFD sends a webhook or event to MyProperty. MyProperty updates the `property_project_link` record with the capacity, completion date and service provider. It may also adjust the rent or display the asset in tenant portals.

6. **Ongoing operations:** If the installation needs maintenance, the landlord or property manager can open a ticket in MyProperty, which routes to the appropriate service provider. If a new tenant moves in, MyProperty updates the tenancy record; the link to the project remains unchanged.

## **7\. Summary**

By leveraging a shared infrastructure while maintaining strict domain separation, Nexzo MyProperty and OriginFD can offer a seamless experience for landlords and service providers. MyProperty manages the **day‑to‑day operations** of rental properties; OriginFD manages **capital projects and technical tooling**. Shared single sign‑on ensures a unified user experience, while separate schemas and services enforce data isolation. Adoption of OriginFD’s architectural patterns (Cloud Run, PostgreSQL/Redis, RLS, CI/CD and RBAC) reduces operational overhead and provides a solid foundation for future multi‑domain expansion.


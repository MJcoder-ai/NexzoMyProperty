## **Project lifecycle and stage workflows**

| Phase | Purpose & key activities | ODL‑SD v4.1 sections | Entry/Exit Gate & Roles |
| ----- | ----- | ----- | ----- |
| 0\. Lead intake & qualification | Capture intent, tariffs, site basics; build prelim finance & opportunity notes | `meta.intent`, `analysis.opportunity`, `finance.prelim`, `audit` | **G0 Qualified** (Sales, PM) |
| 1\. Project initiation | Create project & seed baseline ODL‑SD doc, compute content hash, call AI orchestrator for baseline risks | `meta.*`, `hierarchy.portfolio/site`, `libraries`, `audit` | **G1 Initiated** (PM, Engineer) |
| 2\. Site data acquisition | Gather GIS/topography/meteo; normalize to site‑pack | `data_management.sources`, `libraries.site`, `analysis.resource` | **G2 Site-Pack Ready** (Surveyor, Engineer) |
| 3\. Concept design | Generate array/topology options; ±30 % BOM & LCOE | `hierarchy.plant/array`, `instances`, `connections`, `analysis.options` | **G3 Concept Approved** (Engineer, PM, Finance) |
| 4\. Detailed engineering | Final single-line, cable sizing, protections, compliance | `instances[*]`, `connections[*]`, `libraries.components.specs`, `analysis.compliance` | **G4 IFC** (Engineer, Compliance) |
| 5\. Permitting & interconnection | Prepare/submit permits & grid studies; track approvals | `governance.permits`, `grid.interconnection`, `analysis.studies` | **G5 Permits Secured** (PM, Legal, Grid Eng) |
| 6\. Procurement & sourcing | RFQs, bid analysis, PO/escrow | `commerce.rfq`, `commerce.orders`, `libraries.components.vendor_bindings` | **G6 Procured** (Sourcing, Finance) |
| 7\. Construction & QC | Build, QC/QA, punch list closure | `operations.qc_events`, `instances.as_built`, `audit` | **G7 Mechanical Complete** (Site Lead, PM, QC) |
| 8\. Commissioning & handover | Tests, intertie, PAC/FAC, O\&M transfer | `operations.commissioning`, `governance.handover`, `contracts.warranty` | **G8 Energized**, **G9 Handover** (Commissioning, Utility, PM) |
| 9\. Operations & maintenance | KPI monitoring, incidents, RMAs | `operations.telemetry_refs`, `analysis.kpi`, `warranty.rma` | SLA gates (Ops, Service) |
| 10\. Expansion/retrofit (loop) | Upgrades/repowering with version branching | New `instances` & `connections`, version approvals | **Change Approved** (PM, Engineer) |
| 11\. Decommissioning & closeout | EOL removal, recycling, escrow release | `governance.decommissioning`, `audit.final` | **G10 Closed** (PM, Legal, Finance) |

## **Current implementation snapshot (Sept 2025)**

### **Backend**

* Projects router: CRUD, stats, lifecycle placeholder; POST submits an orchestrator task but does not create an ODL‑SD document.  
* Standalone ODL‑SD API: Separately creates a project \+ ODL‑SD doc with validation, content hash, and basic export. Runs on its own DB and auth.  
* Component integration router: JSON‑Patch to insert components into a document; hashing is placeholder.  
* Commerce, orchestrator callbacks, RBAC, gate approvals: Mostly unimplemented or mocked.

### **Frontend**

* New Project Modal: Builds full ODL‑SD doc client‑side and calls createDocument (not POST /projects).  
* Project pages: List/detail views exist; no document editor, patching, history, lifecycle, or component picker.  
* RBAC & gate approvals: Not surfaced in UI.

---

## **Implementation plan (hand‑off checklist)**

Each bullet can be a separate PR for another AI.

1. Unify project creation & document seeding  
   * Add documents & document\_versions tables (with primary\_document\_id on projects).  
   * Extend POST /projects to build a minimal ODL‑SD v4.1 document server‑side, validate, hash, create documents row (primary) and initial document\_versions row.  
   * Delete standalone odl\_sd\_api.py; migrate validate/export logic into a new router.  
2. Document API (JSON‑Patch, validate, export)  
   * New router /api/routers/documents.py:  
     * GET /projects/{project\_id}/document  
     * GET /documents/{doc\_id}  
     * POST /documents/{doc\_id}/validate  
     * GET /documents/{doc\_id}/export?format=json|yaml  
     * PATCH /documents/{doc\_id} for RFC‑6902 patches, versioning & hash updates.  
   * Deterministic SHA‑256 hashing of canonical JSON string.  
3. Lifecycle phases & gates with RBAC  
   * Tables: lifecycle\_phases, lifecycle\_gates seeded on project creation.  
   * GET /projects/{id}/lifecycle returns real phase/gate data.  
   * POST /projects/{id}/gates/{gate\_key}/approve updates gate status, writes audit patch, recomputes display\_status & completion\_percentage.  
   * JWT roles (viewer, engineer, project\_manager, admin) enforced on all routes; tenant scoping added.  
4. AI orchestrator integration  
   * Keep task submission on creation.  
   * Implement POST /orchestrator/events webhook to accept orchestrator results (e.g., initialization.completed) and internally apply document patches.  
5. Components library  
   * GET /components (list/search).  
   * POST /projects/{id}/components/add to insert instances via patch (reusing/refactoring current component patch helper).  
6. Commerce hooks (MVP)  
   * Event hooks on project creation, document patch, gate approval to emit billing/metering events.  
   * Skeleton models/endpoints for plans & subscription status.  
7. Frontend upgrades  
   * NewProjectModal calls unified POST /projects; no client-side doc build.  
   * Project detail page tabs:  
     * Document – JSON viewer/editor with patch submission and validation errors.  
     * History – version timeline and diffs.  
     * Lifecycle – phase/gate display & approval button (role-gated).  
     * Components – picker to insert components.  
     * Orchestrator – task status panel.  
   * API client helpers for new endpoints.  
8. Testing & CI  
   * Backend: pytest suites for project creation, document patching, lifecycle approvals, RBAC, components.  
   * Frontend: Vitest/RTL for editor and lifecycle UI.  
   * E2E: Playwright flow to create project → patch doc → approve gate → export.  
   * Seed script & migrations ensure a demo tenant/user/project/doc exist after setup.


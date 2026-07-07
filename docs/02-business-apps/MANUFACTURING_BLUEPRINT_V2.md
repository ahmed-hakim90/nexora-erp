# Manufacturing Blueprint v2

## Status

Architecture foundation only.

This blueprint is the implementation reference for future Manufacturing sprints. It does not approve production code, database migrations, UI, CRUD pages, payroll logic, costing logic, inventory mutation, quality execution, or accounting posting.

## Platform Alignment

Manufacturing runs as a business app on Platform v1.0 and integrates with platform engines by contract:

- Document Engine owns document envelopes, numbering, lifecycle metadata, attachments, and document relationships.
- Workflow Engine owns workflow definition and transition execution.
- Approval Engine owns approval policies, approvers, decisions, delegation, and segregation of duties.
- Event Bus owns event publication, subscription contracts, outbox transport, and integration delivery.
- Inventory Foundation owns inventory documents, quantities, reservations, movements, and warehouse stock state.
- Finance Foundation owns accounting readiness, posting contracts, fiscal controls, and financial documents.
- Party Foundation owns external parties such as suppliers, subcontractors, customers, and service providers.
- HR Assignment Engine owns employees, assignments, reporting lines, shifts, jobs, and worker availability facts.
- Cost Engine owns cost calculation, allocation, variance, WIP valuation, and cost reports.
- Search owns index contracts and result ranking.
- Reporting owns report definitions and execution contracts.
- Dashboard owns dashboard and KPI widget contracts.
- Background Jobs owns asynchronous processing contracts.

Manufacturing must never duplicate a responsibility owned by one of these engines.

## Goal

Design an enterprise Manufacturing architecture that can scale from a single production line to multiple factories, while staying modular, event-driven, auditable, and safe for future operational implementation.

The architecture must support:

- Multi-factory, multi-line, multi-shift production.
- Plan-to-produce execution.
- Operation-level routing control.
- Crew assignment sourced from HR.
- Material movement through Inventory documents only.
- Independent quality inspection.
- Event-driven cost consumption without Manufacturing cost math.
- Production KPIs derived from production facts.

## Bounded Context

### Manufacturing Owns

- Production planning.
- Manufacturing orders.
- Work orders when operation-level execution needs a separate document.
- Operation planning.
- Routing execution state.
- BOM usage references and consumption intent.
- Crew assignment to operations.
- Production reporting.
- Downtime reporting.
- Scrap reporting.
- Rework reporting.
- Machine execution status.
- Production KPI facts.

### Manufacturing Does Not Own

- Inventory quantities.
- Inventory valuation.
- Accounting entries.
- Payroll.
- Employee master data.
- Product master.
- Warehouses.
- Cost calculations.
- Quality release or rejection decisions.
- HR shifts or employee availability.

## Ownership Matrix

| Domain object | Canonical owner | Manufacturing relationship |
| --- | --- | --- |
| Product master | Product/Inventory foundation | References product identity and routability only |
| Warehouse and location | Inventory foundation | Requests material movement documents |
| Stock quantity | Inventory foundation | Reads projected availability, never mutates |
| Employee | HR core and assignment engines | References employee/assignment IDs only |
| Crew membership | Manufacturing | Effective-dated operation crew assignment references HR workers |
| Payroll result | HR/Payroll | Consumes approved production facts later, no payroll math here |
| Accounting entry | Finance foundation | Receives posting-ready facts later |
| Cost result | Cost Engine | Consumes production events later |
| Quality decision | Quality engine | Receives inspection request and returns release/reject outcome |
| Production order | Manufacturing | Owns production execution intent and lifecycle |
| Production report | Manufacturing + Document Engine | Owns production facts inside a business document envelope |

## Factory Structure

Manufacturing execution hierarchy:

```text
Factory
  -> Production Line
    -> Work Center
      -> Workstation
        -> Machine
```

### Production Line

A production line is a logical flow of production capacity inside a factory or branch. It groups work centers and is the primary planning and KPI dimension for line output.

### Work Center

A work center is a capacity and routing node. It may contain one or more workstations and may be used by many routing steps.

### Workstation

A workstation is a physical or logical execution point within a work center. It can be assigned to an operation step.

### Machine

A machine is equipment used by an operation. Machine state, runtime, downtime, and maintenance readiness can be captured as production facts, but maintenance ownership remains outside this blueprint unless a future Maintenance app is approved.

## Execution Flow

Canonical execution flow:

```text
Production Plan
  -> Manufacturing Order
  -> Operation Planning
  -> Crew Assignment
  -> Material Request
  -> Warehouse Approval
  -> Material Issue
  -> Operation Start
  -> Production Reporting
  -> Quality Inspection
  -> Finished Goods Receipt
  -> Production Completion
```

Each step must be auditable, event-capable, and tied to a business document or platform contract.

## Document Catalog

| Document | Owner | Purpose | Lifecycle |
| --- | --- | --- | --- |
| Production Plan | Manufacturing | Planned demand by product, line, shift, date, and quantity | Draft -> Approved -> Released -> Closed -> Cancelled |
| Manufacturing Order | Manufacturing | Authorizes production of a product and quantity against a plan or demand source | Draft -> Released -> In Progress -> Completed -> Closed -> Cancelled |
| Work Order | Manufacturing | Optional operation-level execution document for complex routing | Draft -> Released -> In Progress -> Completed -> Closed -> Cancelled |
| Operation Plan | Manufacturing | Operation sequence, machine/workstation, planned time, and material intent | Draft -> Released -> Locked -> Closed |
| Crew Assignment | Manufacturing | Effective-dated assignment of HR workers to an operation | Draft -> Active -> Replaced -> Closed -> Cancelled |
| Material Request | Inventory Document Engine | Requests raw/packaging material reservation or issue | Draft -> Submitted -> Approved -> Issued -> Closed -> Cancelled |
| Warehouse Approval | Inventory/Approval | Approves warehouse issue based on inventory policy | Pending -> Approved -> Rejected -> Cancelled |
| Material Issue | Inventory Document Engine | Moves materials from warehouse/location to production consumption context | Draft -> Posted -> Reversed -> Closed |
| Production Report | Manufacturing | Captures operation output, scrap, rework, downtime, crew, machine, notes, and attachments | Draft -> Submitted -> Approved -> Posted -> Closed |
| Quality Inspection Request | Quality Engine | Requests quality inspection for WIP, operation output, or finished goods | Draft -> Submitted -> Inspected -> Released/Rejected -> Closed |
| Finished Goods Receipt | Inventory Document Engine | Receives approved finished goods into inventory | Draft -> Posted -> Reversed -> Closed |
| Return to Warehouse | Inventory Document Engine | Returns unused materials or byproducts to warehouse | Draft -> Posted -> Reversed -> Closed |
| Scrap Transfer | Inventory Document Engine | Moves scrap to a scrap location or scrap disposition process | Draft -> Posted -> Reversed -> Closed |

## Core Domain Model

### Production Plan

The Production Plan is the planning container for intended production. It may be generated manually or from future demand planning, but this blueprint does not implement scheduling automation.

Required references:

- Factory/branch.
- Production line.
- Shift.
- Product.
- Planned quantity.
- Planned start/end.
- Planning source.
- Status.

### Manufacturing Order

The Manufacturing Order is the primary execution authorization. It references the product, approved BOM version, routing version, planned quantity, production line, and target dates.

Manufacturing owns the order lifecycle, but it does not post inventory, cost, payroll, or accounting.

### Work Order

Work Orders are optional. They should be used when an order requires operation-level documents, separate crews, separate machines, or separate approval/quality points.

### Operation

An Operation is an executable routing step. It links a manufacturing order or work order to a routing step, work center, workstation, machine, planned quantities, planned labor, and planned machine time.

### BOM Usage

Manufacturing references approved BOMs and BOM lines to express material intent. Actual material movement occurs only through Inventory documents.

### Routing Execution

Routing execution tracks planned and actual operation sequence. It owns operation status and production facts but not machine maintenance, payroll, inventory, or cost.

## Crew Assignment Model

Crew Assignment is a Manufacturing-owned operation assignment record that references HR worker identities and HR assignment facts.

It must never duplicate employee records.

### Crew Assignment Requirements

- Workers come from HR.
- Workers are assigned to Operations.
- Crew assignments are effective-dated.
- Multiple workers are supported.
- Temporary workers are supported through HR worker references or approved external worker references when HR allows them.
- Acting workers are supported with role metadata.
- Replacement workers are supported with supersession links.
- Shift changes are supported through effective date/time intervals.
- Historical tracking is immutable after approval/posting.

### Crew Assignment Fields

Minimum architectural fields:

- Manufacturing order ID.
- Work order ID, when used.
- Operation ID.
- Crew assignment ID.
- Worker reference from HR.
- HR assignment reference.
- Crew role.
- Effective from timestamp.
- Effective to timestamp.
- Assignment reason.
- Replacement/superseded assignment reference.
- Acting worker flag.
- Temporary worker flag.
- Approval status.
- Audit metadata.

### Crew Roles

Recommended role set:

- Operator.
- Lead operator.
- Helper.
- Acting supervisor.
- Quality observer.
- Maintenance support.
- Temporary worker.

### Crew History

Crew history is event-sourced or append-only at the contract level. Changes create new effective-dated rows or supersession records. Approved Production Reports must resolve crew membership from the effective-dated crew assignment valid at the reported operation time.

## Target Model

Manufacturing Blueprint v2 forbids per-worker target storage as a canonical target model.

Targets are defined at operation, routing, work center, line, product, or standard level:

- Standard Crew Size.
- Standard Output.
- Standard Labor Hours.
- Standard Machine Time.

Expected productivity is calculated dynamically from actual crew and actual runtime. Manufacturing stores production facts and standards, not worker payroll incentives.

### Dynamic Productivity Formula

The future productivity engine may calculate:

```text
expected_output = standard_output * (actual_crew_size / standard_crew_size) * runtime_factor
runtime_factor = actual_runtime / standard_runtime
```

The formula is not payroll logic. It is a production KPI formula and must remain separate from HR/Payroll incentive calculation.

### Legacy Compatibility

Any existing worker target artifacts are legacy/foundation compatibility only. Future implementation must migrate toward operation/crew standards and worker achievement facts derived from production reports.

## Production Report Model

Production Report is a business document governed by the Document Engine.

It captures production facts and must support:

- Manufacturing Order.
- Work Order, when used.
- Operation.
- Product.
- Shift.
- Crew.
- Machine.
- Produced Quantity.
- Scrap Quantity.
- Rework Quantity.
- Downtime.
- Notes.
- Attachments.

Lifecycle:

```text
Draft -> Submitted -> Approved -> Posted -> Closed
```

### Production Report Ownership

Manufacturing owns the production facts in the Production Report:

- Produced quantity.
- Scrap quantity.
- Rework quantity.
- Downtime duration.
- Operation status facts.
- Crew participation facts.
- Machine runtime facts.
- KPI source facts.

Document Engine owns:

- Document number.
- Document lifecycle envelope.
- Attachments.
- Cross-document relationships.
- Print/readiness metadata.

Workflow Engine owns workflow transitions when enabled.

Approval Engine owns approval decision logic when enabled.

## Inventory Integration

Manufacturing must never modify inventory directly.

All inventory changes happen through Inventory documents:

- Material Request.
- Material Issue.
- Finished Goods Receipt.
- Return to Warehouse.
- Scrap Transfer.

Manufacturing may request, reference, and listen to inventory documents. Inventory remains owner of stock, reservations, movements, serials, lots, handling units, warehouses, locations, and projected availability.

### Inventory Event Flow

```text
Manufacturing requests material
  -> Inventory validates availability and policy
  -> Inventory approval/workflow runs if required
  -> Inventory posts material issue
  -> Manufacturing receives material-issued event
  -> Manufacturing can start or continue operation
```

Finished goods receipt follows the same rule: Manufacturing reports production, Quality may release the goods, then Inventory posts the receipt.

## Quality Integration

Quality is an independent engine.

Manufacturing requests inspections for:

- Incoming material readiness, when needed.
- In-process operation output.
- Scrap disposition.
- Rework completion.
- Finished goods release.

Quality owns:

- Inspection plans.
- Inspection results.
- Release/reject decisions.
- Quality holds.
- Nonconformance records.

Manufacturing consumes quality outcomes to continue, block, rework, scrap, or complete production. Manufacturing does not decide quality release.

## Cost Integration

Manufacturing never calculates cost.

Manufacturing emits production events and production facts:

- Operation started.
- Operation completed.
- Material requested.
- Material issued reference.
- Quantity produced.
- Scrap reported.
- Rework reported.
- Downtime reported.
- Machine runtime reported.
- Crew assigned.
- Production report posted.
- Finished goods receipt reference.

Cost Engine consumes these facts later to calculate:

- Actual production cost.
- WIP cost.
- Labor absorption.
- Machine absorption.
- Material variance.
- Scrap/rework variance.
- Standard vs actual variance.

Manufacturing must not store calculated cost results.

## HR Integration

Manufacturing references HR for:

- Employee identity.
- Assignment.
- Shift.
- Reporting manager.
- Job/skill readiness.
- Crew availability.

Manufacturing does not own employee master data, payroll, attendance, or HR assignment state.

Crew Assignment references HR worker and assignment records. Production Reports use Crew Assignment snapshots for historical traceability.

## Finance Integration

Manufacturing does not create accounting entries.

Finance consumes approved/posting-ready facts from Inventory, Cost, and Manufacturing as needed. Manufacturing may expose posting readiness metadata but must not create journals, invoices, payroll accruals, or valuation entries.

## Event Model

Manufacturing events are domain events only. They are integration contracts, not background job implementation.

Recommended event catalog:

- ManufacturingProductionPlanReleased.
- ManufacturingOrderReleased.
- ManufacturingOrderStarted.
- ManufacturingOperationPlanned.
- ManufacturingCrewAssigned.
- ManufacturingMaterialRequested.
- ManufacturingMaterialIssueReferenced.
- ManufacturingOperationStarted.
- ManufacturingProductionReportSubmitted.
- ManufacturingProductionReportApproved.
- ManufacturingProductionReportPosted.
- ManufacturingQualityInspectionRequested.
- ManufacturingQualityInspectionResolved.
- ManufacturingFinishedGoodsReceiptRequested.
- ManufacturingOrderCompleted.
- ManufacturingDowntimeReported.
- ManufacturingScrapReported.
- ManufacturingReworkReported.
- ManufacturingMachineRuntimeReported.

Event payloads must include tenant/company/branch scope, correlation ID, document references, operation references, and source engine ownership metadata.

## Workflow And Approval

Manufacturing defines workflow and approval readiness only. Workflow Engine and Approval Engine execute the workflow and approval rules.

Approval candidates:

- Production Plan release.
- Manufacturing Order release.
- Crew Assignment approval.
- Material Request approval.
- Production Report approval.
- Scrap Transfer approval.
- Rework closure approval.
- Production Completion approval.

Segregation of duties should prevent the same actor from reporting, approving, and closing critical production documents where policy requires separation.

## Reporting And Dashboard

Manufacturing owns production KPI facts and report-readiness contracts.

Recommended KPIs:

- Planned vs produced quantity.
- Operation completion rate.
- Line efficiency.
- Crew productivity.
- Machine utilization.
- Downtime minutes.
- Scrap rate.
- Rework rate.
- First-pass yield, sourced from Quality outcomes.
- Schedule adherence.

Reports must read Manufacturing facts and external engine outputs through contracts. They must not recalculate inventory, payroll, cost, or accounting.

## Search

Searchable Manufacturing entities:

- Production Plan.
- Manufacturing Order.
- Work Order.
- Operation.
- Production Report.
- Crew Assignment.
- Machine.
- Work Center.
- Workstation.
- Production Line.

Search result metadata must show business identifiers and labels, not raw UUIDs.

## Background Jobs

Background Jobs may later support:

- Production plan generation.
- Material request generation.
- KPI snapshot generation.
- Production event fan-out.
- Long-running report exports.
- Rebuild of production projections.

No background job runtime is approved by this blueprint sprint.

## Security

Security scopes:

- Tenant.
- Company.
- Branch/factory.
- Production line.
- Work center.
- Operation.
- Manager/crew visibility through HR assignment contracts.

Permission families:

- Manufacturing planning view/manage.
- Manufacturing order view/manage/release/close.
- Operation planning view/manage.
- Crew assignment view/manage/approve.
- Production report view/create/submit/approve/post/close.
- Downtime/scrap/rework report view/manage.
- Machine execution view/manage.
- Manufacturing KPI/report view.

Production data may be operationally sensitive and must remain audit-ready.

## Implementation Guardrails

Future implementation sprints must obey these constraints:

- No direct inventory quantity mutation from Manufacturing.
- No inventory valuation in Manufacturing.
- No accounting entries in Manufacturing.
- No payroll calculation in Manufacturing.
- No employee master duplication in Manufacturing.
- No product master duplication in Manufacturing.
- No warehouse master duplication in Manufacturing.
- No cost calculation in Manufacturing.
- No quality release/rejection ownership in Manufacturing.
- No per-worker target as canonical target storage.
- Production Report remains a business document.
- Crew Assignment remains effective-dated and references HR.
- Material movement happens through Inventory documents only.

## Future Sprint Sequence

Recommended implementation sequence:

1. Manufacturing v2 contracts and permissions.
2. Factory structure and machine model.
3. Production plan and manufacturing order documents.
4. Operation planning and routing execution.
5. Crew assignment foundation.
6. Material request and inventory document integration.
7. Production report document.
8. Quality inspection request integration.
9. Finished goods receipt integration.
10. Production KPI facts and report readiness.
11. Background job readiness for projections and exports.

Each sprint must include boundary tests proving Manufacturing has not taken ownership of inventory, finance, payroll, HR, quality, product master, warehouse master, or cost responsibilities.

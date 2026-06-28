import type { ReactNode } from "react";

import type { ManufacturingResourceDefinition } from "@/features/manufacturing/public-api";
import {
  createManufacturingRecordAction,
  softDeleteManufacturingRecordAction,
  updateManufacturingRecordAction,
} from "@/features/manufacturing/routes/actions/manufacturing.actions";
import {
  archiveBomLineAction,
  archivePlanLineAction,
  archiveRoutingStepAction,
  createBomLineAction,
  createPlanLineAction,
  createRoutingStepAction,
  transitionManufacturingOrderAction,
  transitionWorkOrderAction,
  updateBomLineAction,
  updatePlanLineAction,
  updateRoutingStepAction,
} from "@/features/manufacturing/routes/actions/operational.actions";
import { loadManufacturingFormLookups, type ManufacturingLookupOptions } from "@/features/manufacturing/routes/loaders/manufacturing-lookups.loader";
import {
  loadBomOperationalDetails,
  loadPlanOperationalDetails,
  loadRoutingOperationalDetails,
  type BomLineRecord,
  type ManufacturingOperationalLookups,
  type PlanLineRecord,
  type RoutingStepRecord,
} from "@/features/manufacturing/routes/loaders/operational.loader";
import { getManufacturingRecord } from "@/features/manufacturing/routes/loaders/manufacturing.loader";
import {
  EntityLookup,
  EnterpriseDataTable,
  FieldGroup,
  FormGrid,
  FormSection,
  PageActions,
  PageContainer,
  PageContent,
  PageFilters,
  PageFooter,
  PageForm,
  PageHeader,
} from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";

import { ManufacturingRecordModalLauncher } from "./manufacturing-record-modal";

type ListResult = Readonly<{
  records: readonly Record<string, unknown>[];
  nextCursor: string | null;
  pageSize: number;
}>;

const manufacturingStatusOptions = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"] as const;

function valueToText(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function relationToText(value: unknown, options?: readonly { id: string; label: string; meta?: string }[]): ReactNode {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  const option = options?.find((entry) => entry.id === text);
  if (!option) return valueToText(value);
  return (
    <span className="block min-w-0">
      <span className="block truncate">{option.label}</span>
      {option.meta ? <span className="block truncate text-xs text-muted-foreground">{option.meta}</span> : null}
    </span>
  );
}

function LookupInput({
  defaultValue,
  fieldName,
  isRequired,
  options,
}: Readonly<{
  defaultValue?: unknown;
  fieldName: string;
  isRequired: boolean;
  options: readonly { id: string; label: string; meta?: string }[];
}>) {
  return (
    <EntityLookup
      emptyMessage="No related records found."
      label={options.length > 0 ? "Select related record" : "No records available"}
      name={fieldName}
      options={options.map((option) => ({ ...option, subtitle: option.meta }))}
      placeholder="Search by name or code..."
      required={isRequired}
      value={defaultValue == null ? "" : String(defaultValue)}
    />
  );
}

function relationLookupForField(definition: ManufacturingResourceDefinition, lookups: ManufacturingLookupOptions, fieldName: string) {
  if (lookups[fieldName]) return lookups[fieldName];
  const field = definition.formFields.find((entry) => entry.name === fieldName);
  if (!field) return undefined;
  return lookups[field.name];
}

function renderDetailValue(definition: ManufacturingResourceDefinition, lookups: ManufacturingLookupOptions, key: string, value: unknown) {
  return relationToText(value, relationLookupForField(definition, lookups, key));
}

function OptionalStatusFilter({ defaultValue }: Readonly<{ defaultValue?: string }>) {
  return (
    <select
      className="rounded-md border bg-background px-3 py-2 text-sm"
      defaultValue={defaultValue ?? ""}
      name="isActive"
    >
      <option value="">All statuses</option>
      <option value="true">Active only</option>
      <option value="false">Inactive only</option>
    </select>
  );
}

function buildManufacturingListHref(basePath: string, params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function ManufacturingListPage({
  definition,
  loadRecords,
  searchParams,
}: Readonly<{
  definition: ManufacturingResourceDefinition;
  loadRecords: (query: Record<string, string | undefined>) => Promise<ListResult>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: ListResult = { records: [], nextCursor: null, pageSize: 50 };
  let lookupOptions: ManufacturingLookupOptions = {};
  let errorMessage: string | undefined;

  try {
    [result, lookupOptions] = await Promise.all([
      loadRecords(params),
      loadManufacturingFormLookups(definition),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing records.";
  }

  let selectedRecord = params.edit ? result.records.find((record) => String(record.id) === params.edit) : undefined;
  if (params.edit && !selectedRecord) {
    try {
      selectedRecord = await getManufacturingRecord(definition.key, params.edit);
    } catch {
      errorMessage = errorMessage ?? "Could not load selected manufacturing record.";
    }
  }
  const closeHref = buildManufacturingListHref(definition.basePath, params, { create: null, edit: null });

  return (
    <PageContainer>
      <PageHeader description={definition.description} title={definition.title}>
        <PageActions>
          <ManufacturingRecordModalLauncher
            action={createManufacturingRecordAction.bind(null, definition.key)}
            definition={definition}
            label="Create"
            lookupOptions={lookupOptions}
          />
        </PageActions>
      </PageHeader>
      <PageFilters>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]" action={definition.basePath}>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            defaultValue={params.search ?? ""}
            name="search"
            placeholder={`Search ${definition.title.toLowerCase()}...`}
            type="search"
          />
          <OptionalStatusFilter defaultValue={params.isActive} />
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Search
          </button>
        </form>
      </PageFilters>
      <PageContent>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={definition.columns.map((column) => ({
            key: column.key,
            header: column.header,
            canSort: true,
            canFilter: true,
            render: (record) => relationToText(record[column.field], relationLookupForField(definition, lookupOptions, column.field)),
          }))}
          emptyMessage="No manufacturing foundation records found."
          errorMessage={errorMessage}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
          records={result.records}
          rowActions={(record) => [
            { key: "view", label: "View", href: `${definition.basePath}/${record.id}` },
            { key: "edit", label: "Edit", href: buildManufacturingListHref(definition.basePath, params, { edit: String(record.id) }) },
          ]}
          state={{ globalSearch: params.search }}
        />
      </PageContent>
      {params.create ? (
        <ManufacturingRecordModalLauncher
          action={createManufacturingRecordAction.bind(null, definition.key)}
          autoOpen
          closeHref={closeHref}
          definition={definition}
          lookupOptions={lookupOptions}
        />
      ) : null}
      {selectedRecord ? (
        <ManufacturingRecordModalLauncher
          action={updateManufacturingRecordAction.bind(null, definition.key, String(selectedRecord.id))}
          autoOpen
          closeHref={closeHref}
          definition={definition}
          lookupOptions={lookupOptions}
          record={selectedRecord}
        />
      ) : null}
    </PageContainer>
  );
}

export function ManufacturingFormPage({
  action,
  definition,
  lookupOptions = {},
  record,
  title,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  definition: ManufacturingResourceDefinition;
  lookupOptions?: ManufacturingLookupOptions;
  record?: Record<string, unknown>;
  title: string;
}>) {
  return (
    <PageContainer>
      <PageHeader description={definition.description} title={title} />
      <PageForm action={action} title={title}>
        <FormSection description="Validated manufacturing foundation fields saved to Supabase." title="General">
          <FormGrid>
            {definition.formFields.map((field) => (
              <FieldGroup isRequired={field.isRequired} key={field.name} label={field.label}>
                {field.autoCode ? (
                  <>
                    <input name={field.name} type="hidden" value={record?.[field.name] == null ? "" : String(record[field.name])} />
                    <input
                      className="w-full rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-muted-foreground"
                      readOnly
                      type="text"
                      value={record?.[field.name] == null ? "Auto-generated on save" : displayBusinessCode(record[field.name], field.autoCode)}
                    />
                  </>
                ) : field.name === "status" ? (
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    defaultValue={record?.[field.name] == null ? "active" : String(record[field.name])}
                    name={field.name}
                    required={field.isRequired}
                  >
                    {manufacturingStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : lookupOptions[field.name] ? (
                  <LookupInput
                    defaultValue={record?.[field.name]}
                    fieldName={field.name}
                    isRequired={field.isRequired}
                    options={lookupOptions[field.name]}
                  />
                ) : field.type === "checkbox" ? (
                  <>
                    <input name={field.name} type="hidden" value="false" />
                    <input
                      className="h-4 w-4 rounded border"
                      defaultChecked={record?.[field.name] === true}
                      name={field.name}
                      type="checkbox"
                      value="true"
                    />
                  </>
                ) : (
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    defaultValue={record?.[field.name] == null ? "" : String(record[field.name])}
                    name={field.name}
                    required={field.isRequired}
                    type={field.type}
                  />
                )}
              </FieldGroup>
            ))}
          </FormGrid>
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save
          </button>
          <a className="rounded-md border px-3 py-2 text-sm" href={definition.basePath}>
            Cancel
          </a>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

function labelFor(options: readonly { id: string; label: string }[], value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  return options.find((option) => option.id === text)?.label ?? text;
}

function NumberField({ defaultValue, label, name, required = false }: Readonly<{ defaultValue?: number; label: string; name: string; required?: boolean }>) {
  return (
    <FieldGroup isRequired={required} label={label}>
      <input className="w-full rounded-md border px-3 py-2" defaultValue={defaultValue ?? 0} min="0" name={name} required={required} step="0.000001" type="number" />
    </FieldGroup>
  );
}

function TextField({ defaultValue, label, name, required = false, type = "text" }: Readonly<{ defaultValue?: string | null; label: string; name: string; required?: boolean; type?: string }>) {
  return (
    <FieldGroup isRequired={required} label={label}>
      <input className="w-full rounded-md border px-3 py-2" defaultValue={defaultValue ?? ""} name={name} required={required} type={type} />
    </FieldGroup>
  );
}

function StatusSelect({ defaultValue, name = "status", options }: Readonly<{ defaultValue?: string; name?: string; options: readonly string[] }>) {
  return (
    <FieldGroup isRequired label="Status">
      <select className="w-full rounded-md border px-3 py-2" defaultValue={defaultValue ?? options[0]} name={name} required>
        {options.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    </FieldGroup>
  );
}

function BomLineForm({ bomId, line, lookups }: Readonly<{ bomId: string; line?: BomLineRecord; lookups: ManufacturingOperationalLookups }>) {
  const action = line ? updateBomLineAction.bind(null, bomId, line.id) : createBomLineAction.bind(null, bomId);
  return (
    <form action={action} className="space-y-3 rounded-md border p-3">
      <FormGrid>
        <NumberField defaultValue={line?.lineNumber} label="Line" name="lineNumber" required />
        <FieldGroup isRequired label="Component Product">
          <EntityLookup label="Select component" name="componentProductId" options={lookups.products} required value={line?.componentProductId ?? ""} />
        </FieldGroup>
        <NumberField defaultValue={line?.quantity} label="Quantity" name="quantity" required />
        <FieldGroup isRequired label="UOM">
          <EntityLookup label="Select UOM" name="uomId" options={lookups.uoms} required value={line?.uomId ?? ""} />
        </FieldGroup>
        <NumberField defaultValue={line?.scrapPercent} label="Scrap %" name="scrapPercent" />
        <FieldGroup label="Operation">
          <EntityLookup label="Optional operation" name="operationId" options={lookups.operations} value={line?.operationId ?? ""} />
        </FieldGroup>
        <StatusSelect defaultValue={line?.status} options={["draft", "active", "inactive", "archived"]} />
        <TextField defaultValue={line?.notes} label="Notes" name="notes" />
      </FormGrid>
      <PageActions>
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">{line ? "Update Line" : "Add Line"}</button>
        {line ? <button className="rounded-md border px-3 py-2 text-sm" formAction={archiveBomLineAction.bind(null, bomId, line.id)} type="submit">Archive</button> : null}
      </PageActions>
    </form>
  );
}

async function BomOperationalSection({ bomId }: Readonly<{ bomId: string }>) {
  const data = await loadBomOperationalDetails(bomId);
  return (
    <section className="space-y-4 rounded-md border bg-[hsl(var(--surface))] p-4">
      <div>
        <h2 className="font-medium">BOM Lines</h2>
        <p className="mt-1 text-sm text-muted-foreground">Component lines only. No costing, reservations, or material consumption is posted.</p>
      </div>
      <EnterpriseDataTable<BomLineRecord>
        columns={[
          { key: "line", header: "Line", render: (row) => row.lineNumber },
          { key: "component", header: "Component", render: (row) => labelFor(data.lookups.products, row.componentProductId) },
          { key: "qty", header: "Quantity", render: (row) => row.quantity },
          { key: "uom", header: "UOM", render: (row) => labelFor(data.lookups.uoms, row.uomId) },
          { key: "scrap", header: "Scrap %", render: (row) => row.scrapPercent },
          { key: "operation", header: "Operation", render: (row) => labelFor(data.lookups.operations, row.operationId) },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
        emptyMessage="No BOM lines yet."
        getRowId={(row) => row.id}
        pagination={{ mode: "cursor", pageSize: data.lines.length || 1, nextCursor: null }}
        records={data.lines}
      />
      {data.lines.map((line) => <BomLineForm bomId={bomId} key={line.id} line={line} lookups={data.lookups} />)}
      <BomLineForm bomId={bomId} lookups={data.lookups} />
    </section>
  );
}

function RoutingStepForm({ lookups, routingId, step }: Readonly<{ lookups: ManufacturingOperationalLookups; routingId: string; step?: RoutingStepRecord }>) {
  const action = step ? updateRoutingStepAction.bind(null, routingId, step.id) : createRoutingStepAction.bind(null, routingId);
  return (
    <form action={action} className="space-y-3 rounded-md border p-3">
      <FormGrid>
        <NumberField defaultValue={step?.stepSequence} label="Sequence" name="stepSequence" required />
        <FieldGroup isRequired label="Operation">
          <EntityLookup label="Select operation" name="operationId" options={lookups.operations} required value={step?.operationId ?? ""} />
        </FieldGroup>
        <FieldGroup isRequired label="Work Center">
          <EntityLookup label="Select work center" name="workCenterId" options={lookups.workCenters} required value={step?.workCenterId ?? ""} />
        </FieldGroup>
        <FieldGroup label="Workstation">
          <EntityLookup label="Optional workstation" name="workstationId" options={lookups.workstations} value={step?.workstationId ?? ""} />
        </FieldGroup>
        <NumberField defaultValue={step?.estimatedTimeMinutes} label="Estimated Minutes" name="estimatedTimeMinutes" />
        <NumberField defaultValue={step?.setupTimeMinutes} label="Setup Minutes" name="setupTimeMinutes" />
        <NumberField defaultValue={step?.runTimeMinutes} label="Run Minutes" name="runTimeMinutes" />
        <StatusSelect defaultValue={step?.status} options={["draft", "active", "inactive", "archived"]} />
        <TextField defaultValue={step?.notes} label="Notes" name="notes" />
      </FormGrid>
      <PageActions>
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">{step ? "Update Step" : "Add Step"}</button>
        {step ? <button className="rounded-md border px-3 py-2 text-sm" formAction={archiveRoutingStepAction.bind(null, routingId, step.id)} type="submit">Archive</button> : null}
      </PageActions>
    </form>
  );
}

async function RoutingOperationalSection({ routingId }: Readonly<{ routingId: string }>) {
  const data = await loadRoutingOperationalDetails(routingId);
  return (
    <section className="space-y-4 rounded-md border bg-[hsl(var(--surface))] p-4">
      <div>
        <h2 className="font-medium">Routing Steps</h2>
        <p className="mt-1 text-sm text-muted-foreground">Operational routing steps only. No scheduling engine is implemented.</p>
      </div>
      <EnterpriseDataTable<RoutingStepRecord>
        columns={[
          { key: "sequence", header: "Sequence", render: (row) => row.stepSequence },
          { key: "operation", header: "Operation", render: (row) => labelFor(data.lookups.operations, row.operationId) },
          { key: "workCenter", header: "Work Center", render: (row) => labelFor(data.lookups.workCenters, row.workCenterId) },
          { key: "workstation", header: "Workstation", render: (row) => labelFor(data.lookups.workstations, row.workstationId) },
          { key: "estimated", header: "Estimated", render: (row) => row.estimatedTimeMinutes },
          { key: "setup", header: "Setup", render: (row) => row.setupTimeMinutes },
          { key: "run", header: "Run", render: (row) => row.runTimeMinutes },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
        emptyMessage="No routing steps yet."
        getRowId={(row) => row.id}
        pagination={{ mode: "cursor", pageSize: data.steps.length || 1, nextCursor: null }}
        records={data.steps}
      />
      {data.steps.map((step) => <RoutingStepForm key={step.id} lookups={data.lookups} routingId={routingId} step={step} />)}
      <RoutingStepForm lookups={data.lookups} routingId={routingId} />
    </section>
  );
}

function PlanLineForm({ line, lookups, planId }: Readonly<{ line?: PlanLineRecord; lookups: ManufacturingOperationalLookups; planId: string }>) {
  const action = line ? updatePlanLineAction.bind(null, planId, line.id) : createPlanLineAction.bind(null, planId);
  return (
    <form action={action} className="space-y-3 rounded-md border p-3">
      <FormGrid>
        <NumberField defaultValue={line?.lineNumber} label="Line" name="lineNumber" required />
        <FieldGroup isRequired label="Product">
          <EntityLookup label="Select product" name="manufacturingProductId" options={lookups.products} required value={line?.manufacturingProductId ?? ""} />
        </FieldGroup>
        <NumberField defaultValue={line?.plannedQuantity} label="Planned Quantity" name="plannedQuantity" required />
        <FieldGroup isRequired label="Production Line">
          <EntityLookup label="Select production line" name="plannedLineId" options={lookups.lines} required value={line?.plannedLineId ?? ""} />
        </FieldGroup>
        <TextField defaultValue={line?.plannedShiftKey} label="Shift" name="plannedShiftKey" required />
        <TextField defaultValue={line?.plannedStart} label="Planned Start" name="plannedStart" type="datetime-local" />
        <TextField defaultValue={line?.plannedEnd} label="Planned End" name="plannedEnd" type="datetime-local" />
        <StatusSelect defaultValue={line?.priority} name="priority" options={["low", "normal", "high", "urgent"]} />
        <StatusSelect defaultValue={line?.status} options={["draft", "ready", "released", "completed", "cancelled"]} />
      </FormGrid>
      <PageActions>
        <button className="rounded-md border px-3 py-2 text-sm" type="submit">{line ? "Update Plan Line" : "Add Plan Line"}</button>
        {line ? <button className="rounded-md border px-3 py-2 text-sm" formAction={archivePlanLineAction.bind(null, planId, line.id)} type="submit">Archive</button> : null}
      </PageActions>
    </form>
  );
}

async function PlanOperationalSection({ planId }: Readonly<{ planId: string }>) {
  const data = await loadPlanOperationalDetails(planId);
  return (
    <section className="space-y-4 rounded-md border bg-[hsl(var(--surface))] p-4">
      <div>
        <h2 className="font-medium">Production Plan Lines</h2>
        <p className="mt-1 text-sm text-muted-foreground">Plan lines show DPR actuals when matching product and production line facts exist.</p>
      </div>
      <EnterpriseDataTable<PlanLineRecord>
        columns={[
          { key: "line", header: "Line", render: (row) => row.lineNumber },
          { key: "product", header: "Product", render: (row) => labelFor(data.lookups.products, row.manufacturingProductId) },
          { key: "planned", header: "Planned", render: (row) => row.plannedQuantity },
          { key: "actual", header: "Actual", render: (row) => row.actualQuantity },
          { key: "achievement", header: "Achievement", render: (row) => `${row.achievementPercent}%` },
          { key: "remaining", header: "Remaining", render: (row) => row.remainingQuantity },
          { key: "productionLine", header: "Production Line", render: (row) => labelFor(data.lookups.lines, row.plannedLineId) },
          { key: "priority", header: "Priority", render: (row) => row.priority },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
        emptyMessage="No production plan lines yet."
        getRowId={(row) => row.id}
        pagination={{ mode: "cursor", pageSize: data.lines.length || 1, nextCursor: null }}
        records={data.lines}
      />
      {data.lines.map((line) => <PlanLineForm key={line.id} line={line} lookups={data.lookups} planId={planId} />)}
      <PlanLineForm lookups={data.lookups} planId={planId} />
    </section>
  );
}

const orderLifecycle = [
  { from: "draft", label: "Release", to: "released" },
  { from: "released", label: "Start", to: "active" },
  { from: "active", label: "Complete", to: "completed" },
  { from: "draft", label: "Cancel", to: "cancelled" },
  { from: "released", label: "Cancel", to: "cancelled" },
  { from: "active", label: "Cancel", to: "cancelled" },
] as const;

const workOrderLifecycle = [
  { from: "draft", label: "Ready", to: "ready" },
  { from: "ready", label: "Start", to: "active" },
  { from: "active", label: "Pause", to: "paused" },
  { from: "paused", label: "Resume", to: "active" },
  { from: "active", label: "Complete", to: "completed" },
  { from: "paused", label: "Complete", to: "completed" },
  { from: "draft", label: "Cancel", to: "cancelled" },
  { from: "ready", label: "Cancel", to: "cancelled" },
  { from: "active", label: "Cancel", to: "cancelled" },
  { from: "paused", label: "Cancel", to: "cancelled" },
] as const;

function LifecycleSection({ id, kind, status }: Readonly<{ id: string; kind: "manufacturing-order" | "work-order"; status: string }>) {
  const actions = kind === "manufacturing-order" ? orderLifecycle : workOrderLifecycle;
  const action = kind === "manufacturing-order" ? transitionManufacturingOrderAction : transitionWorkOrderAction;
  const steps = kind === "manufacturing-order" ? ["draft", "released", "active", "completed", "cancelled"] : ["draft", "ready", "active", "paused", "completed", "cancelled"];
  return (
    <section className="space-y-4 rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="font-medium">Lifecycle</h2>
      <div className="flex flex-wrap gap-2 text-xs">
        {steps.map((step) => (
          <span className={`rounded-full border px-3 py-1 ${step === status ? "bg-[hsl(var(--muted))] font-medium" : ""}`} key={step}>{step}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.filter((item) => item.from === status).map((item) => (
          <form action={action.bind(null, id)} key={`${item.from}-${item.to}`}>
            <input name="nextStatus" type="hidden" value={item.to} />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">{item.label}</button>
          </form>
        ))}
      </div>
      {actions.some((item) => item.from === status) ? null : <p className="text-sm text-muted-foreground">No valid actions are available for the current status.</p>}
    </section>
  );
}

async function OperationalSection({ definition, record }: Readonly<{ definition: ManufacturingResourceDefinition; record: Record<string, unknown> }>) {
  const id = String(record.id);
  if (definition.key === "boms") return <><ManufacturingReconciliationNotice kind="bom" /><BomOperationalSection bomId={id} /></>;
  if (definition.key === "routing-plans") return <><ManufacturingReconciliationNotice kind="routing" /><RoutingOperationalSection routingId={id} /></>;
  if (definition.key === "production-plans") return <PlanOperationalSection planId={id} />;
  if (definition.key === "manufacturing-orders") return <LifecycleSection id={id} kind="manufacturing-order" status={String(record.status ?? "draft")} />;
  if (definition.key === "work-orders") return <LifecycleSection id={id} kind="work-order" status={String(record.status ?? "draft")} />;
  return null;
}

function ManufacturingReconciliationNotice({ kind }: Readonly<{ kind: "bom" | "routing" }>) {
  const legacyField = kind === "bom" ? "manufacturing_boms.components" : "manufacturing_routings.operations";
  const canonicalTable = kind === "bom" ? "manufacturing_bom_lines" : "manufacturing_routing_steps";
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4 text-sm">
      <p className="font-medium">Canonical operational model</p>
      <p className="mt-1 text-muted-foreground">
        This page uses <code>{canonicalTable}</code>. Legacy <code>{legacyField}</code> JSON remains for tenant
        reconciliation only and is not edited as the operational source.
      </p>
    </section>
  );
}

export async function ManufacturingDetailPage({
  definition,
  loadRecord,
}: Readonly<{
  definition: ManufacturingResourceDefinition;
  loadRecord: () => Promise<Record<string, unknown>>;
}>) {
  let record: Record<string, unknown> | null = null;
  let lookupOptions: ManufacturingLookupOptions = {};
  let errorMessage: string | undefined;

  try {
    [record, lookupOptions] = await Promise.all([
      loadRecord(),
      loadManufacturingFormLookups(definition),
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing record.";
  }

  return (
    <PageContainer>
      <PageHeader description={definition.description} title={`${definition.singularTitle} Detail`}>
        <PageActions>
          {record ? (
            <>
              <a className="rounded-md border px-3 py-2 text-sm" href={`${definition.basePath}/${record.id}/edit`}>
                Edit
              </a>
              <form action={softDeleteManufacturingRecordAction.bind(null, definition.key, String(record.id))}>
                <button className="rounded-md border px-3 py-2 text-sm" type="submit">
                  Archive
                </button>
              </form>
            </>
          ) : null}
        </PageActions>
      </PageHeader>
      <PageContent>
        <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
          {errorMessage ? <p className="text-sm text-[hsl(var(--danger))]">{errorMessage}</p> : null}
          {record ? (
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              {Object.entries(record).map(([key, value]) => (
                <div className="rounded-md border p-3" key={key}>
                  <dt className="font-medium">{key}</dt>
                  <dd className="mt-1 text-muted-foreground">{renderDetailValue(definition, lookupOptions, key, value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
        {record ? <OperationalSection definition={definition} record={record} /> : null}
      </PageContent>
      <PageFooter>Foundation Ready manufacturing record. Out-of-scope payroll, incentives, costing, and inventory posting are not exposed here.</PageFooter>
    </PageContainer>
  );
}

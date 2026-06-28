import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "@/features/inventory/public-api";
import {
  archiveInventoryFoundationRecordAction,
  createInventoryFoundationRecordAction,
  updateInventoryFoundationRecordAction,
} from "@/features/inventory/routes/actions/inventory-foundation.actions";
import type { InventoryFoundationWorkspaceData } from "@/features/inventory/routes/loaders/inventory-foundation.loader";
import { displayBusinessCode } from "@/shared/business-codes";
import { EntityLookup, EnterpriseDataTable, FieldGroup, FormGrid, FormSection, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader } from "@/shared/ui";

import { InventoryFoundationRecordModalLauncher } from "./inventory-foundation-modal";

type FoundationRow = Record<string, unknown>;
type InventoryFoundationQueryState = Record<string, string | undefined>;

function buildFoundationHref(
  basePath: string,
  params: InventoryFoundationQueryState,
  overrides: Record<string, string | null | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function valueToText(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldValue(record: FoundationRow | undefined, field: InventoryFoundationField) {
  const value = record?.[field.column];
  if (field.type === "json") return value && typeof value === "object" ? JSON.stringify(value, null, 2) : "{}";
  if (field.type === "checkbox") return value === true;
  return value === null || value === undefined ? "" : String(value);
}

function lookupLabel(workspace: Pick<InventoryFoundationWorkspaceData, "lookups">, field: InventoryFoundationField, value: unknown) {
  if (field.autoCode) return displayBusinessCode(value, field.autoCode) || "-";
  if (!field.lookup || value === null || value === undefined || value === "") return valueToText(value);
  const option = workspace.lookups[field.lookup]?.find((candidate) => candidate.id === String(value));
  return option?.label ?? String(value);
}

function renderInput(
  field: InventoryFoundationField,
  workspace: Pick<InventoryFoundationWorkspaceData, "lookups">,
  record?: FoundationRow,
) {
  const value = fieldValue(record, field);

  if (field.autoCode) {
    return (
      <>
        <input name={field.name} type="hidden" value={record ? String(value) : ""} />
        <input
          className="w-full rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-muted-foreground"
          readOnly
          type="text"
          value={record ? displayBusinessCode(value, field.autoCode) : "Auto-generated on save"}
        />
      </>
    );
  }

  if (field.type === "lookup" && field.lookup) {
    const options = workspace.lookups[field.lookup] ?? [];
    return (
      <EntityLookup
        disabled={field.required && options.length === 0}
        emptyMessage="Create related records first."
        label={`Select ${field.label}`}
        name={field.name}
        options={options}
        required={field.required}
        value={String(value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select className="w-full rounded-md border px-3 py-2" defaultValue={String(value)} name={field.name} required={field.required}>
        <option value="">{field.required ? "Select..." : "-"}</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <input defaultChecked={Boolean(value)} name={field.name} type="checkbox" />
        Enabled
      </label>
    );
  }

  if (field.type === "json") {
    return <textarea className="min-h-28 w-full rounded-md border px-3 py-2 font-mono text-sm" defaultValue={String(value)} name={field.name} />;
  }

  return (
    <input
      className="w-full rounded-md border px-3 py-2"
      defaultValue={String(value)}
      min={field.min}
      name={field.name}
      required={field.required}
      step={field.step}
      type={field.type === "number" ? "number" : field.type}
    />
  );
}

function foundationRouteTitle(descriptor: InventoryFoundationDescriptor, mode: "create" | "edit") {
  return `${mode === "create" ? "Create" : "Edit"} ${descriptor.singular}`;
}

export function InventoryFoundationListPage({
  closeHref,
  query,
  selectedRecord,
  workspace,
}: Readonly<{
  closeHref: string;
  query: InventoryFoundationQueryState;
  selectedRecord?: FoundationRow;
  workspace: InventoryFoundationWorkspaceData;
}>) {
  const { descriptor, records } = workspace;
  const listFields = descriptor.fields.filter((field) => field.showInList);

  return (
    <PageContainer>
      <PageHeader
        description={descriptor.description}
        title={descriptor.title}
      >
        <PageActions>
          <Link className="rounded-md border px-3 py-2 text-sm" href={buildFoundationHref(descriptor.basePath, query, { create: "1", edit: null })}>
            Create {descriptor.singular}
          </Link>
        </PageActions>
      </PageHeader>
      <PageContent>
        <EnterpriseDataTable<FoundationRow>
          columns={[
            ...listFields.map((field) => ({
              canFilter: true,
              canSort: true,
              header: field.label,
              key: field.name,
              render: (record: FoundationRow) => lookupLabel(workspace, field, record[field.column]),
            })),
            {
              header: "Actions",
              key: "actions",
              render: (record: FoundationRow) => (
                <div className="flex gap-2">
                  <Link className="text-sm underline" href={`${descriptor.basePath}/${String(record.id)}`}>
                    View
                  </Link>
                  <Link className="text-sm underline" href={buildFoundationHref(descriptor.basePath, query, { edit: String(record.id), create: null })}>
                    Edit
                  </Link>
                </div>
              ),
            },
          ]}
          emptyMessage={`No ${descriptor.title.toLowerCase()} found.`}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", nextCursor: workspace.nextCursor, pageSize: workspace.pageSize }}
          records={records}
        />
      </PageContent>
      {query.create ? (
        <InventoryFoundationRecordModalLauncher autoOpen closeHref={closeHref} descriptor={descriptor} lookups={workspace.lookups} />
      ) : null}
      {selectedRecord ? (
        <InventoryFoundationRecordModalLauncher autoOpen closeHref={closeHref} descriptor={descriptor} lookups={workspace.lookups} record={selectedRecord} />
      ) : null}
      <PageFooter>Foundation Ready Inventory master data only. Lifecycle posting and procurement automation stay outside this surface.</PageFooter>
    </PageContainer>
  );
}

export function InventoryFoundationFormPage({
  descriptor,
  lookups,
  mode,
  record,
}: Readonly<{
  descriptor: InventoryFoundationDescriptor;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  mode: "create" | "edit";
  record?: FoundationRow;
}>) {
  async function save(formData: FormData) {
    "use server";

    if (mode === "create") {
      const result = await createInventoryFoundationRecordAction(descriptor.key, formData);
      redirect(`${descriptor.basePath}/${result.id}`);
    }

    await updateInventoryFoundationRecordAction(descriptor.key, String(record?.id), formData);
    redirect(`${descriptor.basePath}/${String(record?.id)}`);
  }

  const workspace = { lookups };

  return (
    <PageContainer>
      <PageHeader description={descriptor.description} title={foundationRouteTitle(descriptor, mode)} />
      <PageForm action={save} title={descriptor.singular}>
        <FormSection description="Field-level validation and canonical Inventory relations are enforced by server actions and Supabase constraints." title="Details">
          <FormGrid>
            {descriptor.fields.map((field) => (
              <FieldGroup isRequired={field.required} key={field.name} label={field.label}>
                {renderInput(field, workspace, record)}
              </FieldGroup>
            ))}
          </FormGrid>
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save
          </button>
          <Link className="rounded-md border px-3 py-2 text-sm" href={descriptor.basePath}>
            Cancel
          </Link>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export function InventoryFoundationDetailPage({
  descriptor,
  lookups,
  record,
}: Readonly<{
  descriptor: InventoryFoundationDescriptor;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  record: FoundationRow;
}>) {
  async function archive() {
    "use server";

    await archiveInventoryFoundationRecordAction(descriptor.key, String(record.id));
    redirect(descriptor.basePath);
  }

  const workspace = { lookups };

  return (
    <PageContainer>
      <PageHeader
        description={descriptor.description}
        title={descriptor.singular}
      >
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={`${descriptor.basePath}/${String(record.id)}/edit`}>
              Edit
            </Link>
            <form action={archive}>
              <button className="rounded-md border px-3 py-2 text-sm" type="submit">
                Archive
              </button>
            </form>
          </PageActions>
      </PageHeader>
      <PageContent>
        <section className="rounded-lg border bg-card p-4">
          <dl className="grid gap-4 md:grid-cols-2">
            {descriptor.fields.map((field) => (
              <div key={field.name}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 text-sm">{lookupLabel(workspace, field, record[field.column])}</dd>
              </div>
            ))}
            {["created_at", "created_by", "updated_at", "updated_by", "version"].map((column) => (
              <div key={column}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{column.replaceAll("_", " ")}</dt>
                <dd className="mt-1 text-sm">{valueToText(record[column])}</dd>
              </div>
            ))}
          </dl>
        </section>
      </PageContent>
      <PageFooter>Audit metadata is displayed when available from the canonical table.</PageFooter>
    </PageContainer>
  );
}

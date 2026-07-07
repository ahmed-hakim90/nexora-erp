import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "@/features/inventory/public-api";
import { formatHandlingUnitLabel } from "@/features/inventory/public-api";
import {
  archiveInventoryFoundationRecordAction,
  createInventoryFoundationRecordAction,
  updateInventoryFoundationRecordAction,
} from "@/features/inventory/routes/actions/inventory-foundation.actions";
import type { InventoryFoundationWorkspaceData } from "@/features/inventory/routes/loaders/inventory-foundation.loader";
import { resolveFoundationLookupProviderKey } from "@/platform/operator-experience/lookup-registry";
import { displayBusinessCode } from "@/shared/business-codes";
import { buildListQueryHref, EntityLookup, EnterpriseDataTable, FieldGroup, FormGrid, FormSection, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader, type ListQueryState } from "@/shared/ui";

import { InventoryFoundationRecordModalLauncher } from "./inventory-foundation-modal";
import { InventoryFoundationDetailWorkspace } from "./inventory-foundation-detail-workspace";

type FoundationRow = Record<string, unknown>;
type InventoryFoundationQueryState = ListQueryState;

function objectToAttributeLines(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value)
    .map(([key, attributeValue]) => `${key}: ${String(attributeValue ?? "")}`)
    .join("\n");
}

function valueToText(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
  if (typeof value === "object") return objectToAttributeLines(value) || "-";
  return String(value);
}

function fieldValue(record: FoundationRow | undefined, field: InventoryFoundationField) {
  const value = record?.[field.column];
  if (field.type === "json") return objectToAttributeLines(value);
  if (field.type === "tags") return Array.isArray(value) ? value.join("\n") : "";
  if (field.type === "checkbox") return value === true;
  return value === null || value === undefined ? "" : String(value);
}

function lookupLabel(workspace: Pick<InventoryFoundationWorkspaceData, "lookups">, field: InventoryFoundationField, value: unknown) {
  if (field.autoCode) return displayBusinessCode(value, field.autoCode) || "-";
  if (!field.lookup || value === null || value === undefined || value === "") return valueToText(value);
  const option = workspace.lookups[field.lookup]?.find((candidate) => candidate.id === String(value));
  return option?.label ?? "Selected record";
}

function formatFoundationListValue(
  descriptor: InventoryFoundationDescriptor,
  workspace: InventoryFoundationWorkspaceData,
  field: InventoryFoundationField,
  record: FoundationRow,
) {
  if (descriptor.key === "handling-units" && field.name === "huNumber") {
    const typeLabel = lookupLabel(workspace, { ...field, lookup: "handlingUnitTypes", name: "huTypeId", column: "hu_type_id", label: "Type", type: "lookup" }, record.hu_type_id);
    const locationLabel = lookupLabel(workspace, { ...field, lookup: "locations", name: "locationId", column: "location_id", label: "Location", type: "lookup" }, record.location_id);
    const huStatus = typeof record.hu_status === "string" ? record.hu_status : "empty";
    return formatHandlingUnitLabel({
      huNumber: displayBusinessCode(record.hu_number, field.autoCode ?? { prefix: "HU", scope: "company" }) || String(record.hu_number ?? "-"),
      huStatus: huStatus as "empty",
      locationLabel: locationLabel === "-" ? null : String(locationLabel),
      typeName: typeLabel === "-" ? "Container" : String(typeLabel).split(" — ").slice(1).join(" — ") || String(typeLabel),
    });
  }

  return lookupLabel(workspace, field, record[field.column]);
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
    const providerKey = resolveFoundationLookupProviderKey(field.lookup);
    const currentValue = typeof value === "string" ? value : "";
    if (providerKey) {
      return (
        <EntityLookup
          label={`Select ${field.label}`}
          name={field.name}
          providerKey={providerKey}
          required={field.required}
          value={currentValue}
        />
      );
    }
    const options = workspace.lookups[field.lookup] ?? [];
    const lookupValue = currentValue || (field.required && options.length === 1 ? options[0]?.id ?? "" : "");
    return (
      <EntityLookup
        disabled={field.required && options.length === 0}
        emptyMessage="Create related records first."
        label={`Select ${field.label}`}
        name={field.name}
        options={options}
        required={field.required}
        value={lookupValue}
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
        <input name={field.name} type="hidden" value="false" />
        <input defaultChecked={Boolean(value)} name={field.name} type="checkbox" />
        Enabled
      </label>
    );
  }

  if (field.type === "json") {
    return (
      <div className="space-y-1.5">
        <textarea
          className="min-h-28 w-full rounded-md border px-3 py-2 text-sm"
          defaultValue={String(value)}
          name={field.name}
          placeholder={"Color: Red\nSize: Large\nMaterial: Steel"}
        />
        <p className="text-xs text-muted-foreground">Enter one attribute per line using name: value.</p>
      </div>
    );
  }

  if (field.type === "tags") {
    return (
      <div className="space-y-1.5">
        <textarea
          className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
          defaultValue={String(value)}
          name={field.name}
          placeholder="One value per line"
        />
        <p className="text-xs text-muted-foreground">Use business codes or statuses, one per line. UUIDs are not required.</p>
      </div>
    );
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
          <Link className="rounded-md border px-3 py-2 text-sm" href={buildListQueryHref(descriptor.basePath, query, { create: "1", edit: null })}>
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
              render: (record: FoundationRow) => formatFoundationListValue(descriptor, workspace, field, record),
            })),
            {
              header: "Actions",
              key: "actions",
              render: (record: FoundationRow) => (
                <div className="flex gap-2">
                  <Link className="text-sm underline" href={`${descriptor.basePath}/${String(record.id)}`}>
                    View
                  </Link>
                  <Link className="text-sm underline" href={buildListQueryHref(descriptor.basePath, query, { edit: String(record.id), create: null })}>
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
  canManage = true,
}: Readonly<{
  descriptor: InventoryFoundationDescriptor;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  record: FoundationRow;
  canManage?: boolean;
}>) {
  async function archive() {
    "use server";

    await archiveInventoryFoundationRecordAction(descriptor.key, String(record.id));
    redirect(descriptor.basePath);
  }

  return (
    <PageContainer>
      <PageHeader
        description={descriptor.description}
        title={descriptor.singular}
      >
          <PageActions>
            <form action={archive}>
              <button className="rounded-md border px-3 py-2 text-sm" type="submit">
                Archive
              </button>
            </form>
          </PageActions>
      </PageHeader>
      <PageContent>
        <InventoryFoundationDetailWorkspace
          canManage={canManage}
          descriptor={descriptor}
          lookups={lookups}
          record={record}
        />
      </PageContent>
      <PageFooter>Audit metadata is displayed when available from the canonical table.</PageFooter>
    </PageContainer>
  );
}

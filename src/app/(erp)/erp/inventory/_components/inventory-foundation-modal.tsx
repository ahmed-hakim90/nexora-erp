"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "@/features/inventory/public-api";
import {
  archiveInventoryFoundationRecordAction,
  createInventoryFoundationRecordAction,
  updateInventoryFoundationRecordAction,
} from "@/features/inventory/routes/actions/inventory-foundation.actions";
import type { InventoryFoundationWorkspaceData } from "@/features/inventory/routes/loaders/inventory-foundation.loader";
import { displayBusinessCode } from "@/shared/business-codes";
import { EntityLookup, FieldGroup, FormGrid, RecordFormDialog, RecordFormSection } from "@/shared/ui";

type FoundationRow = Record<string, unknown>;

function fieldValue(record: FoundationRow | undefined, field: InventoryFoundationField) {
  const value = record?.[field.column];
  if (field.type === "json") return value && typeof value === "object" ? JSON.stringify(value, null, 2) : "{}";
  if (field.type === "checkbox") return value === true;
  return value === null || value === undefined ? "" : String(value);
}

function FieldControl({
  field,
  lookups,
  record,
}: Readonly<{
  field: InventoryFoundationField;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  record?: FoundationRow;
}>) {
  const value = fieldValue(record, field);
  const controlClassName = "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

  if (field.autoCode) {
    return (
      <>
        <input name={field.name} type="hidden" value={record ? String(value) : ""} />
        <input
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-muted-foreground shadow-sm"
          readOnly
          type="text"
          value={record ? displayBusinessCode(value, field.autoCode) : "Auto-generated on save"}
        />
      </>
    );
  }

  if (field.type === "lookup" && field.lookup) {
    const options = lookups[field.lookup] ?? [];
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
      <select className={controlClassName} defaultValue={String(value)} name={field.name} required={field.required}>
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
      <div className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <input name={field.name} type="hidden" value="false" />
        <input className="size-4 rounded border border-border bg-background accent-primary" defaultChecked={Boolean(value)} name={field.name} type="checkbox" value="true" />
        <span className="text-sm text-muted-foreground">Enabled</span>
      </div>
    );
  }

  if (field.type === "json") {
    return <textarea className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={String(value)} name={field.name} />;
  }

  return (
    <input
      className={controlClassName}
      defaultValue={String(value)}
      min={field.min}
      name={field.name}
      required={field.required}
      step={field.step}
      type={field.type === "number" ? "number" : field.type}
    />
  );
}

export function InventoryFoundationRecordModalLauncher({
  autoOpen,
  closeHref,
  descriptor,
  label,
  lookups,
  record,
  trigger,
}: Readonly<{
  autoOpen?: boolean;
  closeHref?: string;
  descriptor: InventoryFoundationDescriptor;
  label?: string;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  record?: FoundationRow;
  trigger?: ReactNode;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [isDirty, setIsDirty] = useState(false);
  const formId = useId();
  const title = `${record ? "Edit" : "Create"} ${descriptor.singular}`;
  const saveAction = record
    ? updateInventoryFoundationRecordAction.bind(null, descriptor.key, String(record.id))
    : async (formData: FormData) => {
        await createInventoryFoundationRecordAction(descriptor.key, formData);
      };

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {record ? (
            <form action={archiveInventoryFoundationRecordAction.bind(null, descriptor.key, String(record.id))}>
              <button className="rounded-md border px-3 py-2 text-sm" type="submit">Archive</button>
            </form>
          ) : null}
          <button className="rounded-md border px-3 py-2 text-sm" form={formId} type="submit">Save</button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      status={<span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{String(record?.status ?? "new")}</span>}
      subtitle="Validated Inventory Foundation fields saved to Supabase."
      title={title}
      trigger={autoOpen ? undefined : trigger ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">{label ?? title}</button>}
    >
      <RecordFormSection>
        <form
          action={saveAction}
          className="space-y-4"
          id={formId}
          onInput={() => setIsDirty(true)}
        >
          <FormGrid>
            {descriptor.fields.map((field) => (
              <FieldGroup isRequired={field.required} key={field.name} label={field.label}>
                <FieldControl field={field} lookups={lookups} record={record} />
              </FieldGroup>
            ))}
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

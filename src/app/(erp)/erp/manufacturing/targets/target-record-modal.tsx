"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  archiveManufacturingTargetAction,
  createManufacturingTargetAction,
  updateManufacturingTargetAction,
} from "@/features/manufacturing/routes/actions/targets.actions";
import type { ManufacturingTargetsWorkspaceData, TargetLookupOption } from "@/features/manufacturing/routes/loaders/targets.loader";
import { EntityLookup, FieldGroup, FormGrid, RecordFormDialog, RecordFormSection } from "@/shared/ui";

export type ManufacturingTargetType = "product" | "line" | "worker";

type TargetRecord = Record<string, unknown> & { id: string };
type TargetLookups = ManufacturingTargetsWorkspaceData["lookups"];

const statusOptions = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"] as const;

function Field({
  defaultValue,
  isRequired,
  label,
  name,
  type = "text",
}: Readonly<{ defaultValue?: string | number | null; isRequired?: boolean; label: string; name: string; type?: string }>) {
  return (
    <FieldGroup isRequired={isRequired} label={label}>
      <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={defaultValue ?? ""} name={name} required={isRequired} type={type} />
    </FieldGroup>
  );
}

function SearchField({
  defaultValue,
  isRequired,
  label,
  name,
  options,
}: Readonly<{
  defaultValue?: string | null;
  isRequired?: boolean;
  label: string;
  name: string;
  options: readonly TargetLookupOption[];
}>) {
  return (
    <FieldGroup isRequired={isRequired} label={label}>
      <EntityLookup
        emptyMessage="No related records found."
        label={options.length > 0 ? "Select related record" : "No records available yet"}
        name={name}
        options={options.map((option) => ({ ...option, subtitle: option.meta }))}
        placeholder={`Search ${label.toLowerCase()}...`}
        required={isRequired}
        value={defaultValue ?? ""}
      />
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Create the related master data first, then come back here.</p>
      ) : null}
    </FieldGroup>
  );
}

function StatusField({ defaultValue }: Readonly<{ defaultValue?: string | null }>) {
  return (
    <FieldGroup isRequired label="Status">
      <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={defaultValue ?? "active"} name="status" required>
        {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    </FieldGroup>
  );
}

function TargetFields({ lookups, record, targetType }: Readonly<{ lookups: TargetLookups; record?: TargetRecord; targetType: ManufacturingTargetType }>) {
  if (targetType === "product") {
    return (
      <FormGrid>
        <Field defaultValue={record?.targetKey as string | undefined} isRequired label="Target Key" name="targetKey" />
        <SearchField defaultValue={record?.manufacturingProductId as string | undefined} isRequired label="Manufacturing Product" name="manufacturingProductId" options={lookups.products} />
        <Field defaultValue={record?.targetPeriod as string | undefined ?? "daily"} isRequired label="Target Period" name="targetPeriod" />
        <Field defaultValue={record?.targetQuantity as number | undefined} isRequired label="Target Quantity" name="targetQuantity" type="number" />
        <StatusField defaultValue={record?.status as string | undefined} />
      </FormGrid>
    );
  }

  if (targetType === "line") {
    return (
      <FormGrid>
        <Field defaultValue={record?.targetKey as string | undefined} isRequired label="Target Key" name="targetKey" />
        <SearchField defaultValue={record?.planId as string | undefined} isRequired label="Plan" name="planId" options={lookups.plans} />
        <SearchField defaultValue={record?.manufacturingProductId as string | undefined} isRequired label="Product" name="manufacturingProductId" options={lookups.products} />
        <SearchField defaultValue={record?.productionLineId as string | undefined} isRequired label="Line" name="productionLineId" options={lookups.lines} />
        <Field defaultValue={record?.plannedQuantity as number | undefined} isRequired label="Planned Quantity" name="plannedQuantity" type="number" />
        <Field defaultValue={record?.actualQuantity as number | undefined ?? 0} label="Actual Quantity" name="actualQuantity" type="number" />
        <StatusField defaultValue={record?.status as string | undefined} />
      </FormGrid>
    );
  }

  return (
    <FormGrid>
      <Field defaultValue={record?.targetKey as string | undefined} isRequired label="Target Key" name="targetKey" />
      <SearchField defaultValue={record?.planId as string | undefined} isRequired label="Plan" name="planId" options={lookups.plans} />
      <SearchField defaultValue={record?.productionLineId as string | undefined} isRequired label="Line" name="productionLineId" options={lookups.lines} />
      <SearchField defaultValue={record?.workerRefId as string | undefined} isRequired label="Worker" name="workerRefId" options={lookups.workers} />
      <Field defaultValue={record?.targetQuantity as number | undefined} isRequired label="Target Quantity" name="targetQuantity" type="number" />
      <Field defaultValue={record?.actualQuantity as number | undefined ?? 0} label="Actual Quantity" name="actualQuantity" type="number" />
      <StatusField defaultValue={record?.status as string | undefined} />
    </FormGrid>
  );
}

export function TargetRecordModalLauncher({
  autoOpen,
  closeHref,
  label,
  lookups,
  record,
  targetType,
  trigger,
}: Readonly<{
  autoOpen?: boolean;
  closeHref?: string;
  label?: string;
  lookups: TargetLookups;
  record?: TargetRecord;
  targetType: ManufacturingTargetType;
  trigger?: ReactNode;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [isDirty, setIsDirty] = useState(false);
  const formId = useId();
  const title = `${record ? "Edit" : "Create"} ${targetType} target`;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {record ? (
            <form action={archiveManufacturingTargetAction.bind(null, targetType, record.id)}>
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
      subtitle="Validated manufacturing target fields saved to Supabase."
      title={title}
      trigger={autoOpen ? undefined : trigger ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">{label ?? title}</button>}
    >
      <RecordFormSection>
        <form
          action={record ? updateManufacturingTargetAction.bind(null, targetType, record.id) : createManufacturingTargetAction}
          className="space-y-4"
          id={formId}
          onInput={() => setIsDirty(true)}
        >
          <input name="targetType" type="hidden" value={targetType} />
          <TargetFields lookups={lookups} record={record} targetType={targetType} />
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

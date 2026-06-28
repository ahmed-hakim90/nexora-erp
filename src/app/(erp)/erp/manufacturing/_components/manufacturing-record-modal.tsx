"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { ManufacturingResourceDefinition } from "@/features/manufacturing/public-api";
import type { ManufacturingLookupOptions } from "@/features/manufacturing/routes/loaders/manufacturing-lookups.loader";
import { displayBusinessCode } from "@/shared/business-codes";
import { EntityLookup, FieldGroup, FormGrid, RecordFormDialog, RecordFormSection } from "@/shared/ui";

const manufacturingStatusOptions = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"] as const;
const fieldControlClassName = "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

type ManufacturingRecordModalLauncherProps = Readonly<{
  action: (formData: FormData) => Promise<void>;
  autoOpen?: boolean;
  closeHref?: string;
  definition: ManufacturingResourceDefinition;
  label?: string;
  lookupOptions?: ManufacturingLookupOptions;
  record?: Record<string, unknown>;
  trigger?: ReactNode;
}>;

export function ManufacturingRecordModalLauncher({
  action,
  autoOpen,
  closeHref,
  definition,
  label,
  lookupOptions = {},
  record,
  trigger,
}: ManufacturingRecordModalLauncherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [isDirty, setIsDirty] = useState(false);
  const formId = useId();
  const title = record ? `Edit ${definition.singularTitle}` : `Create ${definition.singularTitle}`;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return (
    <RecordFormDialog
      actions={
        <button className="rounded-md border px-3 py-2 text-sm" form={formId} type="submit">
          Save
        </button>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      status={<span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{String(record?.status ?? "new")}</span>}
      subtitle="Validated manufacturing foundation fields saved to Supabase."
      title={title}
      trigger={autoOpen ? undefined : trigger ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">{label ?? title}</button>}
    >
      <RecordFormSection>
        <form action={action} className="space-y-4" id={formId} onInput={() => setIsDirty(true)}>
          <FormGrid>
            {definition.formFields.map((field) => (
              <FieldGroup isRequired={field.isRequired} key={field.name} label={field.label}>
                {field.autoCode ? (
                  <>
                    <input name={field.name} type="hidden" value={record?.[field.name] == null ? "" : String(record[field.name])} />
                    <input
                      className="w-full rounded-md border border-border bg-muted px-3 py-2 text-muted-foreground shadow-sm"
                      readOnly
                      type="text"
                      value={record?.[field.name] == null ? "Auto-generated on save" : displayBusinessCode(record[field.name], field.autoCode)}
                    />
                  </>
                ) : field.name === "status" ? (
                  <select
                    className={fieldControlClassName}
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
                  <EntityLookup
                    emptyMessage="No related records found."
                    label={lookupOptions[field.name].length > 0 ? "Select related record" : "No records available"}
                    name={field.name}
                    options={lookupOptions[field.name].map((option) => ({ ...option, subtitle: option.meta }))}
                    placeholder="Search by name or code..."
                    required={field.isRequired}
                    value={record?.[field.name] == null ? "" : String(record[field.name])}
                  />
                ) : field.type === "checkbox" ? (
                  <div className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <input name={field.name} type="hidden" value="false" />
                    <input
                      className="size-4 rounded border border-border bg-background accent-primary"
                      defaultChecked={record?.[field.name] === true}
                      name={field.name}
                      type="checkbox"
                      value="true"
                    />
                    <span className="text-sm text-muted-foreground">Enabled</span>
                  </div>
                ) : (
                  <input
                    className={fieldControlClassName}
                    defaultValue={record?.[field.name] == null ? "" : String(record[field.name])}
                    name={field.name}
                    required={field.isRequired}
                    type={field.type}
                  />
                )}
              </FieldGroup>
            ))}
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

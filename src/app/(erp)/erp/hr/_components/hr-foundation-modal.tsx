"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { HrFoundationDescriptor, HrFoundationField } from "@/features/hr/public-api";
import { resolveHrFoundationFieldHelp } from "@/features/hr/public-api";
import {
  archiveHrFoundationRecordAction,
  createHrFoundationRecordAction,
  updateHrFoundationRecordAction,
} from "@/features/hr/routes/actions/hr-foundation.actions";
import type { HrFoundationWorkspaceData } from "@/features/hr/routes/loaders/hr-foundation.loader";
import { resolveHrLookupProviderKey } from "@/platform/operator-experience/lookup-registry";
import {
  Button,
  DatePicker,
  EntityLookup,
  FieldGroup,
  FormGrid,
  Input,
  nativeSelectClassName,
  nativeTextareaClassName,
  RecordFormDialog,
  RecordFormSection,
  useRecordFormModal,
} from "@/shared/ui";

type FoundationRow = Record<string, unknown>;

function fieldValue(record: FoundationRow | undefined, field: HrFoundationField) {
  const value = record?.[field.column];
  if (field.type === "checkbox") return value === true;
  return value === null || value === undefined ? "" : String(value);
}

function FieldControl({
  field,
  lookups,
  record,
}: Readonly<{
  field: HrFoundationField;
  lookups: HrFoundationWorkspaceData["lookups"];
  record?: FoundationRow;
}>) {
  const value = fieldValue(record, field);

  if (field.type === "lookup" && field.lookup) {
    const providerKey = resolveHrLookupProviderKey(field.lookup);
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
    const options = lookups[field.lookup] ?? [];
    return (
      <EntityLookup
        disabled={field.required && options.length === 0}
        emptyMessage="Create related records first."
        label={`Select ${field.label}`}
        name={field.name}
        options={options}
        required={field.required}
        value={currentValue}
      />
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    if (options.length === 1) {
      return (
        <>
          <input name={field.name} type="hidden" value={options[0]?.value ?? ""} />
          <Input readOnly type="text" value={options[0]?.label ?? options[0]?.value ?? ""} />
        </>
      );
    }
    const defaultValue = String(value) || (field.required && options.length === 1 ? options[0]?.value ?? "" : "");
    return (
      <select className={nativeSelectClassName} defaultValue={defaultValue} name={field.name} required={field.required}>
        <option value="">{field.required ? "Select..." : "-"}</option>
        {options.map((option) => (
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
        <input
          className="size-4 rounded border border-border bg-background accent-primary"
          defaultChecked={Boolean(value)}
          name={field.name}
          type="checkbox"
          value="true"
        />
        <span className="text-sm text-muted-foreground">Enabled</span>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        className={nativeTextareaClassName}
        defaultValue={String(value)}
        name={field.name}
        required={field.required}
      />
    );
  }

  if (field.type === "date") {
    return <DatePicker defaultValue={String(value)} name={field.name} required={field.required} />;
  }

  return (
    <Input
      defaultValue={String(value)}
      min={field.min}
      name={field.name}
      required={field.required}
      type={field.type === "number" ? "number" : "text"}
    />
  );
}

export function HrFoundationRecordModalLauncher({
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
  descriptor: HrFoundationDescriptor;
  label?: string;
  lookups: HrFoundationWorkspaceData["lookups"];
  record?: FoundationRow;
  trigger?: ReactNode;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen, closeHref });
  const title = `${record ? "Edit" : "Create"} ${descriptor.singular}`;
  const basicFields = descriptor.fields.filter((field) => !field.advanced);
  const advancedFields = descriptor.fields.filter((field) => field.advanced);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (record) {
        await updateHrFoundationRecordAction(descriptor.key, String(record.id), formData);
      } else {
        await createHrFoundationRecordAction(descriptor.key, formData);
      }
      if (closeHref) router.push(closeHref);
      else handleOpenChange(false);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(`Archive this ${descriptor.singular.toLowerCase()}? This action can be reversed by an administrator.`)) return;
    startTransition(async () => {
      await archiveHrFoundationRecordAction(descriptor.key, String(record.id));
      if (closeHref) router.push(closeHref);
      else handleOpenChange(false);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {record ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              Archive
            </Button>
          ) : null}
          <Button disabled={isPending} form={formId} type="submit" variant="primary">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      status={<span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{String(record?.status ?? "new")}</span>}
      subtitle={descriptor.description}
      title={title}
      trigger={autoOpen ? undefined : trigger ?? <Button type="button" variant="secondary">{label ?? title}</Button>}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            {basicFields.map((field) => (
              <FieldGroup
                help={resolveHrFoundationFieldHelp(field)}
                isRequired={field.required}
                key={field.name}
                label={field.labelAr ? `${field.label} / ${field.labelAr}` : field.label}
              >
                <FieldControl field={field} lookups={lookups} record={record} />
              </FieldGroup>
            ))}
          </FormGrid>
          {advancedFields.length > 0 ? (
            <details className="rounded-md border p-4">
              <summary className="cursor-pointer text-sm font-medium">Advanced fields</summary>
              <div className="mt-4">
                <FormGrid>
                  {advancedFields.map((field) => (
                    <FieldGroup
                      help={resolveHrFoundationFieldHelp(field)}
                      isRequired={field.required}
                      key={field.name}
                      label={field.labelAr ? `${field.label} / ${field.labelAr}` : field.label}
                    >
                      <FieldControl field={field} lookups={lookups} record={record} />
                    </FieldGroup>
                  ))}
                </FormGrid>
              </div>
            </details>
          ) : null}
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

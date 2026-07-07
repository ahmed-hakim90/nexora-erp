"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "@/features/inventory/public-api";
import { updateInventoryFoundationRecordAction } from "@/features/inventory/routes/actions/inventory-foundation.actions";
import type { InventoryFoundationWorkspaceData } from "@/features/inventory/routes/loaders/inventory-foundation.loader";
import { resolveFoundationLookupProviderKey } from "@/platform/operator-experience/lookup-registry";
import { displayBusinessCode } from "@/shared/business-codes";
import {
  CrossEngineLookupWorkflow,
  EditableProfileWorkspace,
  buildCrossEngineFormData,
  inferProfileFieldOwnership,
  mapSimpleFieldType,
  useEditablePageContext,
  type ProfileFieldDefinition,
  type ProfileSectionDefinition,
} from "@/shared/ui";

type FoundationRow = Record<string, unknown>;

function fieldValue(record: FoundationRow, field: InventoryFoundationField) {
  const value = record[field.column];
  if (field.type === "json") return value;
  if (field.type === "tags") return Array.isArray(value) ? value.join("\n") : "";
  if (field.type === "checkbox") return value === true;
  return value === null || value === undefined ? "" : value;
}

function normalizeFoundationRecord(
  record: FoundationRow,
  fields: readonly InventoryFoundationField[],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { id: record.id };
  for (const field of fields) {
    normalized[field.name] = fieldValue(record, field);
  }
  normalized.createdAt = record.created_at;
  normalized.createdBy = record.created_by;
  normalized.updatedAt = record.updated_at;
  normalized.updatedBy = record.updated_by;
  normalized.version = record.version;
  return normalized;
}

function inventoryFieldToProfileField(
  field: InventoryFoundationField,
  workspace: Pick<InventoryFoundationWorkspaceData, "lookups">,
): ProfileFieldDefinition {
  const providerKey = field.lookup ? resolveFoundationLookupProviderKey(field.lookup) : undefined;
  const ownership = field.autoCode ? "readonly" : inferProfileFieldOwnership(field.name);

  return {
    autosave: field.type === "json",
    editorType: field.type === "lookup" ? "entity-lookup" : mapSimpleFieldType(field.type),
    formatDisplay: (value: unknown) => {
      if (field.autoCode) return displayBusinessCode(value, field.autoCode) || "—";
      if (field.lookup) {
        const option = workspace.lookups[field.lookup]?.find((candidate) => candidate.id === String(value));
        return option?.label ?? "—";
      }
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return value === null || value === undefined || value === "" ? "—" : String(value);
    },
    isRequired: field.required,
    label: field.label,
    lookupOptions: field.lookup ? workspace.lookups[field.lookup] : undefined,
    lookupProviderKey: providerKey ?? undefined,
    name: field.name,
    ownership,
    selectOptions: field.options,
  };
}

export function InventoryFoundationDetailWorkspace({
  canManage = true,
  descriptor,
  lookups,
  record,
}: Readonly<{
  canManage?: boolean;
  descriptor: InventoryFoundationDescriptor;
  lookups: InventoryFoundationWorkspaceData["lookups"];
  record: FoundationRow;
}>) {
  const router = useRouter();
  const normalizedRecord = useMemo(() => normalizeFoundationRecord(record, descriptor.fields), [descriptor.fields, record]);
  const profileFields = useMemo(
    () => descriptor.fields.map((field) => inventoryFieldToProfileField(field, { lookups })),
    [descriptor.fields, lookups],
  );
  const sections = useMemo<readonly ProfileSectionDefinition[]>(
    () => [
      {
        key: "general",
        title: "General Information",
        description: descriptor.description,
        fields: profileFields,
      },
    ],
    [descriptor.description, profileFields],
  );

  return (
    <EditableProfileWorkspace
      canEdit={canManage}
      entityId={String(record.id)}
      entityLabel={String(record.name ?? record.code ?? descriptor.singular)}
      entityType={`inventory_${descriptor.key.replaceAll("-", "_")}`}
      fields={profileFields}
      lastUpdated={record.updated_at ? String(record.updated_at) : null}
      record={normalizedRecord}
      renderWorkflow={(fieldName) => (
        <InventoryCrossEngineWorkflow
          descriptorKey={descriptor.key}
          fieldName={fieldName}
          profileFields={profileFields}
          record={normalizedRecord}
          recordId={String(record.id)}
        />
      )}
      sections={sections}
      onSave={(formData) => updateInventoryFoundationRecordAction(descriptor.key, String(record.id), formData)}
      onSaved={() => router.refresh()}
    />
  );
}

function InventoryCrossEngineWorkflow({
  descriptorKey,
  fieldName,
  profileFields,
  record,
  recordId,
}: Readonly<{
  descriptorKey: string;
  fieldName: string;
  profileFields: readonly ProfileFieldDefinition[];
  record: Record<string, unknown>;
  recordId: string;
}>) {
  const page = useEditablePageContext();
  const router = useRouter();
  const field = profileFields.find((candidate) => candidate.name === fieldName);
  if (!field || field.ownership !== "cross-engine") return null;

  return (
    <CrossEngineLookupWorkflow
      currentValue={record[fieldName]}
      field={field}
      onCancel={() => page?.closeWorkflow()}
      onSubmit={async (value) => {
        const formData = buildCrossEngineFormData(record, profileFields, fieldName, value);
        await updateInventoryFoundationRecordAction(descriptorKey, recordId, formData);
        page?.closeWorkflow();
        router.refresh();
      }}
    />
  );
}

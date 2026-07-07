"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { ManufacturingResourceDefinition } from "@/features/manufacturing/public-api";
import { updateManufacturingRecordAction } from "@/features/manufacturing/routes/actions/manufacturing.actions";
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

import type { ManufacturingLookupOptions } from "@/features/manufacturing/routes/loaders/manufacturing-lookups.loader";

function manufacturingFieldToProfileField(
  field: ManufacturingResourceDefinition["formFields"][number],
  lookupOptions: ManufacturingLookupOptions,
  definition: ManufacturingResourceDefinition,
): ProfileFieldDefinition {
  const lookup = lookupOptions[field.name];
  const isAssignmentResource = definition.key === "line-assignments";
  const ownership = field.autoCode
    ? "readonly"
    : isAssignmentResource && (field.name === "employeeId" || field.name === "productionLineId" || field.name === "manufacturingProfileId")
      ? "cross-engine"
      : inferProfileFieldOwnership(field.name);

  return {
    editorType: lookup ? "entity-lookup" : field.name === "status" ? "select" : mapSimpleFieldType(field.type),
    formatDisplay: (value: unknown) => {
      if (field.autoCode) return displayBusinessCode(value, field.autoCode) || "—";
      if (lookup) {
        const option = lookup.find((entry) => entry.id === String(value));
        return option?.label ?? "—";
      }
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return value === null || value === undefined || value === "" ? "—" : String(value);
    },
    isRequired: field.isRequired,
    label: field.label,
    lookupOptions: lookup?.map((option) => ({ id: option.id, label: option.label })),
    name: field.name,
    ownership,
    selectOptions:
      field.name === "status"
        ? ["draft", "active", "inactive", "locked", "archived"].map((status) => ({ value: status, label: status }))
        : undefined,
    workflowKey:
      isAssignmentResource && field.name === "employeeId"
        ? "employee-assignment"
        : isAssignmentResource && field.name === "productionLineId"
          ? "production-line-assignment"
          : undefined,
    workflowTitle:
      isAssignmentResource && field.name === "employeeId"
        ? "Employee Assignment"
        : isAssignmentResource && field.name === "productionLineId"
          ? "Production Line Assignment"
          : undefined,
  };
}

export function ManufacturingDetailWorkspace({
  canManage = true,
  definition,
  lookupOptions,
  record,
}: Readonly<{
  canManage?: boolean;
  definition: ManufacturingResourceDefinition;
  lookupOptions: ManufacturingLookupOptions;
  record: Record<string, unknown>;
}>) {
  const router = useRouter();
  const profileFields = useMemo(
    () => definition.formFields.map((field) => manufacturingFieldToProfileField(field, lookupOptions, definition)),
    [definition, lookupOptions],
  );
  const sections = useMemo<readonly ProfileSectionDefinition[]>(
    () => [
      {
        key: "general",
        title: "General Information",
        description: definition.description,
        fields: profileFields,
      },
    ],
    [definition.description, profileFields],
  );

  return (
    <EditableProfileWorkspace
      canEdit={canManage}
      entityId={String(record.id)}
      entityLabel={String(record.name ?? record.code ?? definition.singularTitle)}
      entityType={`manufacturing_${definition.key.replaceAll("-", "_")}`}
      fields={profileFields}
      lastUpdated={record.updatedAt ? String(record.updatedAt) : null}
      record={record}
      renderWorkflow={(fieldName) => (
        <ManufacturingCrossEngineWorkflow
          definition={definition}
          fieldName={fieldName}
          id={String(record.id)}
          profileFields={profileFields}
          record={record}
        />
      )}
      sections={sections}
      onSave={async (formData) => updateManufacturingRecordAction(definition.key, String(record.id), formData)}
      onSaved={() => router.refresh()}
    />
  );
}

function ManufacturingCrossEngineWorkflow({
  definition,
  fieldName,
  id,
  profileFields,
  record,
}: Readonly<{
  definition: ManufacturingResourceDefinition;
  fieldName: string;
  id: string;
  profileFields: readonly ProfileFieldDefinition[];
  record: Record<string, unknown>;
}>) {
  const page = useEditablePageContext();
  const router = useRouter();
  const field = profileFields.find((candidate) => candidate.name === fieldName);
  if (!field) return null;

  return (
    <CrossEngineLookupWorkflow
      currentValue={record[fieldName]}
      field={field}
      onCancel={() => page?.closeWorkflow()}
      onSubmit={async (value) => {
        const formData = buildCrossEngineFormData(record, profileFields, fieldName, value);
        await updateManufacturingRecordAction(definition.key, id, formData);
        page?.closeWorkflow();
        router.refresh();
      }}
    />
  );
}

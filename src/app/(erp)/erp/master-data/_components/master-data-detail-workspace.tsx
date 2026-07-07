"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

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

type MasterDataField = Readonly<{
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
}>;

export function MasterDataDetailWorkspace({
  canManage = true,
  configKey,
  entityLabel,
  fields,
  record,
  updateAction,
}: Readonly<{
  canManage?: boolean;
  configKey: string;
  entityLabel: string;
  fields: readonly MasterDataField[];
  record: Record<string, unknown>;
  updateAction: (id: string, formData: FormData) => Promise<unknown>;
}>) {
  const router = useRouter();
  const id = String(record.id);

  const profileFields = useMemo<readonly ProfileFieldDefinition[]>(
    () =>
      fields.map((field) => ({
        editorType: mapSimpleFieldType(field.type),
        isRequired: field.isRequired,
        label: field.label,
        name: field.name,
        ownership: field.name === "branchId" ? "cross-engine" : inferProfileFieldOwnership(field.name),
        workflowKey: field.name === "branchId" ? "branch-assignment" : undefined,
        workflowTitle: field.name === "branchId" ? "Branch Assignment" : undefined,
        lookupProviderKey: field.name === "branchId" ? "master-data.branches.lookup" : undefined,
      })),
    [fields],
  );

  const sections = useMemo<readonly ProfileSectionDefinition[]>(
    () => [
      {
        key: "general",
        title: "General Information",
        description: "Master data fields owned by this record.",
        fields: profileFields,
      },
      {
        key: "classification",
        title: "Classification",
        description: "Status and scope fields.",
        fields: [
          {
            name: "isActive",
            label: "Active",
            editorType: "checkbox",
            ownership: "entity",
          },
        ],
      },
    ],
    [profileFields],
  );

  return (
    <EditableProfileWorkspace
      canEdit={canManage}
      entityId={id}
      entityLabel={entityLabel}
      entityType={`master_data_${configKey}`}
      fields={[...profileFields, { name: "isActive", label: "Active", editorType: "checkbox", ownership: "entity" }]}
      lastUpdated={record.updatedAt ? String(record.updatedAt) : null}
      record={record}
      renderWorkflow={(fieldName) => (
        <MasterDataCrossEngineWorkflow
          fieldName={fieldName}
          fields={profileFields}
          id={id}
          record={record}
          updateAction={updateAction}
        />
      )}
      sections={sections}
      onSave={async (formData) => updateAction(id, formData)}
      onSaved={() => router.refresh()}
    />
  );
}

function MasterDataCrossEngineWorkflow({
  fieldName,
  fields,
  id,
  record,
  updateAction,
}: Readonly<{
  fieldName: string;
  fields: readonly ProfileFieldDefinition[];
  id: string;
  record: Record<string, unknown>;
  updateAction: (id: string, formData: FormData) => Promise<unknown>;
}>) {
  const page = useEditablePageContext();
  const router = useRouter();
  const field = fields.find((candidate) => candidate.name === fieldName);
  if (!field) return null;

  return (
    <CrossEngineLookupWorkflow
      currentValue={record[fieldName]}
      field={field}
      onCancel={() => page?.closeWorkflow()}
      onSubmit={async (value) => {
        const formData = buildCrossEngineFormData(record, fields, fieldName, value);
        await updateAction(id, formData);
        page?.closeWorkflow();
        router.refresh();
      }}
    />
  );
}

"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import {
  AuditActivityTimeline,
  SaveAuditMetadata,
  buildRecordActivityEvents,
  type RecordAuditMetadata,
} from "./floating-record-panel";
import { useEditablePageContext } from "./editable-page-context";
import {
  EditableField,
  EditableFieldGrid,
  type EditableFieldEditorType,
  type EditableFieldOwnership,
} from "./editable-field";
import { EditablePage } from "./editable-page";
import { EditableSectionCard } from "./editable-section-card";

export type ProfileFieldOwnership = EditableFieldOwnership;

export type ProfileFieldDefinition = Readonly<{
  autosave?: boolean;
  description?: string;
  editorType?: EditableFieldEditorType;
  formatDisplay?: (value: unknown) => ReactNode;
  isRequired?: boolean;
  label: string;
  lookupOptions?: readonly { id: string; label: string; subtitle?: string }[];
  lookupProviderKey?: string;
  name: string;
  ownership?: ProfileFieldOwnership;
  permissionMessage?: string;
  selectOptions?: readonly { value: string; label: string; disabled?: boolean }[];
  validate?: (value: unknown, draft: Readonly<Record<string, unknown>>) => string | null;
  workflowKey?: string;
  workflowTitle?: string;
}>;

export type ProfileSectionDefinition = Readonly<{
  description?: string;
  fields: readonly ProfileFieldDefinition[];
  key: string;
  title: string;
}>;

const READONLY_FIELD_NAMES = new Set([
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "version",
  "tenantId",
  "companyId",
  "deletedAt",
  "deletedBy",
  "id",
  "status",
  "postingStatus",
  "journalNumber",
  "documentNumber",
  "lastLogin",
]);

export const PROFILE_AUDIT_FIELDS: readonly ProfileFieldDefinition[] = [
  { name: "createdBy", label: "Created by", ownership: "readonly" },
  { name: "createdAt", label: "Created at", ownership: "readonly" },
  { name: "updatedBy", label: "Updated by", ownership: "readonly" },
  { name: "updatedAt", label: "Last updated", ownership: "readonly" },
  { name: "version", label: "Version", ownership: "readonly" },
];

export function inferProfileFieldOwnership(
  fieldName: string,
  crossEngineFields: readonly string[] = [],
  versionedFields: readonly string[] = [],
): ProfileFieldOwnership {
  if (READONLY_FIELD_NAMES.has(fieldName)) return "readonly";
  if (crossEngineFields.includes(fieldName)) return "cross-engine";
  if (versionedFields.includes(fieldName)) return "versioned";
  return "entity";
}

export function mapSimpleFieldType(type: string): EditableFieldEditorType {
  if (type === "textarea") return "textarea";
  if (type === "number" || type === "currency" || type === "percentage") return "number";
  if (type === "date" || type === "datetime") return type === "datetime" ? "datetime" : "date";
  if (type === "checkbox") return "checkbox";
  if (type === "switch") return "switch";
  if (type === "select") return "select";
  if (type === "lookup" || type === "entity-lookup") return "entity-lookup";
  if (type === "email") return "email";
  if (type === "phone" || type === "tel") return "phone";
  if (type === "tags") return "tags";
  return "text";
}

export function formatProfileFieldValue(
  value: unknown,
  field?: Pick<ProfileFieldDefinition, "editorType" | "formatDisplay" | "selectOptions">,
): ReactNode {
  if (field?.formatDisplay) return field.formatDisplay(value);
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field?.editorType === "select" && field.selectOptions) {
    const match = field.selectOptions.find((option) => option.value === String(value));
    return match?.label ?? String(value);
  }
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** @deprecated Use buildChangedFormData from use-editable-page for Edit Mode v2 batch saves. */
export function buildPatchFormData(
  record: Readonly<Record<string, unknown>>,
  fields: readonly ProfileFieldDefinition[],
  changedField: string,
  changedValue: unknown,
  extraValues?: Readonly<Record<string, unknown>>,
): FormData {
  const formData = new FormData();
  const fieldNames = fields.map((field) => field.name);

  for (const name of fieldNames) {
    const value = name === changedField ? changedValue : record[name];
    appendFormValue(formData, name, value);
  }

  for (const [name, value] of Object.entries(extraValues ?? {})) {
    appendFormValue(formData, name, value);
  }

  if (record.id !== undefined) {
    formData.set("id", String(record.id));
  }

  return formData;
}

function appendFormValue(formData: FormData, name: string, value: unknown) {
  if (value === null || value === undefined) {
    formData.set(name, "");
    return;
  }
  if (typeof value === "boolean") {
    formData.set(name, value ? "true" : "false");
    return;
  }
  formData.set(name, String(value));
}

export function EditableProfileField({
  canEdit = true,
  canView = true,
  field,
  record,
}: Readonly<{
  canEdit?: boolean;
  canView?: boolean;
  field: ProfileFieldDefinition;
  record: Readonly<Record<string, unknown>>;
}>) {
  const page = useEditablePageContext();
  const sourceRecord = page?.draft ?? record;
  const ownership = field.ownership ?? "entity";
  const value = sourceRecord[field.name];

  return (
    <EditableField
      canEdit={canEdit && ownership !== "readonly"}
      canView={canView}
      description={field.description}
      editorType={field.editorType ?? "text"}
      formatDisplay={
        field.formatDisplay
          ? () => field.formatDisplay?.(value)
          : field.editorType === "select"
            ? () => formatProfileFieldValue(value, field)
            : undefined
      }
      isRequired={field.isRequired}
      label={field.label}
      lookupOptions={field.lookupOptions}
      lookupProviderKey={field.lookupProviderKey}
      name={field.name}
      ownership={ownership}
      permissionMessage={field.permissionMessage}
      placeholder={field.editorType === "select" ? `Select ${field.label.toLowerCase()}` : undefined}
      selectOptions={field.selectOptions}
      validate={field.validate ? (nextValue) => field.validate?.(nextValue, sourceRecord) ?? null : undefined}
      value={value === null || value === undefined ? "" : value}
    />
  );
}

export function EditableProfileSection({
  canEdit = true,
  canView = true,
  lastUpdated,
  record,
  section,
}: Readonly<{
  canEdit?: boolean;
  canView?: boolean;
  lastUpdated?: string | null;
  record: Readonly<Record<string, unknown>>;
  section: ProfileSectionDefinition;
}>) {
  return (
    <EditableSectionCard description={section.description} lastUpdated={lastUpdated} title={section.title}>
      <EditableFieldGrid>
        {section.fields.map((field) => (
          <EditableProfileField canEdit={canEdit} canView={canView} field={field} key={field.name} record={record} />
        ))}
      </EditableFieldGrid>
    </EditableSectionCard>
  );
}

export function EditableProfileWorkspace({
  actions,
  auditMetadata,
  canEdit = true,
  canView = true,
  description,
  entityId,
  entityLabel,
  entityType,
  extraValues,
  fields,
  lastUpdated,
  onSave,
  onSaved,
  record,
  renderWorkflow,
  saveStrategy,
  sections,
  showAuditSection = true,
  showHistorySection = false,
  sourceScreen,
  timelineEvents,
  title,
}: Readonly<{
  actions?: ReactNode;
  auditMetadata?: RecordAuditMetadata | null;
  canEdit?: boolean;
  canView?: boolean;
  description?: string;
  entityId: string;
  entityLabel: string;
  entityType: string;
  extraValues?: Readonly<Record<string, unknown>>;
  fields?: readonly ProfileFieldDefinition[];
  lastUpdated?: string | null;
  onSave: (formData: FormData, changedFields?: readonly string[]) => Promise<unknown>;
  onSaved?: () => void;
  record: Readonly<Record<string, unknown>>;
  renderWorkflow?: (fieldName: string) => ReactNode;
  saveStrategy?: import("./use-editable-page").EditablePageSaveStrategy;
  sections: readonly ProfileSectionDefinition[];
  showAuditSection?: boolean;
  showHistorySection?: boolean;
  sourceScreen?: string;
  timelineEvents?: Parameters<typeof buildRecordActivityEvents>[0];
  title?: string;
}>) {
  const allFields = useMemo(
    () => fields ?? sections.flatMap((section) => section.fields),
    [fields, sections],
  );

  const activityEvents = useMemo(
    () => (timelineEvents ? buildRecordActivityEvents(timelineEvents) : []),
    [timelineEvents],
  );

  return (
    <EditablePage
      actions={actions}
      canEdit={canEdit}
      description={description}
      entityId={entityId}
      entityLabel={entityLabel}
      entityType={entityType}
      extraValues={extraValues}
      fields={allFields}
      onSave={onSave}
      onSaved={onSaved}
      record={record}
      renderWorkflow={renderWorkflow}
      saveStrategy={saveStrategy}
      sourceScreen={sourceScreen}
      title={title}
    >
      <div className="space-y-4">
        {sections.map((section) => (
          <EditableProfileSection
            canEdit={canEdit}
            canView={canView}
            key={section.key}
            lastUpdated={lastUpdated}
            record={record}
            section={section}
          />
        ))}

        {showHistorySection ? (
          <EditableSectionCard title="Timeline">
            <AuditActivityTimeline events={activityEvents} />
          </EditableSectionCard>
        ) : null}

        {showAuditSection ? (
          <EditableSectionCard title="Audit">
            <EditableFieldGrid>
              {PROFILE_AUDIT_FIELDS.map((field) => (
                <EditableProfileField canEdit={false} canView field={field} key={field.name} record={record} />
              ))}
            </EditableFieldGrid>
            <div className="mt-4">
              <SaveAuditMetadata metadata={auditMetadata} />
            </div>
          </EditableSectionCard>
        ) : null}
      </div>
    </EditablePage>
  );
}

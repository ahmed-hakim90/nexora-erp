"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { platform } from "@/platform/client";

import type { ProfileFieldDefinition } from "./editable-profile-workspace";
import type { EditableFieldOwnership } from "./use-editable-field";
import { isCrossEngineOwnership, isDirectEditableOwnership } from "./use-editable-field";

export type EditablePageMode = "view" | "edit";

export type EditablePageSaveStatus = "idle" | "saving" | "saved" | "failed";

export type EditablePageSaveStrategy = "changed-only" | "all-editable";

export type UseEditablePageOptions = Readonly<{
  canEdit?: boolean;
  entityId: string;
  entityLabel: string;
  entityType: string;
  extraValues?: Readonly<Record<string, unknown>>;
  fields: readonly ProfileFieldDefinition[];
  onSave: (formData: FormData, changedFields: readonly string[]) => Promise<unknown>;
  onSaved?: () => void;
  record: Readonly<Record<string, unknown>>;
  saveStrategy?: EditablePageSaveStrategy;
  sourceScreen?: string;
  successMessage?: string;
}>;

export type UseEditablePageResult = Readonly<{
  cancelEdit: () => void;
  changedFields: ReadonlySet<string>;
  closeWorkflow: () => void;
  draft: Readonly<Record<string, unknown>>;
  errors: Readonly<Record<string, string>>;
  isDirty: boolean;
  openWorkflow: (fieldName: string) => void;
  pageMode: EditablePageMode;
  saveAll: () => Promise<boolean>;
  saveStatus: EditablePageSaveStatus;
  setFieldValue: (fieldName: string, value: unknown) => void;
  startEdit: () => void;
  workflowField: string | null;
}>;

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || left === undefined || left === "") {
    return right === null || right === undefined || right === "";
  }
  return String(left) === String(right);
}

export function buildChangedFormData(
  record: Readonly<Record<string, unknown>>,
  fields: readonly ProfileFieldDefinition[],
  changedFields: readonly string[],
  draft: Readonly<Record<string, unknown>>,
  extraValues?: Readonly<Record<string, unknown>>,
  strategy: EditablePageSaveStrategy = "all-editable",
): FormData {
  const formData = new FormData();
  const changedSet = new Set(changedFields);

  for (const field of fields) {
    if (!isDirectEditableOwnership(field.ownership ?? "entity")) continue;
    if (strategy === "changed-only" && !changedSet.has(field.name)) continue;
    appendFormValue(formData, field.name, draft[field.name]);
  }

  for (const [name, value] of Object.entries(extraValues ?? {})) {
    appendFormValue(formData, name, value);
  }

  if (record.id !== undefined) {
    formData.set("id", String(record.id));
  }

  return formData;
}

export function buildCrossEngineFormData(
  record: Readonly<Record<string, unknown>>,
  fields: readonly ProfileFieldDefinition[],
  fieldName: string,
  value: unknown,
  extraValues?: Readonly<Record<string, unknown>>,
): FormData {
  const formData = new FormData();

  for (const field of fields) {
    if (field.ownership === "readonly") continue;
    appendFormValue(formData, field.name, field.name === fieldName ? value : record[field.name]);
  }

  for (const [name, extraValue] of Object.entries(extraValues ?? {})) {
    appendFormValue(formData, name, extraValue);
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

function validateField(
  field: ProfileFieldDefinition,
  value: unknown,
  draft: Readonly<Record<string, unknown>>,
): string | null {
  if (field.isRequired && (value === null || value === undefined || value === "")) {
    return `${field.label} is required.`;
  }
  return field.validate?.(value, draft) ?? null;
}

export function useEditablePage({
  canEdit = true,
  entityId,
  entityLabel,
  entityType,
  extraValues,
  fields,
  onSave,
  onSaved,
  record,
  saveStrategy = "all-editable",
  sourceScreen,
  successMessage = "Changes saved",
}: UseEditablePageOptions): UseEditablePageResult {
  const [pageMode, setPageMode] = useState<EditablePageMode>("view");
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...record });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workflowField, setWorkflowField] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<EditablePageSaveStatus>("idle");

  useEffect(() => {
    if (pageMode === "view") {
      setDraft({ ...record });
      setErrors({});
    }
  }, [pageMode, record]);

  const changedFields = useMemo(() => {
    const changed = new Set<string>();
    for (const field of fields) {
      if (!isDirectEditableOwnership(field.ownership ?? "entity")) continue;
      if (!valuesEqual(draft[field.name], record[field.name])) {
        changed.add(field.name);
      }
    }
    return changed;
  }, [draft, fields, record]);

  const isDirty = changedFields.size > 0;

  const startEdit = useCallback(() => {
    if (!canEdit) return;
    setDraft({ ...record });
    setErrors({});
    setPageMode("edit");
  }, [canEdit, record]);

  const cancelEdit = useCallback(() => {
    setDraft({ ...record });
    setErrors({});
    setWorkflowField(null);
    setPageMode("view");
    setSaveStatus("idle");
  }, [record]);

  const setFieldValue = useCallback((fieldName: string, value: unknown) => {
    setDraft((current) => ({ ...current, [fieldName]: value }));
    setErrors((current) => {
      if (!current[fieldName]) return current;
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  }, []);

  const openWorkflow = useCallback((fieldName: string) => {
    setWorkflowField(fieldName);
  }, []);

  const closeWorkflow = useCallback(() => {
    setWorkflowField(null);
  }, []);

  const saveAll = useCallback(async () => {
    if (!canEdit || pageMode !== "edit") return false;

    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!changedFields.has(field.name)) continue;
      if (!isDirectEditableOwnership(field.ownership ?? "entity")) continue;
      const error = validateField(field, draft[field.name], draft);
      if (error) nextErrors[field.name] = error;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSaveStatus("failed");
      return false;
    }

    if (changedFields.size === 0) {
      setPageMode("view");
      return true;
    }

    setSaveStatus("saving");
    try {
      const formData = buildChangedFormData(record, fields, [...changedFields], draft, extraValues, saveStrategy);
      await onSave(formData, [...changedFields]);
      platform.feedback.success(successMessage, {
        entity: { id: entityId, label: entityLabel, type: entityType },
        source: "runtime",
      });
      setSaveStatus("saved");
      setPageMode("view");
      setErrors({});
      onSaved?.();
      return true;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save changes.";
      setSaveStatus("failed");
      setErrors({ _form: message });
      platform.feedback.error("Save failed", { description: message, source: "runtime" });
      return false;
    }
  }, [
    canEdit,
    changedFields,
    draft,
    entityId,
    entityLabel,
    entityType,
    extraValues,
    fields,
    onSave,
    onSaved,
    pageMode,
    record,
    saveStrategy,
    sourceScreen,
    successMessage,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (pageMode !== "edit") return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveAll();
      }
      if (event.key === "Escape" && !workflowField) {
        event.preventDefault();
        cancelEdit();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelEdit, pageMode, saveAll, workflowField]);

  useEffect(() => {
    if (pageMode !== "edit" || !isDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, pageMode]);

  return {
    cancelEdit,
    changedFields,
    closeWorkflow,
    draft,
    errors,
    isDirty,
    openWorkflow,
    pageMode,
    saveAll,
    saveStatus,
    setFieldValue,
    startEdit,
    workflowField,
  };
}

export function resolveWorkflowField(
  fieldName: string | null,
  fields: readonly ProfileFieldDefinition[],
): ProfileFieldDefinition | null {
  if (!fieldName) return null;
  return fields.find((field) => field.name === fieldName) ?? null;
}

export function isFieldEditableInPageMode(
  ownership: EditableFieldOwnership | undefined,
  pageMode: EditablePageMode,
  canEdit: boolean,
): boolean {
  if (!canEdit || pageMode !== "edit") return false;
  return isDirectEditableOwnership(ownership ?? "entity") || isCrossEngineOwnership(ownership ?? "entity");
}

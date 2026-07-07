"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type EditableFieldMode =
  | "display"
  | "hover"
  | "editing"
  | "saving"
  | "success"
  | "validation-error"
  | "permission-denied"
  | "read-only";

export type EditableFieldOwnership = "entity" | "versioned" | "cross-engine" | "readonly";

export function isReadonlyFieldOwnership(ownership: EditableFieldOwnership): ownership is "readonly" {
  return ownership === "readonly";
}

export function isDirectEditableOwnership(ownership: EditableFieldOwnership): boolean {
  return ownership === "entity" || ownership === "versioned";
}

export function isCrossEngineOwnership(ownership: EditableFieldOwnership): boolean {
  return ownership === "cross-engine";
}

export type EditableFieldEditorType =
  | "text"
  | "number"
  | "textarea"
  | "entity-lookup"
  | "date"
  | "datetime"
  | "select"
  | "multi-select"
  | "currency"
  | "percentage"
  | "checkbox"
  | "switch"
  | "tags"
  | "phone"
  | "email"
  | "address"
  | "avatar"
  | "signature"
  | "rich-text"
  | "files";

export type UseEditableFieldOptions<TValue> = Readonly<{
  autosave?: boolean;
  autosaveDelayMs?: number;
  canEdit?: boolean;
  canView?: boolean;
  onCancel?: () => void;
  onSave: (value: TValue) => Promise<TValue | void> | TValue | void;
  onWorkflowOpen?: () => void;
  ownership?: EditableFieldOwnership;
  permissionMessage?: string;
  validate?: (value: TValue) => string | null;
  value: TValue;
}>;

export type UseEditableFieldResult<TValue> = Readonly<{
  cancel: () => void;
  draftValue: TValue;
  error: string | null;
  isDirty: boolean;
  mode: EditableFieldMode;
  permissionMessage?: string;
  save: () => Promise<boolean>;
  setDraftValue: (value: TValue) => void;
  setHovering: (hovering: boolean) => void;
  startEdit: () => void;
}>;

function resolveBaseMode(canView: boolean, canEdit: boolean, ownership: EditableFieldOwnership): EditableFieldMode {
  if (!canView) return "read-only";
  if (ownership === "readonly") return "read-only";
  if (!canEdit) return "permission-denied";
  return "display";
}

export function useEditableField<TValue>({
  autosave = false,
  autosaveDelayMs = 1200,
  canEdit = true,
  canView = true,
  onCancel,
  onSave,
  onWorkflowOpen,
  ownership = "entity",
  permissionMessage,
  validate,
  value,
}: UseEditableFieldOptions<TValue>): UseEditableFieldResult<TValue> {
  const [draftValue, setDraftValue] = useState(value);
  const [mode, setMode] = useState<EditableFieldMode>(() => resolveBaseMode(canView, canEdit, ownership));
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (mode === "editing" || mode === "saving" || mode === "success" || mode === "validation-error") {
      return;
    }
    setMode(isHovering ? "hover" : resolveBaseMode(canView, canEdit, ownership));
  }, [canEdit, canView, isHovering, mode, ownership]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const isDirty = draftValue !== value;

  const cancel = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setDraftValue(value);
    setError(null);
    setMode(resolveBaseMode(canView, canEdit, ownership));
    onCancel?.();
  }, [canEdit, canView, onCancel, ownership, value]);

  const save = useCallback(async () => {
    if (!canEdit || !canView) return false;
    if (isCrossEngineOwnership(ownership)) {
      onWorkflowOpen?.();
      return false;
    }

    const validationError = validate?.(draftValue) ?? null;
    if (validationError) {
      setError(validationError);
      setMode("validation-error");
      return false;
    }

    setMode("saving");
    setError(null);

    try {
      const savedValue = await onSave(draftValue);
      const nextValue = savedValue === undefined ? draftValue : savedValue;
      setDraftValue(nextValue);
      setMode("success");
      successTimerRef.current = setTimeout(() => {
        setMode(resolveBaseMode(canView, canEdit, ownership));
      }, 900);
      return true;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Could not save changes.";
      setError(message);
      setMode("validation-error");
      return false;
    }
  }, [canEdit, canView, draftValue, onSave, onWorkflowOpen, ownership, validate]);

  const scheduleAutosave = useCallback(() => {
    if (!autosave || !isDirectEditableOwnership(ownership) || !canEdit) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void save();
    }, autosaveDelayMs);
  }, [autosave, autosaveDelayMs, canEdit, ownership, save]);

  const setDraftValueWithAutosave = useCallback(
    (nextValue: TValue) => {
      setDraftValue(nextValue);
      if (mode === "validation-error") {
        setMode("editing");
        setError(null);
      }
      scheduleAutosave();
    },
    [mode, scheduleAutosave],
  );

  const startEdit = useCallback(() => {
    if (!canView || ownership === "readonly") return;
    if (!canEdit) {
      setMode("permission-denied");
      return;
    }
    if (isCrossEngineOwnership(ownership)) {
      onWorkflowOpen?.();
      return;
    }
    setDraftValue(value);
    setError(null);
    setMode("editing");
  }, [canEdit, canView, onWorkflowOpen, ownership, value]);

  const setHovering = useCallback(
    (hovering: boolean) => {
      if (mode === "editing" || mode === "saving" || mode === "success" || mode === "validation-error") {
        return;
      }
      setIsHovering(hovering);
    },
    [mode],
  );

  return {
    cancel,
    draftValue,
    error,
    isDirty,
    mode,
    permissionMessage,
    save,
    setDraftValue: setDraftValueWithAutosave,
    setHovering,
    startEdit,
  };
}

export function useEditableFieldKeyboard<TValue>(
  state: Pick<UseEditableFieldResult<TValue>, "cancel" | "mode" | "save">,
  options?: Readonly<{ saveOnEnter?: boolean }>,
) {
  const saveOnEnter = options?.saveOnEnter ?? true;
  const fieldId = useId();

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (state.mode !== "editing") return;
      if (event.key === "Escape") {
        event.preventDefault();
        state.cancel();
      }
      if (saveOnEnter && event.key === "Enter" && !event.shiftKey) {
        const target = event.target;
        if (target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        void state.save();
      }
    },
    [saveOnEnter, state],
  );

  return { fieldId, onKeyDown };
}

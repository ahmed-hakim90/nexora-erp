"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Pencil,
} from "lucide-react";

import { DatePicker, formatDisplayDate, parseIsoDate } from "../dates";
import { FieldErrorText, RequiredFieldMarker, fieldErrorId } from "../form";
import { Tooltip } from "../layout";
import { Button } from "../primitives";
import { useEnterpriseUi } from "../providers/enterprise-ui-context";
import { Checkbox, EntityLookup, Input, Select, Switch, type EntityLookupOption } from "../primitives";
import { cn } from "../utils";
import { useEditablePageContext } from "./editable-page-context";
import {
  useEditableField,
  useEditableFieldKeyboard,
  isCrossEngineOwnership,
  isDirectEditableOwnership,
  isReadonlyFieldOwnership,
  type EditableFieldEditorType,
  type EditableFieldOwnership,
  type UseEditableFieldOptions,
} from "./use-editable-field";

export type {
  EditableFieldEditorType,
  EditableFieldMode,
  EditableFieldOwnership,
} from "./use-editable-field";
export {
  isCrossEngineOwnership,
  isDirectEditableOwnership,
  isReadonlyFieldOwnership,
  useEditableField,
  useEditableFieldKeyboard,
} from "./use-editable-field";

type EditableFieldBaseProps<TValue> = Omit<UseEditableFieldOptions<TValue>, "onSave" | "value"> &
  Readonly<{
    className?: string;
    description?: string;
    editorType?: EditableFieldEditorType;
    emptyDisplay?: string;
    formatDisplay?: (value: TValue) => ReactNode;
    isRequired?: boolean;
    label: string;
    lookupOptions?: readonly EntityLookupOption[];
    lookupProviderKey?: string;
    name?: string;
    onFieldChange?: (value: TValue) => void;
    onSave?: (value: TValue) => Promise<TValue | void> | TValue | void;
    placeholder?: string;
    selectOptions?: readonly { value: string; label: string; disabled?: boolean }[];
    value: TValue;
  }>;

export function EditableField(props: EditableFieldBaseProps<string>): React.ReactElement;
export function EditableField<TValue>(props: EditableFieldBaseProps<TValue>): React.ReactElement;
export function EditableField<TValue>({
  autosave = false,
  autosaveDelayMs,
  canEdit = true,
  canView = true,
  className,
  description,
  editorType = "text",
  emptyDisplay = "—",
  formatDisplay,
  isRequired = false,
  label,
  lookupOptions,
  lookupProviderKey,
  name,
  onCancel,
  onFieldChange,
  onSave,
  onWorkflowOpen,
  ownership = "entity",
  permissionMessage = "You do not have permission to edit this field.",
  placeholder,
  selectOptions = [],
  validate,
  value,
}: EditableFieldBaseProps<TValue>) {
  const page = useEditablePageContext();
  const fieldName = name ?? label;
  const pageMode = page?.pageMode ?? "view";
  const isPageManaged = page !== null;

  if (isPageManaged) {
    return (
      <EditableFieldPageManaged
        canEdit={canEdit}
        canView={canView}
        className={className}
        description={description}
        editorType={editorType}
        emptyDisplay={emptyDisplay}
        fieldName={fieldName}
        formatDisplay={formatDisplay}
        isRequired={isRequired}
        label={label}
        lookupOptions={lookupOptions}
        lookupProviderKey={lookupProviderKey}
        ownership={ownership}
        permissionMessage={permissionMessage}
        placeholder={placeholder}
        selectOptions={selectOptions}
        value={value}
      />
    );
  }

  return (
    <EditableFieldLegacy
      autosave={autosave}
      autosaveDelayMs={autosaveDelayMs}
      canEdit={canEdit}
      canView={canView}
      className={className}
      description={description}
      editorType={editorType}
      emptyDisplay={emptyDisplay}
      fieldName={fieldName}
      formatDisplay={formatDisplay}
      isRequired={isRequired}
      label={label}
      lookupOptions={lookupOptions}
      lookupProviderKey={lookupProviderKey}
      onCancel={onCancel}
      onFieldChange={onFieldChange}
      onSave={onSave}
      onWorkflowOpen={onWorkflowOpen}
      ownership={ownership}
      pageMode={pageMode}
      permissionMessage={permissionMessage}
      placeholder={placeholder}
      selectOptions={selectOptions}
      validate={validate}
      value={value}
    />
  );
}

function EditableFieldPageManaged<TValue>({
  canEdit,
  canView,
  className,
  description,
  editorType,
  emptyDisplay,
  fieldName,
  formatDisplay,
  isRequired,
  label,
  lookupOptions,
  lookupProviderKey,
  ownership,
  permissionMessage,
  placeholder,
  selectOptions,
  value,
}: Readonly<{
  canEdit: boolean;
  canView: boolean;
  className?: string;
  description?: string;
  editorType: EditableFieldEditorType;
  emptyDisplay: string;
  fieldName: string;
  formatDisplay?: (value: TValue) => ReactNode;
  isRequired?: boolean;
  label: string;
  lookupOptions?: readonly EntityLookupOption[];
  lookupProviderKey?: string;
  ownership: EditableFieldOwnership;
  permissionMessage: string;
  placeholder?: string;
  selectOptions: readonly { value: string; label: string; disabled?: boolean }[];
  value: TValue;
}>) {
  const page = useEditablePageContext()!;
  const { dateFormat, locale } = useEnterpriseUi();
  const draftValue = page.draft[fieldName] ?? value;
  const isChanged = page.changedFields.has(fieldName);
  const error = page.errors[fieldName];
  const isEditing = page.pageMode === "edit" && isDirectEditableOwnership(ownership) && canEdit;
  const isCrossEngine = isCrossEngineOwnership(ownership);
  const isReadonly = isReadonlyFieldOwnership(ownership) || !canEdit;

  const displayValue = useMemo(() => {
    if (formatDisplay) return formatDisplay(draftValue as TValue);
    if (draftValue === null || draftValue === undefined || draftValue === "") return emptyDisplay;
    if (editorType === "date" || editorType === "datetime") {
      return formatDisplayDate(parseIsoDate(String(draftValue)), { dateFormat, locale }) || emptyDisplay;
    }
    if (editorType === "checkbox" || editorType === "switch") {
      return draftValue ? "Yes" : "No";
    }
    return String(draftValue);
  }, [dateFormat, draftValue, editorType, emptyDisplay, formatDisplay, locale]);

  return (
    <div
      className={cn(
        "group flex items-start justify-between gap-4 border-b py-2 text-sm last:border-b-0",
        isChanged && page.pageMode === "edit" && "border-s-2 border-s-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 ps-2",
        isReadonly && "opacity-80",
        className,
      )}
      data-editable-field-mode={page.pageMode}
      data-field-name={fieldName}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{label}</span>
          {isRequired ? <RequiredFieldMarker /> : null}
          {page.saveStatus === "saving" && isChanged ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
          {page.saveStatus === "saved" && isChanged ? (
            <CheckCircle2 aria-hidden className="size-3.5 text-[hsl(var(--success))]" />
          ) : null}
          {error ? <AlertCircle aria-hidden className="size-3.5 text-[hsl(var(--danger))]" /> : null}
          {!canEdit && canView ? (
            <Tooltip content={permissionMessage}>
              <Lock aria-hidden className="size-3.5 text-muted-foreground" />
            </Tooltip>
          ) : null}
          {isCrossEngine && canEdit ? (
            <Tooltip content="Opens workflow dialog on this page">
              <ExternalLink aria-hidden className="size-3.5 text-muted-foreground" />
            </Tooltip>
          ) : null}
        </div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {error ? <FieldErrorText id={fieldErrorId(fieldName)}>{error}</FieldErrorText> : null}
      </div>

      <div className="min-w-[12rem] flex-1 text-right">
        {isEditing ? (
          <EditableFieldEditor
            editorType={editorType}
            lookupOptions={lookupOptions}
            lookupProviderKey={lookupProviderKey}
            name={fieldName}
            pageMode
            placeholder={placeholder}
            selectOptions={selectOptions}
            value={draftValue}
            onChange={(nextValue) => page.setFieldValue(fieldName, nextValue)}
          />
        ) : isCrossEngine && page.pageMode === "edit" && canEdit ? (
          <div className="inline-flex w-full items-center justify-end gap-2">
            <span>{displayValue}</span>
            <Button onClick={() => page.openWorkflow(fieldName)} size="sm" type="button" variant="secondary">
              Change
            </Button>
          </div>
        ) : (
          <span className={cn("inline-flex w-full justify-end px-2 py-1", isReadonly && "text-muted-foreground")}>
            {displayValue}
          </span>
        )}
      </div>
    </div>
  );
}

function EditableFieldLegacy<TValue>({
  autosave,
  autosaveDelayMs,
  canEdit,
  canView,
  className,
  description,
  editorType,
  emptyDisplay,
  fieldName,
  formatDisplay,
  isRequired,
  label,
  lookupOptions,
  lookupProviderKey,
  onCancel,
  onFieldChange,
  onSave,
  onWorkflowOpen,
  ownership,
  permissionMessage,
  placeholder,
  selectOptions,
  validate,
  value,
}: Readonly<{
  autosave?: boolean;
  autosaveDelayMs?: number;
  canEdit: boolean;
  canView: boolean;
  className?: string;
  description?: string;
  editorType: EditableFieldEditorType;
  emptyDisplay: string;
  fieldName: string;
  formatDisplay?: (value: TValue) => ReactNode;
  isRequired?: boolean;
  label: string;
  lookupOptions?: readonly EntityLookupOption[];
  lookupProviderKey?: string;
  onCancel?: () => void;
  onFieldChange?: (value: TValue) => void;
  onSave?: (value: TValue) => Promise<TValue | void> | TValue | void;
  onWorkflowOpen?: () => void;
  ownership: EditableFieldOwnership;
  pageMode: "view" | "edit";
  permissionMessage: string;
  placeholder?: string;
  selectOptions: readonly { value: string; label: string; disabled?: boolean }[];
  validate?: (value: TValue) => string | null;
  value: TValue;
}>) {
  const { dateFormat, locale } = useEnterpriseUi();
  const state = useEditableField({
    autosave,
    autosaveDelayMs,
    canEdit,
    canView,
    onCancel,
    onSave: onSave ?? (async (nextValue) => {
      onFieldChange?.(nextValue);
      return nextValue;
    }),
    onWorkflowOpen,
    ownership,
    permissionMessage,
    validate,
    value,
  });
  const keyboard = useEditableFieldKeyboard(state);
  const displayValue = useMemo(() => {
    if (formatDisplay) return formatDisplay(state.draftValue);
    if (state.draftValue === null || state.draftValue === undefined || state.draftValue === "") {
      return emptyDisplay;
    }
    if (editorType === "date" || editorType === "datetime") {
      return formatDisplayDate(parseIsoDate(String(state.draftValue)), { dateFormat, locale }) || emptyDisplay;
    }
    if (editorType === "checkbox" || editorType === "switch") {
      return state.draftValue ? "Yes" : "No";
    }
    return String(state.draftValue);
  }, [dateFormat, editorType, emptyDisplay, formatDisplay, locale, state.draftValue]);

  const fieldOwnership: EditableFieldOwnership = ownership;
  const isInteractive =
    canView && !isReadonlyFieldOwnership(fieldOwnership) && (canEdit || isCrossEngineOwnership(fieldOwnership));
  const showEditAffordance =
    isInteractive &&
    !isReadonlyFieldOwnership(fieldOwnership) &&
    state.mode !== "editing" &&
    state.mode !== "saving" &&
    state.mode !== "permission-denied" &&
    state.mode !== "read-only";

  return (
    <div
      className={cn(
        "group flex items-start justify-between gap-4 border-b py-2 text-sm last:border-b-0",
        className,
      )}
      data-editable-field-mode={state.mode}
      data-field-name={fieldName}
      onKeyDown={keyboard.onKeyDown}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{label}</span>
          {isRequired ? <RequiredFieldMarker /> : null}
          {state.mode === "saving" ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
          {state.mode === "success" ? <CheckCircle2 aria-hidden className="size-3.5 text-[hsl(var(--success))]" /> : null}
          {state.mode === "validation-error" ? <AlertCircle aria-hidden className="size-3.5 text-[hsl(var(--danger))]" /> : null}
          {(state.mode === "permission-denied" || (!canEdit && canView)) ? (
            <Tooltip content={permissionMessage}>
              <Lock aria-hidden className="size-3.5 text-muted-foreground" />
            </Tooltip>
          ) : null}
          {isCrossEngineOwnership(fieldOwnership) && canEdit ? (
            <Tooltip content="Opens the owning workflow">
              <ExternalLink aria-hidden className="size-3.5 text-muted-foreground" />
            </Tooltip>
          ) : null}
        </div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {state.error ? <FieldErrorText id={fieldErrorId(fieldName)}>{state.error}</FieldErrorText> : null}
      </div>

      <div className="min-w-[12rem] flex-1 text-right">
        {state.mode === "editing" || state.mode === "saving" || state.mode === "validation-error" ? (
          <EditableFieldEditor
            disabled={state.mode === "saving"}
            editorType={editorType}
            lookupOptions={lookupOptions}
            lookupProviderKey={lookupProviderKey}
            name={fieldName}
            placeholder={placeholder}
            selectOptions={selectOptions}
            value={state.draftValue}
            onCancel={state.cancel}
            onChange={state.setDraftValue}
            onSave={() => void state.save()}
          />
        ) : (
          <button
            aria-label={isCrossEngineOwnership(fieldOwnership) ? `Open ${label} workflow` : `Edit ${label}`}
            className={cn(
              "inline-flex w-full items-center justify-end gap-2 rounded-md px-2 py-1 text-right transition-colors",
              showEditAffordance &&
                "hover:bg-[hsl(var(--muted))]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
              state.mode === "hover" && showEditAffordance && "bg-[hsl(var(--muted))]/45",
            )}
            disabled={!isInteractive}
            type="button"
            onBlur={() => state.setHovering(false)}
            onClick={state.startEdit}
            onFocus={() => state.setHovering(true)}
            onMouseEnter={() => state.setHovering(true)}
            onMouseLeave={() => state.setHovering(false)}
          >
            <span className={cn(!state.draftValue && "text-muted-foreground")}>{displayValue}</span>
            {showEditAffordance ? (
              <Pencil aria-hidden className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}

function EditableFieldEditor<TValue>({
  disabled,
  editorType,
  lookupOptions,
  lookupProviderKey,
  name,
  onCancel,
  onChange,
  onSave,
  pageMode = false,
  placeholder,
  selectOptions,
  value,
}: Readonly<{
  disabled?: boolean;
  editorType: EditableFieldEditorType;
  lookupOptions?: readonly EntityLookupOption[];
  lookupProviderKey?: string;
  name?: string;
  onCancel?: () => void;
  onChange: (value: TValue) => void;
  onSave?: () => void;
  pageMode?: boolean;
  placeholder?: string;
  selectOptions: readonly { value: string; label: string; disabled?: boolean }[];
  value: TValue;
}>) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  const inputClassName =
    "h-9 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]";

  if (editorType === "entity-lookup") {
    if (lookupProviderKey) {
      return (
        <EntityLookup
          disabled={disabled}
          label={placeholder ?? "Select"}
          name={name}
          providerKey={lookupProviderKey}
          value={stringValue}
          onValueChange={(nextValue) => onChange(nextValue as TValue)}
        />
      );
    }
    return (
      <EntityLookup
        disabled={disabled}
        label={placeholder ?? "Select"}
        name={name}
        options={lookupOptions ?? []}
        value={stringValue}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      />
    );
  }

  if (editorType === "date" || editorType === "datetime") {
    return (
      <DatePicker
        disabled={disabled}
        mode={editorType === "datetime" ? "datetime" : "single"}
        name={name}
        value={stringValue}
        onValueChange={(nextValue) => onChange((nextValue ?? "") as TValue)}
      />
    );
  }

  if (editorType === "select") {
    return (
      <Select
        options={selectOptions}
        placeholder={placeholder ?? "Select…"}
        value={stringValue}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      />
    );
  }

  if (editorType === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(value)}
        label={placeholder}
        onCheckedChange={(checked) => onChange(checked as TValue)}
      />
    );
  }

  if (editorType === "switch") {
    return (
      <Switch
        checked={Boolean(value)}
        label={placeholder}
        onCheckedChange={(checked) => onChange(checked as TValue)}
      />
    );
  }

  if (editorType === "textarea" || editorType === "rich-text" || editorType === "address") {
    return (
      <div className="space-y-2">
        <textarea
          className={cn(inputClassName, "min-h-20 py-2")}
          disabled={disabled}
          name={name}
          placeholder={placeholder}
          value={stringValue}
          onChange={(event) => onChange(event.target.value as TValue)}
        />
        {!pageMode && onCancel && onSave ? <EditorActions disabled={disabled} onCancel={onCancel} onSave={onSave} /> : null}
      </div>
    );
  }

  if (editorType === "avatar" || editorType === "signature" || editorType === "files") {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Use the platform {editorType} workflow for this field.
      </div>
    );
  }

  const inputType =
    editorType === "number" || editorType === "currency" || editorType === "percentage"
      ? "number"
      : editorType === "email"
        ? "email"
        : editorType === "phone"
          ? "tel"
          : "text";

  return (
    <div className="space-y-2">
      <Input
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        type={inputType}
        value={stringValue}
        onChange={(event) => onChange(event.target.value as TValue)}
      />
      {!pageMode && onCancel && onSave ? <EditorActions disabled={disabled} onCancel={onCancel} onSave={onSave} /> : null}
    </div>
  );
}

function EditorActions({
  disabled,
  onCancel,
  onSave,
}: Readonly<{
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
}>) {
  return (
    <div className="flex justify-end gap-2">
      <button
        className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-[hsl(var(--muted))]"
        disabled={disabled}
        type="button"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        className="rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-2 py-1 text-xs text-[hsl(var(--accent-foreground))]"
        disabled={disabled}
        type="button"
        onClick={onSave}
      >
        Save
      </button>
    </div>
  );
}

export function EditableFieldGrid({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("divide-y rounded-md border px-3", className)}>{children}</div>;
}

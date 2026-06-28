"use client";

import type { ComponentPropsWithoutRef, FocusEvent, FormEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

import { Tooltip } from "../layout";
import { Button } from "../primitives";
import { cn } from "../utils";

export type PlatformFormFieldRule = Readonly<{
  name: string;
  label: string;
  required?: boolean;
  requiredMessage?: string;
  serverAliases?: readonly string[];
  validate?: (value: string, formData: FormData) => string | null;
  warning?: (value: string, formData: FormData) => string | null;
}>;

export type PlatformFieldIssue = Readonly<{
  fieldName: string;
  kind?: "invalid" | "required" | "server";
  label: string;
  message: string;
}>;

export type PlatformFieldWarning = Readonly<{
  fieldName: string;
  message: string;
}>;

export type PlatformFormValidationState = Readonly<{
  allErrorList: readonly PlatformFieldIssue[];
  allErrors: Readonly<Record<string, string>>;
  allWarningList: readonly PlatformFieldWarning[];
  allWarnings: Readonly<Record<string, string>>;
  errors: Readonly<Record<string, string>>;
  warnings: Readonly<Record<string, string>>;
  errorList: readonly PlatformFieldIssue[];
  warningList: readonly PlatformFieldWarning[];
  hasValidationAttempted: boolean;
  isValid: boolean;
  missingRequiredCount: number;
  saveDisabledReason?: string;
}>;

const TECHNICAL_FIELD_LABELS: Readonly<Record<string, string>> = {
  actualQuantity: "Actual Quantity",
  actual_quantity: "Actual Quantity",
  accountTypeId: "Account Type",
  account_type_id: "Account Type",
  baseUomId: "Base UOM",
  base_uom_id: "Base UOM",
  componentProductId: "Component Product",
  component_product_id: "Component Product",
  fiscalPeriodId: "Fiscal Period",
  fiscal_period_id: "Fiscal Period",
  fiscalYearId: "Fiscal Year",
  fiscal_year_id: "Fiscal Year",
  locationId: "Location",
  location_id: "Location",
  manufacturingProductId: "Product",
  manufacturing_product_id: "Product",
  operationId: "Operation",
  operation_id: "Operation",
  parentAccountId: "Parent Account",
  parent_account_id: "Parent Account",
  productCategoryId: "Category",
  product_category_id: "Category",
  productId: "Product",
  product_id: "Product",
  productionLineId: "Production Line",
  production_line_id: "Production Line",
  reportDate: "Report Date",
  report_date: "Report Date",
  reportKey: "Report Key",
  report_key: "Report Key",
  shiftKey: "Shift",
  shift_key: "Shift",
  supervisorRefId: "Supervisor",
  supervisor_ref_id: "Supervisor",
  unitId: "UOM",
  unit_id: "UOM",
  warehouseId: "Warehouse",
  warehouse_id: "Warehouse",
  workCenterId: "Work Center",
  work_center_id: "Work Center",
  workstationId: "Workstation",
  workstation_id: "Workstation",
  workerOutputActualQuantity: "Worker Actual Quantity",
  workerOutputNotes: "Worker Notes",
  workerOutputTargetQuantity: "Worker Target Quantity",
  workerOutputWorkerRefId: "Worker",
  worker_output: "Worker Output",
  workerOutputJson: "Worker Output",
};

export const ServerErrorMapper = {
  labelFor(name: string, fields: readonly PlatformFormFieldRule[] = []) {
    return labelForField(name, fields);
  },
  mapMessage(message: string, fields: readonly PlatformFormFieldRule[] = []) {
    return mapTechnicalErrorMessage(message, fields);
  },
  issueFromError(error: unknown, fields: readonly PlatformFormFieldRule[] = []): PlatformFieldIssue {
    const rawMessage = error instanceof Error ? error.message : "Could not save the record.";
    const message = mapTechnicalErrorMessage(rawMessage, fields);
    const field = fields.find((rule) => message.toLowerCase().includes(rule.label.toLowerCase()));
    return {
      fieldName: field?.name ?? "__server",
      label: field?.label ?? "Save",
      message,
    };
  },
};

export function usePlatformFormValidation({
  fields,
  formRef,
}: Readonly<{
  fields: readonly PlatformFormFieldRule[];
  formRef: RefObject<HTMLFormElement | null>;
}>) {
  const [state, setState] = useState(() => buildValidationState(initialRequiredIssues(fields), []));
  const [visibleFieldNames, setVisibleFieldNames] = useState<ReadonlySet<string>>(() => new Set());
  const [hasValidationAttempted, setHasValidationAttempted] = useState(false);

  const validateForm = useCallback((options?: Readonly<{
    changedFieldName?: string;
    focusFirstInvalid?: boolean;
    revealAll?: boolean;
    touchedFieldName?: string;
  }>) => {
    const form = formRef.current;
    const issues: PlatformFieldIssue[] = [];
    const warnings: PlatformFieldWarning[] = [];
    if (!form) {
      const nextState = buildValidationState(issues, warnings);
      setState(nextState);
      return nextState;
    }

    const formData = new FormData(form);
    for (const field of fields) {
      const value = String(formData.get(field.name) ?? "").trim();
      if (field.required && value.length === 0) {
        issues.push({
          fieldName: field.name,
          kind: "required",
          label: field.label,
          message: field.requiredMessage ?? `${field.label} is required.`,
        });
        continue;
      }

      const control = form.elements.namedItem(field.name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if (!control.validity.valid) {
          issues.push({
            fieldName: field.name,
            kind: control.validity.valueMissing ? "required" : "invalid",
            label: field.label,
            message: readableValidityMessage(field.label, control),
          });
          continue;
        }
      }

      const customIssue = field.validate?.(value, formData);
      if (customIssue) {
        issues.push({ fieldName: field.name, kind: "invalid", label: field.label, message: customIssue });
      }

      const warning = field.warning?.(value, formData);
      if (warning) {
        warnings.push({ fieldName: field.name, message: warning });
      }
    }

    const nextState = buildValidationState(issues, warnings);
    setState(nextState);
    const nextVisibleFields = new Set<string>();
    if (options?.focusFirstInvalid || options?.revealAll) {
      for (const field of fields) nextVisibleFields.add(field.name);
      setHasValidationAttempted(true);
    }
    if (options?.touchedFieldName) nextVisibleFields.add(options.touchedFieldName);
    if (options?.changedFieldName && issues.some((issue) => issue.fieldName === options.changedFieldName)) {
      nextVisibleFields.add(options.changedFieldName);
    }
    if (nextVisibleFields.size > 0) {
      setVisibleFieldNames((current) => new Set([...current, ...nextVisibleFields]));
    }
    if (options?.focusFirstInvalid) focusField(form, issues[0]?.fieldName);
    return nextState;
  }, [fields, formRef]);

  const setServerError = useCallback((error: unknown) => {
    const issue = { ...ServerErrorMapper.issueFromError(error, fields), kind: "server" as const };
    setState((current) => buildValidationState([...current.errorList.filter((item) => item.fieldName !== issue.fieldName), issue], current.warningList));
    setVisibleFieldNames((current) => new Set([...current, issue.fieldName]));
    setHasValidationAttempted(true);
    return issue;
  }, [fields]);

  const validateOnBlur = useCallback((event: FocusEvent<HTMLFormElement>) => {
    validateForm({ touchedFieldName: fieldNameFromEventTarget(event.target) });
  }, [validateForm]);

  const validateOnInput = useCallback((event: FormEvent<HTMLFormElement>) => {
    validateForm({ changedFieldName: fieldNameFromEventTarget(event.target) });
  }, [validateForm]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => validateForm());
    return () => window.cancelAnimationFrame(frame);
  }, [validateForm]);

  return useMemo<PlatformFormValidationState & {
    fieldProps: (fieldName: string) => Pick<ComponentPropsWithoutRef<"input">, "aria-describedby" | "aria-invalid">;
    setServerError: typeof setServerError;
    validateForm: typeof validateForm;
    validateOnBlur: typeof validateOnBlur;
    validateOnInput: typeof validateOnInput;
  }>(() => {
    const visibleErrorList = state.errorList.filter((issue) => hasValidationAttempted || visibleFieldNames.has(issue.fieldName));
    const visibleWarningList = state.warningList.filter((warning) => visibleFieldNames.has(warning.fieldName));
    const visibleErrors = Object.fromEntries(visibleErrorList.map((issue) => [issue.fieldName, issue.message]));
    const visibleWarnings = Object.fromEntries(visibleWarningList.map((warning) => [warning.fieldName, warning.message]));

    return {
      ...state,
      allErrorList: state.errorList,
      allErrors: state.errors,
      allWarningList: state.warningList,
      allWarnings: state.warnings,
      errorList: visibleErrorList,
      errors: visibleErrors,
      hasValidationAttempted,
      warningList: visibleWarningList,
      warnings: visibleWarnings,
      fieldProps: (fieldName: string) => fieldA11yProps(fieldName, visibleErrors[fieldName]),
      setServerError,
      validateForm,
      validateOnBlur,
      validateOnInput,
    };
  }, [hasValidationAttempted, setServerError, state, validateForm, validateOnBlur, validateOnInput, visibleFieldNames]);
}

export function FormErrorSummary({
  errors,
}: Readonly<{
  errors: readonly PlatformFieldIssue[];
}>) {
  if (errors.length === 0) return null;

  return (
    <section className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-3" role="alert">
      <p className="text-sm font-medium text-[hsl(var(--danger))]">
        {errors.length} {errors.length === 1 ? "field needs" : "fields need"} your attention.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[hsl(var(--danger))]">
        {errors.map((error) => (
          <li key={`${error.fieldName}-${error.message}`}>
            <button className="text-start underline-offset-2 hover:underline" onClick={() => focusNamedField(error.fieldName)} type="button">
              {error.message}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FieldErrorText({
  children,
  id,
}: Readonly<{
  children?: ReactNode;
  id: string;
}>) {
  if (!children) return null;
  return (
    <p className="text-xs text-[hsl(var(--danger))]" id={id} role="alert">
      {children}
    </p>
  );
}

export function FieldWarningText({
  children,
  id,
}: Readonly<{
  children?: ReactNode;
  id: string;
}>) {
  if (!children) return null;
  return (
    <p className="text-xs text-[hsl(var(--warning))]" id={id}>
      {children}
    </p>
  );
}

export function RequiredFieldMarker() {
  return <span aria-hidden className="ms-1 text-[hsl(var(--danger))]">*</span>;
}

export function ValidationStatusBadge({
  errorCount = 0,
  isValid,
  show,
}: Readonly<{
  errorCount?: number;
  isValid: boolean;
  show?: boolean;
}>) {
  if (!show) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", isValid ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]")}>
      {isValid ? <CheckCircle2 aria-hidden className="size-3" /> : <AlertCircle aria-hidden className="size-3" />}
      {isValid ? "Valid" : errorCount > 1 ? `${errorCount} missing` : "Invalid"}
    </span>
  );
}

export function SaveButtonWithReason({
  allowDisabledAttempt,
  disabledReason,
  isLoading,
  label = "Save",
  onClick,
}: Readonly<{
  allowDisabledAttempt?: boolean;
  disabledReason?: ReactNode;
  isLoading?: boolean;
  label?: string;
  onClick: () => void;
}>) {
  const disabled = Boolean(disabledReason) || Boolean(isLoading);
  const nativeDisabled = Boolean(isLoading) || (Boolean(disabledReason) && !allowDisabledAttempt);
  return (
    <Tooltip content={disabledReason ?? label}>
      <Button
        aria-label={label}
        aria-disabled={disabled || undefined}
        aria-busy={isLoading || undefined}
        className={cn(
          "size-9 rounded-xl border-[hsl(var(--accent))] bg-[hsl(var(--accent))] p-0 text-[hsl(var(--accent-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary-600))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2",
          disabled && "opacity-50",
          disabled && allowDisabledAttempt && "cursor-not-allowed hover:bg-[hsl(var(--accent))]",
        )}
        disabled={nativeDisabled}
        onClick={onClick}
        type="button"
      >
        <Save aria-hidden className={cn("size-4", isLoading && "animate-pulse")} />
      </Button>
    </Tooltip>
  );
}

export function UnsavedChangesGuard() {
  return null;
}

export function fieldA11yProps(fieldName: string, error?: string): Pick<ComponentPropsWithoutRef<"input">, "aria-describedby" | "aria-invalid"> {
  return {
    "aria-describedby": error ? fieldErrorId(fieldName) : undefined,
    "aria-invalid": Boolean(error) || undefined,
  };
}

export function fieldErrorId(fieldName: string) {
  return `${fieldName}-error`;
}

export function mapTechnicalErrorMessage(message: string, fields: readonly PlatformFormFieldRule[] = []) {
  let readable = message;
  const replacements = new Map<string, string>();
  for (const [technicalName, label] of Object.entries(TECHNICAL_FIELD_LABELS)) {
    replacements.set(technicalName, label);
  }
  for (const field of fields) {
    replacements.set(field.name, field.label);
    for (const alias of field.serverAliases ?? []) replacements.set(alias, field.label);
  }

  for (const [technicalName, label] of [...replacements.entries()].sort((a, b) => b[0].length - a[0].length)) {
    readable = readable.replaceAll(technicalName, label);
  }

  return readable
    .replace(/_/gu, " ")
    .replace(/\b(uuid|json|zod)\b/giu, "value")
    .replace(/\s+/gu, " ")
    .trim();
}

function buildValidationState(issues: readonly PlatformFieldIssue[], warnings: readonly PlatformFieldWarning[]): PlatformFormValidationState {
  const missingRequiredCount = issues.filter((issue) => issue.kind === "required").length;
  return {
    allErrorList: issues,
    allErrors: Object.fromEntries(issues.map((issue) => [issue.fieldName, issue.message])),
    allWarningList: warnings,
    allWarnings: Object.fromEntries(warnings.map((warning) => [warning.fieldName, warning.message])),
    errorList: issues,
    errors: Object.fromEntries(issues.map((issue) => [issue.fieldName, issue.message])),
    hasValidationAttempted: false,
    isValid: issues.length === 0,
    missingRequiredCount,
    saveDisabledReason: saveDisabledReason(missingRequiredCount, issues.length),
    warningList: warnings,
    warnings: Object.fromEntries(warnings.map((warning) => [warning.fieldName, warning.message])),
  };
}

function initialRequiredIssues(fields: readonly PlatformFormFieldRule[]): readonly PlatformFieldIssue[] {
  return fields
    .filter((field) => field.required)
    .map((field) => ({
      fieldName: field.name,
      kind: "required" as const,
      label: field.label,
      message: field.requiredMessage ?? `${field.label} is required.`,
    }));
}

function labelForField(name: string, fields: readonly PlatformFormFieldRule[]) {
  return fields.find((field) => field.name === name || field.serverAliases?.includes(name))?.label ?? TECHNICAL_FIELD_LABELS[name] ?? humanizeFieldName(name);
}

function humanizeFieldName(name: string) {
  return name
    .replace(/_/gu, " ")
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function readableValidityMessage(label: string, control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (control.validity.valueMissing) return `${label} is required.`;
  if (control.validity.rangeUnderflow) return `${label} is below the allowed minimum.`;
  if (control.validity.rangeOverflow) return `${label} is above the allowed maximum.`;
  if (control.validity.typeMismatch) return `${label} must use a valid format.`;
  if (control.validity.patternMismatch) return `${label} must use the required format.`;
  return `${label} needs a valid value.`;
}

function saveDisabledReason(missingRequiredCount: number, errorCount: number) {
  if (missingRequiredCount > 1) return `${missingRequiredCount} required fields are missing.`;
  if (missingRequiredCount === 1) return "Complete required fields before saving.";
  if (errorCount > 0) return "Fix validation errors before saving.";
  return undefined;
}

function fieldNameFromEventTarget(target: EventTarget | null) {
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
    return target.name || undefined;
  }
  if (target instanceof HTMLElement) {
    return target.closest<HTMLElement>("[data-field-name]")?.dataset.fieldName;
  }
  return undefined;
}

function focusField(form: HTMLFormElement, fieldName?: string) {
  if (!fieldName) return;
  const field = form.elements.namedItem(fieldName);
  if (field instanceof RadioNodeList) {
    const firstField = Array.from(field).find((item) => item instanceof HTMLElement);
    if (firstField instanceof HTMLElement) firstField.focus();
    return;
  }
  if (field instanceof HTMLElement) field.focus();
}

function focusNamedField(fieldName: string) {
  const field = document.querySelector(`[name="${CSS.escape(fieldName)}"]`);
  if (field instanceof HTMLElement) field.focus();
}

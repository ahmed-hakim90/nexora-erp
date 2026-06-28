"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, MoreHorizontal } from "lucide-react";

import {
  AuditActivityTimeline,
  Button,
  DropdownMenu,
  FieldErrorText,
  PanelIconButton,
  PanelToolbarGroup,
  RecordFormDialog,
  RecordFormSection,
  RequiredFieldMarker,
  SaveAuditMetadata,
  SaveButtonWithReason,
  SaveStatusIndicator,
  ValidationStatusBadge,
  buildRecordActivityEvents,
  cn,
  fieldA11yProps,
  fieldErrorId,
  type PlatformFormFieldRule,
  type RecordAuditMetadata,
  type RecordSaveStatus,
  usePlatformFormValidation,
} from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";
import { platform } from "@/platform/client";
import type { FinanceFieldDescriptor } from "@/features/finance/public-api";
import { archiveFinanceRecordAction, createFinanceRecordAction, updateFinanceRecordAction } from "@/features/finance/routes/actions/finance.actions";

export type FinanceRelationOptions = Readonly<Record<string, readonly { value: string; label: string }[]>>;

type FinanceEntityDrawerProps = Readonly<{ entityKey: string; singular: string; fields: readonly FinanceFieldDescriptor[]; relationOptions?: FinanceRelationOptions; mode: "create" | "edit"; record?: Record<string, unknown>; recordId?: string; triggerLabel?: string; triggerVariant?: "primary" | "secondary" | "ghost"; triggerSize?: "sm" | "md"; autoOpen?: boolean; closeHref?: string; trigger?: ReactNode }>;
type SaveIntent = "Save" | "SaveNew" | "SaveClose";

function defaultValueFor(field: FinanceFieldDescriptor, record?: Record<string, unknown>): string {
  const value = record?.[field.name];
  if (value === null || value === undefined) return "";
  if (field.type === "tags" && Array.isArray(value)) return value.join(", ");
  if (field.type === "date" && typeof value === "string") return value.slice(0, 10);
  return String(value);
}

function FieldControl({ error, field, inputId, record, relationOptions }: Readonly<{ error?: string; field: FinanceFieldDescriptor; inputId: string; record?: Record<string, unknown>; relationOptions?: FinanceRelationOptions }>) {
  const inputClassName = cn("h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]", error && "border-[hsl(var(--danger))]");
  const defaultValue = defaultValueFor(field, record);
  const options = relationOptions?.[field.name];
  if (field.autoCode) return <><input name={field.name} type="hidden" value={defaultValue} /><input className={cn(inputClassName, "bg-[hsl(var(--muted))] text-muted-foreground")} id={inputId} readOnly type="text" value={defaultValue ? displayBusinessCode(defaultValue, field.autoCode) : "Auto-generated on save"} /></>;
  if (field.type === "checkbox") return <><input name={field.name} type="hidden" value="false" /><input {...fieldA11yProps(field.name, error)} className="size-4 rounded border" defaultChecked={record?.[field.name] === true} id={inputId} name={field.name} type="checkbox" value="true" /></>;
  if (field.type === "textarea") return <textarea {...fieldA11yProps(field.name, error)} className={cn("min-h-20 w-full rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue} id={inputId} name={field.name} required={field.required} />;
  if (field.type === "select" || options !== undefined) {
    const selectOptions = options ?? field.options ?? [];
    return <select {...fieldA11yProps(field.name, error)} className={inputClassName} defaultValue={defaultValue} disabled={field.required && selectOptions.length === 0} id={inputId} name={field.name} required={field.required}><option value="">{selectOptions.length === 0 ? "Create related records first" : field.required ? "Select..." : "-"}</option>{selectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  }
  if (field.type === "number") return <input {...fieldA11yProps(field.name, error)} className={inputClassName} defaultValue={defaultValue} id={inputId} max={field.max} min={field.min} name={field.name} required={field.required} step={field.step ?? "1"} type="number" />;
  return <input {...fieldA11yProps(field.name, error)} className={inputClassName} defaultValue={defaultValue} id={inputId} name={field.name} required={field.required} type={field.type === "date" ? "date" : "text"} />;
}

export function FinanceEntityDrawer(props: FinanceEntityDrawerProps) {
  const { autoOpen, closeHref, mode, trigger, triggerLabel, triggerSize = "md", triggerVariant = mode === "create" ? "primary" : "ghost" } = props;
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const title = mode === "create" ? `Create ${props.singular}` : `Edit ${props.singular}`;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  const defaultTrigger = triggerLabel ? <Button size={triggerSize} type="button" variant={triggerVariant}>{triggerLabel}</Button> : undefined;

  return <FinanceEntityModal {...props} onOpenChange={handleOpenChange} open={open} title={title} trigger={autoOpen ? undefined : trigger ?? defaultTrigger} />;
}

function FinanceEntityModal({ entityKey, singular, fields, relationOptions, mode, record, recordId, onOpenChange, open, title, trigger }: Omit<FinanceEntityDrawerProps, "autoOpen" | "closeHref" | "triggerLabel" | "triggerVariant" | "triggerSize"> & Readonly<{ onOpenChange: (open: boolean) => void; open: boolean; title: string; trigger?: ReactNode }>) {
  const router = useRouter();
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<RecordSaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [savedRecord, setSavedRecord] = useState<Record<string, unknown> | undefined>(record);
  const [isPending, startTransition] = useTransition();
  const localDraftKey = `nexora.modalDraft.finance.${entityKey}.${mode}.${recordId ?? "new"}`;
  const validationRules = useMemo<readonly PlatformFormFieldRule[]>(() => fields.map((field) => ({ label: field.label, name: field.name, required: field.autoCode ? false : field.required, serverAliases: [field.column] })), [fields]);
  const validation = usePlatformFormValidation({ fields: validationRules, formRef });
  const auditMetadata = toAuditMetadata(savedRecord);
  const lifecycleStatus = savedRecord?.status ?? record?.status;
  const lifecycleBlocksEditing = lifecycleStatus === "locked" || lifecycleStatus === "archived";
  const saveBlockedByValidation = !validation.isValid;
  const nonValidationSaveDisabledReason = isPending ? "Save is already in progress." : lifecycleBlocksEditing ? "This finance record lifecycle status does not allow editing." : undefined;
  const saveDisabledReason = nonValidationSaveDisabledReason ?? validation.saveDisabledReason;

  useEffect(() => {
    if (!window.localStorage.getItem(localDraftKey)) return undefined;
    const frame = window.requestAnimationFrame(() => restoreLocalDraft());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey]);

  function persistLocalDraft() { const form = formRef.current; if (!form) return; window.localStorage.setItem(localDraftKey, JSON.stringify([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]))); }
  function restoreLocalDraft() { const form = formRef.current; const raw = window.localStorage.getItem(localDraftKey); if (!form || !raw) return; for (const [key, value] of JSON.parse(raw) as [string, string][]) { const field = form.elements.namedItem(key); if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.value = value; } setSaveStatus("dirty"); setIsDirty(true); window.requestAnimationFrame(() => validation.validateForm()); }
  function resetChanges() { formRef.current?.reset(); setError(null); setSaveStatus("idle"); setIsDirty(false); }

  function handleSubmit(intent: SaveIntent) {
    const form = formRef.current;
    if (!form) return;
    setError(null);
    const validationState = validation.validateForm({ focusFirstInvalid: true, revealAll: true });
    if (!validationState.isValid) { setSaveStatus("dirty"); platform.feedback.error(`${singular} form needs attention`, { description: validationState.errorList[0]?.message ?? validation.saveDisabledReason ?? "Fix validation errors before saving.", source: "runtime" }); return; }
    if (nonValidationSaveDisabledReason) return;
    const formData = new FormData(form);
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const saved = mode === "create" ? await createFinanceRecordAction(entityKey, formData) : recordId ? await updateFinanceRecordAction(entityKey, recordId, formData) : undefined;
        if (saved) setSavedRecord(saved);
        setSaveStatus("saved"); setIsDirty(false); window.localStorage.removeItem(localDraftKey);
        platform.feedback.success(`${singular} saved`, { entity: { id: saved?.id ? String(saved.id) : recordId, label: String(saved?.name ?? saved?.accountCode ?? singular), type: entityKey }, source: "runtime" });
        router.refresh();
        if (intent === "SaveNew") { form.reset(); setSavedRecord(undefined); }
        if (intent === "SaveClose") onOpenChange(false);
      } catch (submitError) { const issue = validation.setServerError(submitError); setError(issue.fieldName === "__server" ? issue.message : null); setSaveStatus("failed"); platform.feedback.error(`${singular} save failed`, { description: issue.message, source: "runtime" }); }
    });
  }

  function archiveRecord() { if (!recordId) return; setSaveStatus("saving"); startTransition(async () => { try { await archiveFinanceRecordAction(entityKey, recordId); platform.feedback.success(`${singular} archived`, { entity: { id: recordId, label: String(savedRecord?.name ?? savedRecord?.accountCode ?? singular), type: entityKey }, source: "runtime" }); onOpenChange(false); router.refresh(); } catch (archiveError) { const message = archiveError instanceof Error ? archiveError.message : "Could not archive the record."; setError(message); setSaveStatus("failed"); platform.feedback.error(`${singular} archive failed`, { description: message, source: "runtime" }); } }); }

  const actionControls = <><PanelToolbarGroup><SaveButtonWithReason allowDisabledAttempt={saveBlockedByValidation} disabledReason={saveDisabledReason} isLoading={isPending && saveStatus === "saving"} label="Save" onClick={() => handleSubmit("Save")} /><PanelIconButton aria-disabled={Boolean(saveDisabledReason) || undefined} className={saveBlockedByValidation ? "opacity-50" : undefined} disabled={Boolean(nonValidationSaveDisabledReason)} label="Save and create another" onClick={() => handleSubmit("SaveNew")} tooltip={saveDisabledReason ?? "Save and create another"}><FilePlus2 aria-hidden className="size-4" /></PanelIconButton></PanelToolbarGroup><DropdownMenu align="end" items={[{ key: "save-close", label: "Save and close", onSelect: () => handleSubmit("SaveClose"), disabled: isPending }, { key: "archive", label: "Archive record", onSelect: archiveRecord, disabled: mode !== "edit" || isPending }, { key: "duplicate", label: "Duplicate", disabled: true }, { key: "restore-draft", label: "Restore local draft", onSelect: restoreLocalDraft }, { key: "discard-draft", label: "Discard local draft", onSelect: () => window.localStorage.removeItem(localDraftKey) }, { key: "reset", label: "Reset changes", onSelect: resetChanges }]} trigger={<PanelIconButton label="More actions" tooltip="More actions"><MoreHorizontal aria-hidden className="size-4" /></PanelIconButton>} /></>;
  const statusBadge = <StatusBadge value={savedRecord?.status ?? savedRecord?.isActive ?? (mode === "create" ? "new" : undefined)} />;

  return <RecordFormDialog actions={actionControls} auditMetadata={<div className="space-y-2"><SaveStatusIndicator status={saveStatus} /><SaveAuditMetadata metadata={auditMetadata} /></div>} isDirty={isDirty} onOpenChange={onOpenChange} open={open} status={<>{statusBadge}<ValidationStatusBadge errorCount={validation.allErrorList.length} isValid={validation.isValid} show={validation.hasValidationAttempted} /></>} subtitle={`Create or update ${singular.toLowerCase()} details in the current finance page.`} title={title} trigger={trigger}><div className="space-y-[var(--floating-panel-section-gap)]"><RecordFormSection><form className="space-y-4" id={formId} onBlur={validation.validateOnBlur} onInput={(event) => { setSaveStatus("dirty"); setIsDirty(true); persistLocalDraft(); validation.validateOnInput(event); }} ref={formRef}><div className="space-y-4">{fields.map((field) => <div className="space-y-1.5" key={field.name}><label className="text-sm font-medium" htmlFor={`${formId}-${field.name}`}>{field.label}{field.required ? <RequiredFieldMarker /> : null}</label><FieldControl error={validation.errors[field.name]} field={field} inputId={`${formId}-${field.name}`} record={record} relationOptions={relationOptions} /><FieldErrorText id={fieldErrorId(field.name)}>{validation.errors[field.name]}</FieldErrorText>{field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}</div>)}</div></form></RecordFormSection>{error ? <p className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 px-3 py-2 text-sm text-[hsl(var(--danger))]" role="alert">{error}</p> : null}<RecordFormSection><h3 className="text-sm font-medium">Audit / Activity</h3><AuditActivityTimeline events={auditMetadata ? buildRecordActivityEvents(auditMetadata) : []} /></RecordFormSection></div></RecordFormDialog>;
}

function StatusBadge({ value }: Readonly<{ value: unknown }>) { const label = value === undefined || value === null ? "new" : typeof value === "boolean" ? (value ? "active" : "inactive") : String(value); return <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{label}</span>; }
function toAuditMetadata(record?: Record<string, unknown>): RecordAuditMetadata | null { if (!record) return null; const status = typeof record.status === "string" ? record.status : typeof record.isActive === "boolean" ? record.isActive : null; return { createdAt: typeof record.createdAt === "string" ? record.createdAt : null, createdBy: typeof record.createdBy === "string" ? record.createdBy : null, status, updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null, updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : null, version: typeof record.version === "string" || typeof record.version === "number" ? record.version : null }; }

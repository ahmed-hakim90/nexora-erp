"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FilePlus2, MoreHorizontal } from "lucide-react";

import {
  AuditActivityTimeline,
  DropdownMenu,
  EntityLookup,
  FieldErrorText,
  FieldWarningText,
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
import { archiveManufacturingDailyReportAction, createManufacturingDailyReportAction, updateManufacturingDailyReportAction } from "@/features/manufacturing/routes/actions/daily-reports.actions";
import type { ManufacturingDailyReportRecord, ManufacturingDailyReportWorkspaceData } from "@/features/manufacturing/routes/loaders/daily-reports.loader";

const statusOptions = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"] as const;
const reportCodeConfig = { prefix: "DPR", scope: "branch" } as const;
const dailyReportFieldRules: readonly PlatformFormFieldRule[] = [
  { label: "Report Code", name: "reportKey", serverAliases: ["report_key"] },
  { label: "Report Date", name: "reportDate", required: true, serverAliases: ["report_date"] },
  { label: "Shift", name: "shiftKey", required: true, serverAliases: ["shift_key"] },
  { label: "Product", name: "manufacturingProductId", required: true, serverAliases: ["manufacturing_product_id"] },
  { label: "Production Line", name: "productionLineId", required: true, serverAliases: ["production_line_id"] },
  { label: "Planned Quantity", name: "plannedQuantity", required: true, serverAliases: ["planned_quantity"] },
  { label: "Actual Quantity", name: "actualQuantity", required: true, serverAliases: ["actual_quantity"], warning: (value, formData) => Number(formData.get("plannedQuantity") || 0) > 0 && Number(value || 0) < Number(formData.get("plannedQuantity") || 0) ? "Actual quantity is below planned quantity." : null },
  { label: "Scrap Quantity", name: "scrapQuantity", required: true, serverAliases: ["scrap_quantity"] },
  { label: "Rework Quantity", name: "reworkQuantity", required: true, serverAliases: ["rework_quantity"] },
  { label: "Downtime Minutes", name: "downtimeMinutes", required: true, serverAliases: ["downtime_minutes"] },
  { label: "Status", name: "status", required: true },
];

type SaveIntent = "Save" | "Draft" | "SaveNew" | "SaveClose";
type DailyReportRecordModalProps = Readonly<{ closeHref?: string; data: ManufacturingDailyReportWorkspaceData; onOpenChange: (open: boolean) => void; open: boolean; report?: ManufacturingDailyReportRecord; previousHref?: string; nextHref?: string; title: string; trigger?: ReactNode }>;
type DailyReportRecordModalLauncherProps = Omit<DailyReportRecordModalProps, "onOpenChange" | "open" | "title" | "trigger"> & Readonly<{ autoOpen?: boolean; label?: string }>;

function auditFromReport(report?: ManufacturingDailyReportRecord, saveType?: string): RecordAuditMetadata | null {
  if (!report) return null;
  return { createdAt: report.createdAt, createdBy: report.createdBy, saveType, status: report.status, updatedAt: report.updatedAt, updatedBy: report.updatedBy, version: report.version };
}

export function DailyReportRecordModalLauncher({ autoOpen, closeHref, label, data, report, previousHref, nextHref }: DailyReportRecordModalLauncherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const title = report ? `Edit ${report.reportKey}` : "New Daily Production Report";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return <DailyReportRecordModal closeHref={closeHref} data={data} nextHref={nextHref} onOpenChange={handleOpenChange} open={open} previousHref={previousHref} report={report} title={title} trigger={autoOpen ? undefined : <button className="rounded-md border px-3 py-2 text-sm" type="button">{label ?? title}</button>} />;
}

function DailyReportRecordModal({ data, onOpenChange, open, report, previousHref, nextHref, title, trigger }: DailyReportRecordModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<RecordSaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedReport, setSavedReport] = useState<ManufacturingDailyReportRecord | undefined>(report);
  const localDraftKey = `nexora.modalDraft.manufacturing.daily-production-report.${report ? "edit" : "create"}.${report?.id ?? "new"}`;
  const validation = usePlatformFormValidation({ fields: dailyReportFieldRules, formRef });
  const auditMetadata = auditFromReport(savedReport, saveStatus === "draft-saved" ? "Draft" : saveStatus === "saved" ? "Saved" : undefined);
  const activityEvents = useMemo(() => auditMetadata ? buildRecordActivityEvents(auditMetadata) : [], [auditMetadata]);
  const lifecycleBlocksEditing = ["locked", "archived", "cancelled"].includes(savedReport?.status ?? report?.status ?? "");
  const saveBlockedByValidation = !validation.isValid;
  const nonValidationSaveDisabledReason = isPending ? "Save is already in progress." : lifecycleBlocksEditing ? "This report lifecycle status does not allow editing." : undefined;
  const saveDisabledReason = nonValidationSaveDisabledReason ?? validation.saveDisabledReason;
  const workerRows = Array.from({ length: Math.max(5, report?.workerOutput.length ?? 0) }, (_, index) => {
    const row = report?.workerOutput[index];
    return row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : {};
  });

  useEffect(() => {
    if (!window.localStorage.getItem(localDraftKey)) return undefined;
    const frame = window.requestAnimationFrame(() => restoreLocalDraft());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey]);

  function persistLocalDraft() {
    const form = formRef.current;
    if (!form) return;
    window.localStorage.setItem(localDraftKey, JSON.stringify([...new FormData(form).entries()].map(([key, value]) => [key, String(value)])));
  }

  function restoreLocalDraft() {
    const form = formRef.current;
    const raw = window.localStorage.getItem(localDraftKey);
    if (!form || !raw) return;
    for (const [key, value] of JSON.parse(raw) as [string, string][]) {
      const fields = form.elements.namedItem(key);
      if (fields instanceof RadioNodeList) {
        for (const field of Array.from(fields)) setFieldValue(field, value);
      } else {
        setFieldValue(fields, value);
      }
    }
    setSaveStatus("dirty");
    setIsDirty(true);
    window.requestAnimationFrame(() => validation.validateForm());
  }

  function resetChanges() {
    formRef.current?.reset();
    setSaveStatus("idle");
    setIsDirty(false);
    setError(null);
  }

  function submit(intent: SaveIntent) {
    const form = formRef.current;
    if (!form) return;
    setError(null);
    const validationState = validation.validateForm({ focusFirstInvalid: true, revealAll: true });
    if (!validationState.isValid) {
      setSaveStatus("dirty");
      platform.feedback.error("Daily production report needs attention", { description: validationState.errorList[0]?.message ?? validation.saveDisabledReason ?? "Fix validation errors before saving.", source: "runtime" });
      return;
    }
    if (nonValidationSaveDisabledReason) return;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const formData = new FormData(form);
        if (intent === "Draft") formData.set("status", "draft");
        const saved = report ? await updateManufacturingDailyReportAction(report.id, formData) : await createManufacturingDailyReportAction(formData);
        setSavedReport(saved);
        setSaveStatus(intent === "Draft" ? "draft-saved" : "saved");
        setIsDirty(false);
        window.localStorage.removeItem(localDraftKey);
        platform.feedback.success(intent === "Draft" ? "DPR draft saved" : "Daily production report saved", { entity: { id: saved.id, label: saved.reportKey, type: "manufacturing_daily_report" }, source: "runtime" });
        router.refresh();
        if (intent === "SaveNew") {
          form.reset();
          setSavedReport(undefined);
        }
        if (intent === "SaveClose") onOpenChange(false);
      } catch (submitError) {
        const issue = validation.setServerError(submitError);
        setError(issue.fieldName === "__server" ? issue.message : null);
        setSaveStatus("failed");
        platform.feedback.error("DPR save failed", { description: issue.message, source: "runtime" });
      }
    });
  }

  function archiveReport() {
    if (!report) return;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await archiveManufacturingDailyReportAction(report.id);
        platform.feedback.success("Daily production report archived", { entity: { id: report.id, label: report.reportKey, type: "manufacturing_daily_report" }, source: "runtime" });
        router.push("/erp/manufacturing/daily-reports");
        router.refresh();
      } catch (archiveError) {
        const message = archiveError instanceof Error ? archiveError.message : "Could not archive the daily production report.";
        setError(message);
        setSaveStatus("failed");
        platform.feedback.error("DPR archive failed", { description: message, source: "runtime" });
      }
    });
  }

  const centerControls = <><PanelIconButton disabled={!previousHref || isPending} label="Go to previous record" onClick={() => previousHref && router.push(previousHref)} tooltip="Go to previous record"><ChevronLeft aria-hidden className="size-4" /></PanelIconButton><PanelIconButton disabled={!nextHref || isPending} label="Go to next record" onClick={() => nextHref && router.push(nextHref)} tooltip="Go to next record"><ChevronRight aria-hidden className="size-4" /></PanelIconButton></>;
  const actionControls = (
    <>
      <PanelToolbarGroup>
        <SaveButtonWithReason allowDisabledAttempt={saveBlockedByValidation} disabledReason={saveDisabledReason} isLoading={isPending && saveStatus === "saving"} label="Save" onClick={() => submit("Save")} />
        <PanelIconButton aria-disabled={Boolean(saveDisabledReason) || undefined} className={saveBlockedByValidation ? "opacity-50" : undefined} disabled={Boolean(nonValidationSaveDisabledReason)} label="Save as draft" onClick={() => submit("Draft")} tooltip={saveDisabledReason ?? "Save as draft"}><Check aria-hidden className="size-4" /></PanelIconButton>
        <PanelIconButton aria-disabled={Boolean(saveDisabledReason) || undefined} className={saveBlockedByValidation ? "opacity-50" : undefined} disabled={Boolean(nonValidationSaveDisabledReason)} label="Save and create another" onClick={() => submit("SaveNew")} tooltip={saveDisabledReason ?? "Save and create another"}><FilePlus2 aria-hidden className="size-4" /></PanelIconButton>
      </PanelToolbarGroup>
      <DropdownMenu align="end" items={[{ key: "save-close", label: "Save and close", onSelect: () => submit("SaveClose"), disabled: isPending }, { key: "archive", label: "Archive record", onSelect: archiveReport, disabled: !report || isPending }, { key: "duplicate", label: "Duplicate", disabled: true }, { key: "restore-draft", label: "Restore local draft", onSelect: restoreLocalDraft }, { key: "discard-draft", label: "Discard local draft", onSelect: () => window.localStorage.removeItem(localDraftKey) }, { key: "reset", label: "Reset changes", onSelect: resetChanges }]} trigger={<PanelIconButton label="More actions" tooltip="More actions"><MoreHorizontal aria-hidden className="size-4" /></PanelIconButton>} />
    </>
  );
  const statusBadge = <StatusBadge status={savedReport?.status ?? report?.status ?? "draft"} />;

  return (
    <RecordFormDialog actions={actionControls} auditMetadata={<div className="space-y-2"><SaveStatusIndicator status={saveStatus} /><SaveAuditMetadata metadata={auditMetadata} /></div>} centerControls={centerControls} isDirty={isDirty} onOpenChange={onOpenChange} open={open} size="wide" status={<>{statusBadge}<ValidationStatusBadge errorCount={validation.allErrorList.length} isValid={validation.isValid} show={validation.hasValidationAttempted} /></>} subtitle="Capture production facts, worker output, and lifecycle status for the current page." title={title} trigger={trigger}>
      <div className="space-y-[var(--floating-panel-section-gap)]">
        <RecordFormSection>
          <form className="space-y-4" onBlur={validation.validateOnBlur} onInput={(event) => { setSaveStatus("dirty"); setIsDirty(true); persistLocalDraft(); validation.validateOnInput(event); }} ref={formRef}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ReadOnlyCodeField defaultValue={report?.reportKey} label="Report Code" name="reportKey" />
              <Field defaultValue={report?.reportDate} error={validation.errors.reportDate} isRequired label="Report Date" name="reportDate" type="date" />
              <Field defaultValue={report?.shiftKey} error={validation.errors.shiftKey} isRequired label="Shift" name="shiftKey" />
              <SelectField defaultValue={report?.manufacturingProductId} error={validation.errors.manufacturingProductId} isRequired label="Product" name="manufacturingProductId" options={data.products} />
              <SelectField defaultValue={report?.productionLineId} error={validation.errors.productionLineId} isRequired label="Production Line" name="productionLineId" options={data.lines} />
              <SelectField defaultValue={report?.supervisorRefId} error={validation.errors.supervisorRefId} label="Supervisor" name="supervisorRefId" options={data.workers} />
              <Field defaultValue={report?.plannedQuantity ?? 0} error={validation.errors.plannedQuantity} isRequired label="Planned Quantity" name="plannedQuantity" type="number" />
              <Field defaultValue={report?.actualQuantity ?? 0} error={validation.errors.actualQuantity} isRequired label="Actual Quantity" name="actualQuantity" type="number" warning={validation.warnings.actualQuantity} />
              <Field defaultValue={report?.scrapQuantity ?? 0} error={validation.errors.scrapQuantity} isRequired label="Scrap Quantity" name="scrapQuantity" type="number" />
              <Field defaultValue={report?.reworkQuantity ?? 0} error={validation.errors.reworkQuantity} isRequired label="Rework Quantity" name="reworkQuantity" type="number" />
              <Field defaultValue={report?.downtimeMinutes ?? 0} error={validation.errors.downtimeMinutes} isRequired label="Downtime Minutes" name="downtimeMinutes" type="number" />
              <SelectField defaultValue={report?.status ?? "draft"} error={validation.errors.status} isRequired label="Status" name="status" options={statusOptions} />
            </div>
            <section className="space-y-2">
              <div><h3 className="font-medium">Worker Output Grid</h3><p className="mt-1 text-sm text-muted-foreground">Production facts only: worker reference, target quantity, actual quantity, and notes.</p></div>
              <div className="overflow-auto rounded-md border">
                <table className="w-full min-w-[48rem] text-sm"><thead className="bg-[hsl(var(--muted))]"><tr><th className="p-3 text-start">Worker</th><th className="p-3 text-start">Target Qty</th><th className="p-3 text-start">Actual Qty</th><th className="p-3 text-start">Notes</th></tr></thead><tbody>{workerRows.map((row, index) => <tr className="border-t" key={index}><td className="p-2"><EntityLookup emptyMessage="No workers found." label="Select worker" name="workerOutputWorkerRefId" options={data.workers} placeholder="Search worker..." value={String(row.workerRefId ?? row.workerKey ?? "")} /></td><td className="p-2"><input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={String(row.targetQuantity ?? 0)} min="0" name="workerOutputTargetQuantity" type="number" /></td><td className="p-2"><input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={String(row.actualQuantity ?? 0)} min="0" name="workerOutputActualQuantity" type="number" /></td><td className="p-2"><input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={String(row.notes ?? "")} name="workerOutputNotes" /></td></tr>)}</tbody></table>
              </div>
            </section>
            <label className="block space-y-1 text-sm"><span className="font-medium">Notes</span><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2" defaultValue={report?.notes ?? ""} name="notes" /></label>
          </form>
        </RecordFormSection>
        {error ? <p className="rounded-md border border-[hsl(var(--danger))] p-3 text-sm text-[hsl(var(--danger))]" role="alert">{error}</p> : null}
        <RecordFormSection><h3 className="text-sm font-medium">Audit / Activity</h3><AuditActivityTimeline events={activityEvents} /></RecordFormSection>
      </div>
    </RecordFormDialog>
  );
}

function setFieldValue(field: unknown, value: string) {
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.value = value;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{status}</span>;
}

function Field({ defaultValue, error, isRequired, label, name, type = "text", warning }: Readonly<{ defaultValue?: string | number | null; error?: string; isRequired?: boolean; label: string; name: string; type?: string; warning?: string }>) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span><input className={cn("w-full rounded-md border bg-background px-3 py-2", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue ?? ""} name={name} required={isRequired} type={type} {...fieldA11yProps(name, error)} /><FieldErrorText id={fieldErrorId(name)}>{error}</FieldErrorText><FieldWarningText id={`${name}-warning`}>{warning}</FieldWarningText></label>;
}

function ReadOnlyCodeField({ defaultValue, label, name }: Readonly<{ defaultValue?: string | null; label: string; name: string }>) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><input name={name} type="hidden" value={defaultValue ?? ""} /><input className="w-full rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-muted-foreground" readOnly type="text" value={defaultValue ? displayBusinessCode(defaultValue, reportCodeConfig) : "Auto-generated on save"} /></label>;
}

function SelectField({ defaultValue, error, isRequired, label, name, options }: Readonly<{ defaultValue?: string | null; error?: string; isRequired?: boolean; label: string; name: string; options: readonly { id: string; label: string; meta?: string }[] | readonly string[] }>) {
  const hasLookupOptions = options.length > 0 && typeof options[0] !== "string";
  if (hasLookupOptions) {
    const lookupOptions = options as readonly { id: string; label: string; meta?: string }[];
    return <label className="space-y-1 text-sm"><span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span><EntityLookup emptyMessage="No related records found." error={error} label={isRequired ? "Select..." : "Any"} name={name} options={lookupOptions.map((option) => ({ ...option, subtitle: option.meta }))} placeholder={`Search ${label.toLowerCase()}...`} required={isRequired} value={defaultValue ?? ""} /></label>;
  }
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span><select className={cn("w-full rounded-md border bg-background px-3 py-2", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue ?? ""} name={name} required={isRequired} {...fieldA11yProps(name, error)}><option value="">{isRequired ? "Select..." : "Any"}</option>{options.map((option) => { const value = typeof option === "string" ? option : option.id; const optionLabel = typeof option === "string" ? option : `${option.label}${option.meta ? ` (${option.meta})` : ""}`; return <option key={value} value={value}>{optionLabel}</option>; })}</select><FieldErrorText id={fieldErrorId(name)}>{error}</FieldErrorText></label>;
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import type { HrCompensationIssuanceDocumentKind } from "@/features/hr/public-api";
import type { MessageKey } from "@/platform/localization/messages/en";
import type { HrCompensationIssuanceBatchPreview } from "@/features/hr/public-api";
import { buildCompensationIssuanceCloseHref } from "@/features/hr/public-api";
import {
  createCompensationIssuanceDraftAction,
  createCompensationIssuanceImportBatchAction,
  previewCompensationIssuanceBatchAction,
  submitCompensationIssuanceBatchAction,
} from "@/features/hr/routes/actions/hr-compensation-issuance.actions";
import { platformFeedback } from "@/platform/feedback/public-api";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  RecordFormDialog,
  RecordFormSection,
  WizardStepIndicator,
  nativeSelectClassName,
  useTranslations,
} from "@/shared/ui";

type WizardStep = "setup" | "recipients" | "review";

type SubtypeOption = Readonly<{ label: string; value: string }>;

type ImportParsedRow = Readonly<{
  amount: number | null;
  employeeId: string;
  employeeLabel: string;
  employeeNumber: string;
  notes: string | null;
  percentage: number | null;
  row: number;
}>;

type PendingSetup = Readonly<{
  documentSubtype: string;
  effectiveDate: string;
  notes: string;
  payrollPeriod: string;
  reason: string;
}>;

export function HrCompensationIssuanceWizard({
  defaultSubtype,
  descriptionKey,
  documentKind,
  open,
  query,
  requiresReason = false,
  subtypeOptions,
  titleKey,
}: Readonly<{
  defaultSubtype: string;
  descriptionKey: MessageKey;
  documentKind: HrCompensationIssuanceDocumentKind;
  open: boolean;
  query: Record<string, string | undefined>;
  requiresReason?: boolean;
  subtypeOptions: readonly SubtypeOption[];
  titleKey: MessageKey;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>("setup");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [preview, setPreview] = useState<HrCompensationIssuanceBatchPreview | null>(null);
  const [selectionMode, setSelectionMode] = useState("all_active");
  const [amountMode, setAmountMode] = useState("fixed");
  const [positionId, setPositionId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [pendingSetup, setPendingSetup] = useState<PendingSetup | null>(null);
  const [importRows, setImportRows] = useState<readonly ImportParsedRow[]>([]);
  const [importWarnings, setImportWarnings] = useState<readonly string[]>([]);
  const [importErrors, setImportErrors] = useState<readonly string[]>([]);

  const isImportMode = selectionMode === "import";
  const currentIndex = step === "setup" ? 0 : step === "recipients" ? 1 : 2;
  const steps = useMemo(
    () => [
      { key: "setup", label: t("hr.compensationIssuance.wizard.step.setup") },
      { key: "recipients", label: t("hr.compensationIssuance.wizard.step.recipients") },
      { key: "review", label: t("hr.compensationIssuance.wizard.step.review") },
    ],
    [t],
  );

  function resetWizardState() {
    setStep("setup");
    setBatchId(null);
    setPreview(null);
    setPendingSetup(null);
    setImportRows([]);
    setImportWarnings([]);
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeWizard() {
    resetWizardState();
    router.push(buildCompensationIssuanceCloseHref(documentKind, query));
  }

  function readPendingSetup(formData: FormData): PendingSetup {
    return {
      documentSubtype: String(formData.get("documentSubtype") ?? defaultSubtype),
      effectiveDate: String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10)),
      notes: String(formData.get("notes") ?? "").trim(),
      payrollPeriod: String(formData.get("payrollPeriod") ?? "").trim(),
      reason: String(formData.get("reason") ?? "").trim(),
    };
  }

  function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("documentKind", documentKind);

    if (isImportMode) {
      setPendingSetup(readPendingSetup(formData));
      setImportRows([]);
      setImportWarnings([]);
      setImportErrors([]);
      setStep("recipients");
      return;
    }

    formData.set("selectionMode", selectionMode);
    formData.set("amountMode", amountMode);
    if (positionId) formData.set("positionId", positionId);
    if (employeeId) formData.set("employeeId", employeeId);

    startTransition(async () => {
      try {
        const draft = await createCompensationIssuanceDraftAction(formData);
        setBatchId(draft.batchId);
        setStep("recipients");
        platformFeedback.success(draft.batchCode);
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : "Could not create batch draft.");
      }
    });
  }

  function handleImportParse() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      platformFeedback.error(t("hr.compensationIssuance.wizard.import.fileRequired"));
      return;
    }

    startTransition(async () => {
      try {
        const body = new FormData();
        body.set("file", file);
        const response = await fetch("/api/hr/compensation-issuance/parse-import", { body, method: "POST" });
        const payload = (await response.json()) as {
          errors?: string[];
          rows?: ImportParsedRow[];
          success?: boolean;
          warnings?: string[];
        };

        if (!response.ok || !payload.success) {
          setImportErrors(payload.errors ?? [t("hr.compensationIssuance.wizard.import.parseFailed")]);
          setImportRows([]);
          setImportWarnings([]);
          return;
        }

        setImportRows(payload.rows ?? []);
        setImportWarnings(payload.warnings ?? []);
        setImportErrors([]);
        platformFeedback.success(t("hr.compensationIssuance.wizard.import.parsed", { count: payload.rows?.length ?? 0 }));
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : t("hr.compensationIssuance.wizard.import.parseFailed"));
      }
    });
  }

  function handleImportPreview() {
    if (!pendingSetup || importRows.length === 0) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("documentKind", documentKind);
        formData.set("documentSubtype", pendingSetup.documentSubtype);
        formData.set("effectiveDate", pendingSetup.effectiveDate);
        formData.set("reason", pendingSetup.reason);
        formData.set("notes", pendingSetup.notes);
        formData.set("payrollPeriod", pendingSetup.payrollPeriod);
        formData.set("importRows", JSON.stringify(importRows));

        const result = await createCompensationIssuanceImportBatchAction(formData);
        setBatchId(result.batchId);
        setPreview(result.preview);
        setStep("review");
        platformFeedback.success(result.batchCode);
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : "Could not build import preview.");
      }
    });
  }

  function handlePreview() {
    if (!batchId) return;
    startTransition(async () => {
      try {
        const result = await previewCompensationIssuanceBatchAction(batchId);
        setPreview(result);
        setStep("review");
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : "Could not build preview.");
      }
    });
  }

  function handleSubmit() {
    if (!batchId) return;
    startTransition(async () => {
      try {
        const result = await submitCompensationIssuanceBatchAction(batchId);
        if (result.queued) {
          platformFeedback.info(t("hr.compensationIssuance.wizard.queued"));
        } else {
          platformFeedback.success(t("hr.compensationIssuance.wizard.created", { count: result.createdCount }));
        }
        closeWizard();
        router.refresh();
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : "Could not submit batch.");
      }
    });
  }

  return (
    <RecordFormDialog
      onDismiss={closeWizard}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeWizard();
      }}
      open={open}
      size="wide"
      subtitle={t(descriptionKey)}
      title={t(titleKey)}
    >
      <WizardStepIndicator currentIndex={currentIndex} steps={steps} />

      {step === "setup" ? (
        <form className="mt-4 space-y-4" onSubmit={handleSetupSubmit}>
          <RecordFormSection>
            <h3 className="text-sm font-semibold">{t("hr.compensationIssuance.wizard.step.setup")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>{t("hr.common.type")}</span>
                <select className={nativeSelectClassName} defaultValue={defaultSubtype} name="documentSubtype">
                  {subtypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <DatePicker defaultValue={new Date().toISOString().slice(0, 10)} name="effectiveDate" placeholder={t("hr.common.effectiveDate")} />
              <Input className="md:col-span-2" name="reason" placeholder={t("hr.common.reason")} required={requiresReason} />
            </div>
          </RecordFormSection>

          <RecordFormSection>
            <h3 className="text-sm font-semibold">{t("hr.compensationIssuance.wizard.step.recipients")}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>{t("hr.compensationIssuance.wizard.step.recipients")}</span>
                <select
                  className={nativeSelectClassName}
                  onChange={(event) => setSelectionMode(event.target.value)}
                  value={selectionMode}
                >
                  <option value="all_active">{t("hr.compensationIssuance.wizard.selection.allActive")}</option>
                  <option value="by_position">{t("hr.compensationIssuance.wizard.selection.byPosition")}</option>
                  <option value="manual">{t("hr.compensationIssuance.wizard.selection.manual")}</option>
                  <option value="import">{t("hr.compensationIssuance.wizard.selection.import")}</option>
                </select>
              </label>
              {!isImportMode ? (
                <label className="space-y-1 text-sm">
                  <span>{t("hr.common.amount")}</span>
                  <select
                    className={nativeSelectClassName}
                    onChange={(event) => setAmountMode(event.target.value)}
                    value={amountMode}
                  >
                    <option value="fixed">{t("hr.compensationIssuance.wizard.amount.fixed")}</option>
                    <option value="by_position">{t("hr.compensationIssuance.wizard.amount.byPosition")}</option>
                  </select>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground md:col-span-2">{t("hr.compensationIssuance.wizard.import.hint")}</p>
              )}
              {!isImportMode ? (
                <Input min="0.01" name="amount" placeholder={t("hr.bonuses.amountPlaceholder")} required step="0.01" type="number" />
              ) : null}
              {selectionMode === "by_position" ? (
                <EntityLookup
                  label={t("hr.common.position")}
                  onValueChange={(value) => setPositionId(value)}
                  providerKey="hr.positions.lookup"
                  required
                  value={positionId}
                />
              ) : null}
              {selectionMode === "manual" ? (
                <EntityLookup
                  label={t("hr.common.employee")}
                  onValueChange={(value) => setEmployeeId(value)}
                  providerKey="hr.employees.lookup"
                  required
                  value={employeeId}
                />
              ) : null}
            </div>
          </RecordFormSection>

          <div className="flex justify-end gap-2">
            <Button onClick={closeWizard} type="button" variant="secondary">
              {t("hr.common.cancel")}
            </Button>
            <Button disabled={isPending} type="submit" variant="primary">
              {t("hr.common.continue")}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "recipients" ? (
        <div className="mt-4 space-y-4">
          {isImportMode ? (
            <>
              <p className="text-sm text-muted-foreground">{t("hr.compensationIssuance.wizard.import.description")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href="/api/hr/compensation-issuance/import-template"
                >
                  {t("hr.compensationIssuance.wizard.import.downloadTemplate")}
                </a>
                <input
                  accept=".csv,.xlsx,.xls"
                  className="block text-sm"
                  ref={fileInputRef}
                  type="file"
                />
                <Button disabled={isPending} onClick={handleImportParse} type="button" variant="secondary">
                  {t("hr.compensationIssuance.wizard.import.parse")}
                </Button>
              </div>

              {importErrors.length > 0 ? (
                <ul className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {importErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}

              {importWarnings.length > 0 ? (
                <ul className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  {importWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {importRows.length > 0 ? (
                <EnterpriseDataTable
                  columns={[
                    { header: t("hr.common.employee"), key: "emp", render: (row) => row.employeeLabel },
                    { header: t("hr.common.amount"), key: "amount", render: (row) => (row.amount ? row.amount.toLocaleString() : "—") },
                    { header: "%", key: "pct", render: (row) => (row.percentage !== null ? `${row.percentage}%` : "—") },
                  ]}
                  emptyMessage={t("hr.bonuses.batchesEmpty")}
                  getRowId={(row) => row.employeeId}
                  pagination={{ mode: "cursor", pageSize: 20 }}
                  records={importRows}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("hr.compensationIssuance.wizard.preview")}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep("setup")} type="button" variant="secondary">
              {t("hr.common.back")}
            </Button>
            {isImportMode ? (
              <Button disabled={isPending || importRows.length === 0} onClick={handleImportPreview} type="button" variant="primary">
                {t("hr.compensationIssuance.wizard.preview")}
              </Button>
            ) : (
              <Button disabled={isPending || !batchId} onClick={handlePreview} type="button" variant="primary">
                {t("hr.compensationIssuance.wizard.preview")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {step === "review" && preview ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <article className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("hr.compensationIssuance.wizard.included")}</p>
              <p className="text-xl font-semibold">{preview.includedCount}</p>
            </article>
            <article className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("hr.compensationIssuance.wizard.skipped")}</p>
              <p className="text-xl font-semibold">{preview.skippedCount}</p>
            </article>
            <article className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t("hr.compensationIssuance.wizard.total")}</p>
              <p className="text-xl font-semibold">
                {preview.totalAmount.toLocaleString()} {preview.currencyCode}
              </p>
            </article>
          </div>

          {preview.warnings.length > 0 ? (
            <ul className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "emp", render: (line) => line.employeeLabel },
              { header: t("hr.common.position"), key: "pos", render: (line) => line.positionLabel ?? "—" },
              { header: t("hr.common.amount"), key: "amount", render: (line) => (line.amount ? line.amount.toLocaleString() : "—") },
              { header: t("hr.common.status"), key: "status", render: (line) => line.lineStatus },
            ]}
            emptyMessage={t("hr.bonuses.batchesEmpty")}
            getRowId={(line) => line.employeeId}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={preview.lines}
          />

          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep("recipients")} type="button" variant="secondary">
              {t("hr.common.back")}
            </Button>
            <Button disabled={isPending || preview.includedCount === 0} onClick={handleSubmit} type="button" variant="primary">
              {t("hr.compensationIssuance.wizard.submit")}
            </Button>
          </div>
        </div>
      ) : null}
    </RecordFormDialog>
  );
}

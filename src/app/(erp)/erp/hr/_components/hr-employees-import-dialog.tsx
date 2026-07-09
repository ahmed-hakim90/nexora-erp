"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button, RecordFormDialog, RecordFormSection, fileInputClassName, useTranslations } from "@/shared/ui";
import { cn } from "@/shared/ui/utils";

type PreviewAction = "create" | "update" | "error";

type PreviewRow = Readonly<{
  action: PreviewAction;
  attendanceCode?: string;
  birthDate?: string;
  email?: string;
  employeeNumber?: string;
  errors: readonly string[];
  fullName: string;
  gender?: string;
  matchedEmployeeId?: string;
  matchedEmployeeNumber?: string;
  matchedFullName?: string;
  nationalId?: string;
  phone?: string;
  row: number;
}>;

type PreviewSummary = Readonly<{
  createCount: number;
  errorCount: number;
  totalRows: number;
  updateCount: number;
}>;

type PreviewResponse = Readonly<{
  message?: string;
  rows?: PreviewRow[];
  success: boolean;
  summary?: PreviewSummary;
}>;

type CommitResponse = Readonly<{
  acceptedCount?: number;
  createdCount?: number;
  message?: string;
  rejected?: ReadonlyArray<{ errors: string[]; row: number }>;
  success: boolean;
  updatedCount?: number;
}>;

type DialogStep = "upload" | "preview" | "done";

function buildCloseHref(query: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "import" || !value) continue;
    next.set(key, value);
  }
  const queryString = next.toString();
  return queryString ? `/erp/hr/employees?${queryString}` : "/erp/hr/employees";
}

function ActionBadge({ action }: Readonly<{ action: PreviewAction }>) {
  const t = useTranslations();

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        action === "create" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        action === "update" && "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        action === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {t(`hr.employees.import.action.${action}`)}
    </span>
  );
}

function SummaryChip({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const FORM_ID = "hr-employees-import-form";

export function HrEmployeesImportDialog({ query }: Readonly<{ query: Record<string, string | undefined> }>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isWorking, setIsWorking] = useState(false);
  const [step, setStep] = useState<DialogStep>("upload");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);

  const busy = isWorking || isPending;

  const visibleRows = useMemo(
    () => previewRows.filter((row) => !excludedRows.has(row.row)),
    [excludedRows, previewRows],
  );

  const visibleSummary = useMemo(() => {
    return {
      createCount: visibleRows.filter((row) => row.action === "create").length,
      errorCount: visibleRows.filter((row) => row.action === "error").length,
      excludedCount: excludedRows.size,
      totalRows: visibleRows.length,
      updateCount: visibleRows.filter((row) => row.action === "update").length,
    };
  }, [excludedRows.size, visibleRows]);

  const commitableRows = useMemo(
    () => visibleRows.filter((row) => row.action === "create" || row.action === "update"),
    [visibleRows],
  );

  function handleClose() {
    startTransition(() => {
      router.push(buildCloseHref(query));
      router.refresh();
    });
  }

  function removePreviewRow(rowNumber: number) {
    setExcludedRows((current) => {
      const next = new Set(current);
      next.add(rowNumber);
      return next;
    });
  }

  function resetToUpload() {
    setStep("upload");
    setPreviewRows([]);
    setExcludedRows(new Set());
    setCommitResult(null);
    setErrorMessage(null);
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setCommitResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setErrorMessage(t("hr.employees.import.error.selectFile"));
      return;
    }

    formData.set("mode", "preview");
    setIsWorking(true);

    try {
      const response = await fetch("/api/hr/employees/import", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as PreviewResponse;
      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? t("hr.employees.import.error.previewFailed"));
        return;
      }

      setPreviewRows(payload.rows ?? []);
      setExcludedRows(new Set());
      setStep("preview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("hr.employees.import.error.previewFailed"));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleConfirmImport() {
    setErrorMessage(null);
    if (commitableRows.length === 0) {
      setErrorMessage(t("hr.employees.import.error.noRows"));
      return;
    }

    setIsWorking(true);
    try {
      const response = await fetch("/api/hr/employees/import", {
        body: JSON.stringify({
          mode: "commit",
          rows: commitableRows.map((row) => ({
            action: row.action,
            attendanceCode: row.attendanceCode,
            birthDate: row.birthDate,
            email: row.email,
            employeeNumber: row.employeeNumber,
            fullName: row.fullName,
            gender: row.gender,
            matchedEmployeeId: row.matchedEmployeeId,
            nationalId: row.nationalId,
            phone: row.phone,
            row: row.row,
          })),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as CommitResponse;
      if (!response.ok) {
        setErrorMessage(payload.message ?? t("hr.employees.import.error.importFailed"));
        return;
      }

      setCommitResult(payload);
      setStep("done");
      if (payload.success) {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("hr.employees.import.error.importFailed"));
    } finally {
      setIsWorking(false);
    }
  }

  const footerActions =
    step === "upload" ? (
      <Button disabled={busy} form={FORM_ID} type="submit" variant="primary">
        {isWorking ? t("hr.employees.import.preparing") : t("hr.employees.import.preview")}
      </Button>
    ) : step === "preview" ? (
      <Button disabled={busy || commitableRows.length === 0} onClick={() => void handleConfirmImport()} type="button" variant="primary">
        {isWorking ? t("hr.employees.import.importing") : t("hr.employees.import.confirm", { count: commitableRows.length })}
      </Button>
    ) : (
      <Button onClick={handleClose} type="button" variant="primary">
        {t("hr.employees.import.done")}
      </Button>
    );

  return (
    <RecordFormDialog
      actions={footerActions}
      onDismiss={handleClose}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      open
      size={step === "upload" ? "normal" : "wide"}
      subtitle={
        step === "upload"
          ? t("hr.employees.import.subtitle.upload")
          : step === "preview"
            ? t("hr.employees.import.subtitle.preview")
            : t("hr.employees.import.subtitle.done")
      }
      title={t("hr.employees.import.title")}
    >
      {step === "upload" ? (
        <form className="space-y-4" id={FORM_ID} onSubmit={(event) => void handlePreview(event)}>
          <RecordFormSection>
            <label className="block text-sm font-medium" htmlFor="employee-import-file">
              {t("hr.employees.import.fileLabel")}
            </label>
            <input
              accept=".xls,.xlsx,.xlsm,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className={`mt-2 ${fileInputClassName}`}
              id="employee-import-file"
              name="file"
              required
              type="file"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              <a className="underline" href="/api/hr/employees/import-template">
                {t("hr.employees.import.templateAr")}
              </a>
              {" · "}
              <a className="underline" href="/api/hr/employees/import-template?lang=en">
                {t("hr.employees.import.templateEn")}
              </a>
              {" · "}
              <a className="underline" href="/api/hr/employees/import-template?format=csv">
                {t("hr.employees.import.templateCsv")}
              </a>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("hr.employees.import.hint")}
            </p>
          </RecordFormSection>
        </form>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <SummaryChip label={t("hr.employees.import.summary.create")} value={visibleSummary.createCount} />
              <SummaryChip label={t("hr.employees.import.summary.update")} value={visibleSummary.updateCount} />
              <SummaryChip label={t("hr.employees.import.summary.error")} value={visibleSummary.errorCount} />
              <SummaryChip label={t("hr.employees.import.summary.excluded")} value={visibleSummary.excludedCount} />
              <SummaryChip label={t("hr.employees.import.summary.visible")} value={visibleSummary.totalRows} />
            </div>
            <Button disabled={busy} onClick={resetToUpload} type="button" variant="secondary">
              {t("hr.employees.import.chooseAnother")}
            </Button>
          </div>

          {visibleRows.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              {t("hr.employees.import.emptyPreview")}
            </p>
          ) : (
            <div className="max-h-[min(28rem,50dvh)] overflow-auto rounded-xl border border-[hsl(var(--border))]">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <thead className="sticky top-0 z-[1] bg-[hsl(var(--surface))]">
                  <tr className="border-b border-[hsl(var(--border))] text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t("hr.employees.import.column.row")}</th>
                    <th className="px-3 py-2 font-medium">{t("hr.employees.import.column.action")}</th>
                    <th className="px-3 py-2 font-medium">{t("hr.common.fullName")}</th>
                    <th className="px-3 py-2 font-medium">{t("hr.employees.wizard.employeeCode")}</th>
                    <th className="px-3 py-2 font-medium">{t("hr.employees.import.column.matchedEmployee")}</th>
                    <th className="px-3 py-2 font-medium">{t("hr.employees.import.column.errors")}</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr className="border-b border-[hsl(var(--border))] align-top" key={row.row}>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.row}</td>
                      <td className="px-3 py-2">
                        <ActionBadge action={row.action} />
                      </td>
                      <td className="px-3 py-2">{row.fullName || "—"}</td>
                      <td className="px-3 py-2">{row.employeeNumber || row.attendanceCode || "—"}</td>
                      <td className="px-3 py-2">
                        {row.matchedEmployeeId
                          ? `${row.matchedFullName ?? t("hr.employees.import.matchedEmployeeFallback")} (${row.matchedEmployeeNumber ?? row.matchedEmployeeId})`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <ul className="list-disc space-y-0.5 ps-4 text-xs text-destructive">
                            {row.errors.map((error) => (
                              <li key={`${row.row}-${error}`}>{error}</li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Button disabled={busy} onClick={() => removePreviewRow(row.row)} size="sm" type="button" variant="secondary">
                          {t("hr.employees.import.remove")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {step === "done" && commitResult ? (
        <div className="space-y-3 rounded-md border bg-[hsl(var(--muted))]/30 p-3 text-sm">
          <p>
            {commitResult.success
              ? t("hr.employees.import.result.success", {
                  accepted: commitResult.acceptedCount ?? 0,
                  created: commitResult.createdCount ?? 0,
                  updated: commitResult.updatedCount ?? 0,
                })
              : t("hr.employees.import.result.none")}
          </p>
          {(commitResult.rejected?.length ?? 0) > 0 ? (
            <div>
              <p className="font-medium">{t("hr.employees.import.rejectedRows")}</p>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {commitResult.rejected?.map((row) => (
                  <li className="rounded border bg-[hsl(var(--surface))] p-2" key={row.row}>
                    <span className="font-medium">{t("hr.employees.import.row", { row: row.row })}</span>
                    <ul className="mt-1 list-disc ps-5 text-muted-foreground">
                      {row.errors.map((error) => (
                        <li key={`${row.row}-${error}`}>{error}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button onClick={resetToUpload} type="button" variant="secondary">
            {t("hr.employees.import.importAnother")}
          </Button>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </RecordFormDialog>
  );
}

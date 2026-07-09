"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { HrEmployeeWizardContext } from "@/features/hr/routes/loaders/hr-employees.loader";
import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { previewHireContractTypeVersionAction } from "@/features/hr/routes/actions/hr-contract-type.actions";
import { createEmployeeWizardAction } from "@/features/hr/routes/actions/hr-employees.actions";
import {
  Button,
  DatePicker,
  EntityLookup,
  FieldGroup,
  FormGrid,
  Input,
  ISO_DATE_FORMAT,
  nativeSelectClassName,
  RecordFormDialog,
  RecordFormSection,
  toIsoDate,
  useTranslations,
  WizardStepIndicator,
} from "@/shared/ui";

const WIZARD_STEP_KEYS = ["identity", "organization", "contract", "payroll", "attendance", "review"] as const;
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function WizardSection({
  children,
  description,
  title,
}: Readonly<{ children: React.ReactNode; description?: string; title: string }>) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <RecordFormSection>{children}</RecordFormSection>
    </section>
  );
}

function buildCloseHref(query: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "wizard" || !value) continue;
    next.set(key, value);
  }
  const suffix = next.toString();
  return suffix ? `/erp/hr/employees?${suffix}` : "/erp/hr/employees";
}

function todayIsoDate() {
  return toIsoDate(new Date()) ?? "";
}

function reviewStatus(
  t: ReturnType<typeof useTranslations>,
  complete: boolean,
  optional = false,
): string {
  if (complete) return t("hr.employees.wizard.review.status.complete");
  if (optional) return t("hr.employees.wizard.review.status.optionalPending");
  return t("hr.employees.wizard.review.status.pending");
}

export function HrEmployeeWizardDialog({
  query,
  wizardContext,
}: Readonly<{
  query: Record<string, string | undefined>;
  wizardContext: HrEmployeeWizardContext;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const steps = useMemo(
    () =>
      WIZARD_STEP_KEYS.map((key) => ({
        key,
        label: t(`hr.employees.wizard.step.${key}`),
      })),
    [t],
  );
  const optional = (label: string) => `${label} ${t("hr.common.optional")}`;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewArticles, setPreviewArticles] = useState<readonly { sequence: number; title_ar: string | null; title_en: string | null }[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    bankIsPrimary: "true",
    effectiveFrom: todayIsoDate(),
    employmentType: "full-time",
    shiftApplyWorkingDays: "true",
  }));

  const payrollPackageRequired = wizardContext.hasSalaryPackages;
  const payrollGroupRequired = wizardContext.hasPayrollGroups;
  const shiftRequired = wizardContext.hasShiftDefinitions;

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(draft.fullName?.trim() && draft.employeeNumber?.trim());
    if (step === 1) {
      return Boolean(draft.employmentType?.trim() && draft.effectiveFrom?.trim() && draft.departmentId?.trim());
    }
    if (step === 2) {
      if (draft.contractTypeVersionId && !draft.contractStartsOn?.trim()) return false;
      return true;
    }
    if (step === 3) {
      if (payrollPackageRequired && !draft.salaryPackageVersionId?.trim()) return false;
      if (payrollGroupRequired && !draft.payrollGroupId?.trim()) return false;
      const hasPartialBank = Boolean(draft.bankName?.trim() || draft.accountNumber?.trim() || draft.accountHolderName?.trim());
      if (hasPartialBank) {
        return Boolean(draft.bankName?.trim() && draft.accountNumber?.trim() && draft.accountHolderName?.trim());
      }
      return true;
    }
    if (step === 4) {
      if (shiftRequired && !draft.shiftId?.trim()) return false;
      if (draft.shiftId && draft.shiftApplyWorkingDays === "false" && !draft.shiftDayOfWeek) return false;
      return true;
    }
    return true;
  }, [
    draft.accountHolderName,
    draft.accountNumber,
    draft.bankName,
    draft.contractStartsOn,
    draft.contractTypeVersionId,
    draft.departmentId,
    draft.effectiveFrom,
    draft.employeeNumber,
    draft.employmentType,
    draft.fullName,
    draft.payrollGroupId,
    draft.salaryPackageVersionId,
    draft.shiftApplyWorkingDays,
    draft.shiftDayOfWeek,
    draft.shiftId,
    payrollGroupRequired,
    payrollPackageRequired,
    shiftRequired,
    step,
  ]);

  const canSubmit = Boolean(
    draft.fullName?.trim() &&
      draft.employeeNumber?.trim() &&
      draft.departmentId?.trim() &&
      draft.effectiveFrom?.trim() &&
      draft.employmentType?.trim() &&
      (!payrollPackageRequired || draft.salaryPackageVersionId?.trim()) &&
      (!payrollGroupRequired || draft.payrollGroupId?.trim()) &&
      (!shiftRequired || draft.shiftId?.trim()),
  );

  function updateField(name: string, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function closeWizard() {
    router.push(buildCloseHref(query));
  }

  function goNext() {
    if (!canContinue) return;
    setError(null);
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  function submitWizard(formData: FormData) {
    startTransition(async () => {
      setError(null);
      try {
        for (const [key, value] of Object.entries(draft)) {
          if (!formData.get(key)) formData.set(key, value);
        }
        const result = await createEmployeeWizardAction(formData);
        router.push(`/erp/hr/employees/${result.employeeId}?tab=overview#hire-completion-card`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t("hr.employees.wizard.error"));
      }
    });
  }

  function previewContract() {
    if (!draft.contractTypeVersionId) return;
    startTransition(async () => {
      setError(null);
      try {
        const preview = await previewHireContractTypeVersionAction(draft.contractTypeVersionId);
        setPreviewArticles(preview.articles);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t("hr.employees.wizard.previewError"));
      }
    });
  }

  return (
    <RecordFormDialog
      actions={
        <>
          {step > 0 ? (
            <Button disabled={isPending} onClick={goBack} type="button" variant="secondary">
              {t("hr.common.back")}
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button disabled={!canContinue || isPending} onClick={goNext} type="button" variant="primary">
              {t("hr.common.continue")}
            </Button>
          ) : (
            <Button disabled={isPending || !canSubmit} form="hr-employee-wizard-form" type="submit" variant="primary">
              {isPending ? t("hr.employees.wizard.creating") : t("hr.employees.wizard.create")}
            </Button>
          )}
        </>
      }
      onDismiss={closeWizard}
      onOpenChange={(open) => {
        if (!open) closeWizard();
      }}
      open
      size="wide"
      subtitle={t("hr.employees.wizard.subtitle")}
      title={t("hr.employees.wizard.title")}
    >
      <form action={submitWizard} className="space-y-6" id="hr-employee-wizard-form">
        <WizardStepIndicator
          currentIndex={step}
          onStepClick={(index) => {
            if (index <= step) setStep(index);
          }}
          steps={steps}
        />

        {step === 0 ? (
          <WizardSection description={t("hr.employees.wizard.section.personalDescription")} title={t("hr.employees.wizard.section.personal")}>
            <FormGrid>
              <FieldGroup help={resolveHrFieldHelp("fullName")} isRequired label={t("hr.common.fullName")}>
                <Input name="fullName" onChange={(e) => updateField("fullName", e.target.value)} required value={draft.fullName ?? ""} />
              </FieldGroup>
              <FieldGroup description={t("hr.employees.wizard.employeeCodeDescription")} isRequired label={t("hr.employees.wizard.employeeCode")}>
                <Input maxLength={50} name="employeeNumber" onChange={(e) => updateField("employeeNumber", e.target.value)} required value={draft.employeeNumber ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.nationalId"))}>
                <Input name="nationalId" onChange={(e) => updateField("nationalId", e.target.value)} value={draft.nationalId ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.passportNumber"))}>
                <Input name="passportNumber" onChange={(e) => updateField("passportNumber", e.target.value)} value={draft.passportNumber ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.birthDate"))}>
                <DatePicker name="birthDate" onValueChange={(value) => updateField("birthDate", value ?? "")} value={draft.birthDate ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.gender"))}>
                <select className={nativeSelectClassName} name="gender" onChange={(e) => updateField("gender", e.target.value)} value={draft.gender ?? ""}>
                  <option value="">{t("hr.common.selectPlaceholder")}</option>
                  <option value="female">{t("hr.common.gender.female")}</option>
                  <option value="male">{t("hr.common.gender.male")}</option>
                  <option value="other">{t("hr.common.gender.other")}</option>
                  <option value="undisclosed">{t("hr.common.gender.undisclosed")}</option>
                </select>
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.nationality"))}>
                <Input name="nationality" onChange={(e) => updateField("nationality", e.target.value)} value={draft.nationality ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.email"))}>
                <Input name="email" onChange={(e) => updateField("email", e.target.value)} type="email" value={draft.email ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.phone"))}>
                <Input name="phone" onChange={(e) => updateField("phone", e.target.value)} value={draft.phone ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.emergencyContactName"))}>
                <Input name="emergencyContactName" onChange={(e) => updateField("emergencyContactName", e.target.value)} value={draft.emergencyContactName ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.emergencyContactPhone"))}>
                <Input name="emergencyContactPhone" onChange={(e) => updateField("emergencyContactPhone", e.target.value)} value={draft.emergencyContactPhone ?? ""} />
              </FieldGroup>
            </FormGrid>
          </WizardSection>
        ) : null}

        {step === 1 ? (
          <WizardSection description={t("hr.employees.wizard.section.organizationDescription")} title={t("hr.employees.wizard.section.organization")}>
            <FormGrid>
              <FieldGroup isRequired label={t("hr.common.employmentType")}>
                <select className={nativeSelectClassName} name="employmentType" onChange={(e) => updateField("employmentType", e.target.value)} required value={draft.employmentType ?? "full-time"}>
                  <option value="full-time">{t("hr.employees.wizard.employmentType.fullTime")}</option>
                  <option value="part-time">{t("hr.employees.wizard.employmentType.partTime")}</option>
                  <option value="temporary">{t("hr.employees.wizard.employmentType.temporary")}</option>
                  <option value="contractor">{t("hr.employees.wizard.employmentType.contractor")}</option>
                  <option value="intern">{t("hr.employees.wizard.employmentType.intern")}</option>
                </select>
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.common.effectiveFrom")}>
                <DatePicker name="effectiveFrom" onValueChange={(value) => updateField("effectiveFrom", value ?? "")} required value={draft.effectiveFrom ?? ""} />
              </FieldGroup>
              <EntityLookup label={optional(t("hr.common.branch"))} name="branchId" onValueChange={(value) => updateField("branchId", value ?? "")} providerKey="platform.branches.lookup" value={draft.branchId ?? ""} />
              <EntityLookup label={t("hr.common.department")} name="departmentId" onValueChange={(value) => updateField("departmentId", value)} providerKey="hr.org-units.lookup" required value={draft.departmentId ?? ""} />
              <EntityLookup label={optional(t("hr.common.position"))} name="positionId" onValueChange={(value) => updateField("positionId", value)} providerKey="hr.positions.lookup" value={draft.positionId ?? ""} />
              <EntityLookup label={optional(t("hr.common.manager"))} name="managerEmployeeId" onValueChange={(value) => updateField("managerEmployeeId", value)} providerKey="hr.employees.lookup" value={draft.managerEmployeeId ?? ""} />
              <EntityLookup label={optional(t("hr.common.location"))} name="workLocationId" onValueChange={(value) => updateField("workLocationId", value)} providerKey="hr.work-locations.lookup" value={draft.workLocationId ?? ""} />
            </FormGrid>
          </WizardSection>
        ) : null}

        {step === 2 ? (
          <WizardSection description={t("hr.employees.wizard.section.contractDescription")} title={t("hr.employees.wizard.section.contract")}>
            <FormGrid>
              <EntityLookup
                label={optional(t("hr.common.contractType"))}
                name="contractTypeVersionId"
                onValueChange={(value, option) => {
                  updateField("contractTypeVersionId", value ?? "");
                  const metadata = option?.metadata as { defaultProbationDays?: number | null } | undefined;
                  if (metadata?.defaultProbationDays != null && !draft.probationPeriodDays) {
                    updateField("probationPeriodDays", String(metadata.defaultProbationDays));
                  }
                  setPreviewArticles(null);
                }}
                providerKey="hr.contract-types.lookup"
                value={draft.contractTypeVersionId ?? ""}
              />
              <FieldGroup label={optional(t("hr.common.contractStartsOn"))}>
                <DatePicker name="contractStartsOn" onValueChange={(value) => updateField("contractStartsOn", value ?? "")} value={draft.contractStartsOn ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.common.probationPeriodDays"))}>
                <Input min="0" name="probationPeriodDays" onChange={(e) => updateField("probationPeriodDays", e.target.value)} type="number" value={draft.probationPeriodDays ?? ""} />
              </FieldGroup>
            </FormGrid>
            {draft.contractTypeVersionId ? (
              <div className="mt-3 space-y-2">
                <Button disabled={isPending} onClick={previewContract} type="button" variant="secondary">
                  {t("hr.employees.wizard.previewContract")}
                </Button>
                {previewArticles && previewArticles.length > 0 ? (
                  <ol className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-[hsl(var(--border))] p-3 text-sm">
                    {previewArticles.map((article) => (
                      <li key={article.sequence}>
                        {article.title_en || article.title_ar || t("hr.employees.wizard.article", { sequence: article.sequence })}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
          </WizardSection>
        ) : null}

        {step === 3 ? (
          <WizardSection description={t("hr.employees.wizard.section.payrollDescription")} title={t("hr.employees.wizard.section.payroll")}>
            <FormGrid>
              <EntityLookup
                label={payrollPackageRequired ? t("hr.common.salaryPackageRef") : optional(t("hr.common.salaryPackageRef"))}
                name="salaryPackageVersionId"
                onValueChange={(value) => updateField("salaryPackageVersionId", value ?? "")}
                providerKey="hr.salary-package-versions.lookup"
                required={payrollPackageRequired}
                value={draft.salaryPackageVersionId ?? ""}
              />
              <EntityLookup
                label={payrollGroupRequired ? t("hr.employees.wizard.payrollGroup") : optional(t("hr.employees.wizard.payrollGroup"))}
                name="payrollGroupId"
                onValueChange={(value) => updateField("payrollGroupId", value ?? "")}
                providerKey="hr.payroll-groups.lookup"
                required={payrollGroupRequired}
                value={draft.payrollGroupId ?? ""}
              />
              <FieldGroup label={optional(t("hr.employees.wizard.bankName"))}>
                <Input name="bankName" onChange={(e) => updateField("bankName", e.target.value)} value={draft.bankName ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.employees.wizard.accountHolderName"))}>
                <Input name="accountHolderName" onChange={(e) => updateField("accountHolderName", e.target.value)} value={draft.accountHolderName ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.employees.wizard.accountNumber"))}>
                <Input name="accountNumber" onChange={(e) => updateField("accountNumber", e.target.value)} value={draft.accountNumber ?? ""} />
              </FieldGroup>
              <FieldGroup label={optional(t("hr.employees.wizard.iban"))}>
                <Input name="iban" onChange={(e) => updateField("iban", e.target.value)} value={draft.iban ?? ""} />
              </FieldGroup>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  checked={draft.bankIsPrimary !== "false"}
                  className="h-4 w-4 rounded border border-[hsl(var(--border))]"
                  name="bankIsPrimary"
                  onChange={(e) => updateField("bankIsPrimary", e.target.checked ? "true" : "false")}
                  type="checkbox"
                  value="true"
                />
                {t("hr.employees.wizard.bankPrimary")}
              </label>
            </FormGrid>
          </WizardSection>
        ) : null}

        {step === 4 ? (
          <WizardSection description={t("hr.employees.wizard.section.attendanceDescription")} title={t("hr.employees.wizard.section.attendance")}>
            <FormGrid>
              <EntityLookup
                label={shiftRequired ? t("hr.shifts.form.shift") : optional(t("hr.shifts.form.shift"))}
                name="shiftId"
                onValueChange={(value) => updateField("shiftId", value ?? "")}
                providerKey="hr.shifts.lookup"
                required={shiftRequired}
                value={draft.shiftId ?? ""}
              />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  checked={draft.shiftApplyWorkingDays !== "false"}
                  className="h-4 w-4 rounded border border-[hsl(var(--border))]"
                  name="shiftApplyWorkingDays"
                  onChange={(e) => updateField("shiftApplyWorkingDays", e.target.checked ? "true" : "false")}
                  type="checkbox"
                  value="true"
                />
                {t("hr.employees.wizard.shiftWorkingDays")}
              </label>
              {draft.shiftApplyWorkingDays === "false" ? (
                <FieldGroup label={t("hr.shifts.form.dayOfWeek")}>
                  <select className={nativeSelectClassName} name="shiftDayOfWeek" onChange={(e) => updateField("shiftDayOfWeek", e.target.value)} value={draft.shiftDayOfWeek ?? "1"}>
                    {DAY_KEYS.map((day, index) => (
                      <option key={day} value={String(index)}>
                        {t(`hr.shifts.day.${day}`)}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
              ) : null}
            </FormGrid>
          </WizardSection>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <WizardSection description={t("hr.employees.wizard.section.reviewDescription")} title={t("hr.employees.wizard.section.review")}>
              <dl className="grid gap-2 text-sm">
                {[
                  [t("hr.common.name"), draft.fullName || "—"],
                  [t("hr.employees.wizard.review.attendanceCode"), draft.employeeNumber || "—"],
                  [t("hr.common.department"), reviewStatus(t, Boolean(draft.departmentId))],
                  [t("hr.common.contractType"), reviewStatus(t, Boolean(draft.contractTypeVersionId && draft.contractStartsOn), true)],
                  [t("hr.common.salaryPackageRef"), reviewStatus(t, Boolean(draft.salaryPackageVersionId), !payrollPackageRequired)],
                  [t("hr.employees.wizard.payrollGroup"), reviewStatus(t, Boolean(draft.payrollGroupId), !payrollGroupRequired)],
                  [t("hr.employees.wizard.bankAccount"), reviewStatus(t, Boolean(draft.bankName && draft.accountNumber), true)],
                  [t("hr.shifts.form.shift"), reviewStatus(t, Boolean(draft.shiftId), !shiftRequired)],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2" key={String(label)}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </WizardSection>
            <WizardSection description={t("hr.employees.wizard.section.profileFollowUpsDescription")} title={t("hr.employees.wizard.section.profileFollowUps")}>
              <p className="text-sm text-muted-foreground">{t("hr.employees.wizard.profileFollowUpsHint")}</p>
            </WizardSection>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">{t("hr.employees.wizard.requiredHint", { format: ISO_DATE_FORMAT })}</p>
      </form>
    </RecordFormDialog>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { resolveHrFieldHelp } from "@/features/hr/public-api";
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
  WizardStepIndicator,
} from "@/shared/ui";

const steps = [
  { key: "basics", label: "Employee basics" },
  { key: "employment", label: "Employment & assignment" },
  { key: "review", label: "Review & create" },
] as const;

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

export function HrEmployeeWizardDialog({ query }: Readonly<{ query: Record<string, string | undefined> }>) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    effectiveFrom: todayIsoDate(),
    employmentType: "full-time",
  }));

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(draft.fullName?.trim() && draft.employeeNumber?.trim());
    if (step === 1) {
      return Boolean(
        draft.employmentType?.trim() &&
          draft.effectiveFrom?.trim() &&
          draft.departmentId?.trim(),
      );
    }
    return true;
  }, [draft.departmentId, draft.effectiveFrom, draft.employeeNumber, draft.employmentType, draft.fullName, step]);

  const canSubmit = Boolean(
    draft.fullName?.trim() &&
      draft.employeeNumber?.trim() &&
      draft.departmentId?.trim() &&
      draft.effectiveFrom?.trim() &&
      draft.employmentType?.trim(),
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
        router.push(`/erp/hr/employees/${result.employeeId}`);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create employee.");
      }
    });
  }

  return (
    <RecordFormDialog
      actions={
        <>
          {step > 0 ? (
            <Button disabled={isPending} onClick={goBack} type="button" variant="secondary">
              Back
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button disabled={!canContinue || isPending} onClick={goNext} type="button" variant="primary">
              Continue
            </Button>
          ) : (
            <Button disabled={isPending || !canSubmit} form="hr-employee-wizard-form" type="submit" variant="primary">
              {isPending ? "Creating..." : "Create employee"}
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
      subtitle="Capture required employee data now. Contract, compensation, and documents can be completed later."
      title="Add employee"
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
          <WizardSection
            description="Required identity fields first. Contact details help HR reach the employee but can be added later."
            title="Personal & contact"
          >
            <FormGrid>
              <FieldGroup help={resolveHrFieldHelp("fullName")} isRequired label="Full name">
                <Input
                  name="fullName"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Full name"
                  required
                  value={draft.fullName ?? ""}
                />
              </FieldGroup>
              <FieldGroup
                description="Internal employee code used across HR, payroll, and lookups."
                help={resolveHrFieldHelp("employeeNumber")}
                isRequired
                label="Employee number / رقم الموظف"
              >
                <Input
                  name="employeeNumber"
                  onChange={(event) => updateField("employeeNumber", event.target.value)}
                  placeholder="Employee number"
                  required
                  value={draft.employeeNumber ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("nationalId")} label="National ID (optional)">
                <Input
                  name="nationalId"
                  onChange={(event) => updateField("nationalId", event.target.value)}
                  placeholder="National ID"
                  value={draft.nationalId ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("passportNumber")} label="Passport number (optional)">
                <Input
                  name="passportNumber"
                  onChange={(event) => updateField("passportNumber", event.target.value)}
                  placeholder="Passport number"
                  value={draft.passportNumber ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("birthDate")} label="Birth date (optional)">
                <DatePicker
                  name="birthDate"
                  onValueChange={(value) => updateField("birthDate", value ?? "")}
                  value={draft.birthDate ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("email")} label="Email (optional)">
                <Input
                  name="email"
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="Email"
                  type="email"
                  value={draft.email ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("phone")} label="Phone (optional)">
                <Input
                  name="phone"
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="Phone"
                  value={draft.phone ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("emergencyContactName")} label="Emergency contact name (optional)">
                <Input
                  name="emergencyContactName"
                  onChange={(event) => updateField("emergencyContactName", event.target.value)}
                  placeholder="Emergency contact name"
                  value={draft.emergencyContactName ?? ""}
                />
              </FieldGroup>
              <FieldGroup help={resolveHrFieldHelp("emergencyContactPhone")} label="Emergency contact phone (optional)">
                <Input
                  name="emergencyContactPhone"
                  onChange={(event) => updateField("emergencyContactPhone", event.target.value)}
                  placeholder="Emergency contact phone"
                  value={draft.emergencyContactPhone ?? ""}
                />
              </FieldGroup>
            </FormGrid>
          </WizardSection>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <WizardSection
              description="These fields drive employment status, attendance linkage, and assignment effective dating."
              title="Employment details"
            >
              <FormGrid>
                <FieldGroup help={resolveHrFieldHelp("employmentType")} isRequired label="Employment type">
                  <select
                    className={nativeSelectClassName}
                    name="employmentType"
                    onChange={(event) => updateField("employmentType", event.target.value)}
                    required
                    value={draft.employmentType ?? "full-time"}
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="temporary">Temporary</option>
                    <option value="contractor">Contractor</option>
                    <option value="intern">Intern</option>
                  </select>
                </FieldGroup>
                <FieldGroup help={resolveHrFieldHelp("effectiveFrom")} isRequired label="Effective from">
                  <DatePicker
                    name="effectiveFrom"
                    onValueChange={(value) => updateField("effectiveFrom", value ?? "")}
                    required
                    value={draft.effectiveFrom ?? ""}
                  />
                </FieldGroup>
                <FieldGroup
                  description="Device code already registered on the attendance (fingerprint/face) device. Separate from employee number."
                  help={resolveHrFieldHelp("attendanceCode")}
                  label="Attendance Code / رمز الحضور (optional)"
                >
                  <Input
                    maxLength={50}
                    name="attendanceCode"
                    onChange={(event) => updateField("attendanceCode", event.target.value)}
                    placeholder="Attendance device code"
                    value={draft.attendanceCode ?? ""}
                  />
                </FieldGroup>
              </FormGrid>
            </WizardSection>

            <WizardSection
              description="Optional contract metadata. Full contract records can be added from the Contracts workspace."
              title="Contract (optional)"
            >
              <FormGrid>
                <FieldGroup help={resolveHrFieldHelp("contractType")} label="Contract type (optional)">
                  <Input
                    name="contractType"
                    onChange={(event) => updateField("contractType", event.target.value)}
                    placeholder="Contract type"
                    value={draft.contractType ?? ""}
                  />
                </FieldGroup>
                <FieldGroup help={resolveHrFieldHelp("contractStartsOn")} label="Contract starts on (optional)">
                  <DatePicker
                    name="contractStartsOn"
                    onValueChange={(value) => updateField("contractStartsOn", value ?? "")}
                    value={draft.contractStartsOn ?? ""}
                  />
                </FieldGroup>
                <FieldGroup help={resolveHrFieldHelp("probationPeriodDays")} label="Probation period in days (optional)">
                  <Input
                    min="0"
                    name="probationPeriodDays"
                    onChange={(event) => updateField("probationPeriodDays", event.target.value)}
                    placeholder="Probation days"
                    type="number"
                    value={draft.probationPeriodDays ?? ""}
                  />
                </FieldGroup>
              </FormGrid>
            </WizardSection>

            <WizardSection
              description="Organization relationships are stored as assignment records, not direct employee fields."
              title="Initial assignment"
            >
              <FormGrid>
                <EntityLookup
                  label="Department"
                  name="departmentId"
                  onValueChange={(value) => updateField("departmentId", value)}
                  providerKey="hr.org-units.lookup"
                  required
                  value={draft.departmentId ?? ""}
                />
                <EntityLookup
                  label="Position (optional)"
                  name="positionId"
                  onValueChange={(value) => updateField("positionId", value)}
                  providerKey="hr.positions.lookup"
                  value={draft.positionId ?? ""}
                />
                <EntityLookup
                  label="Manager (optional)"
                  name="managerEmployeeId"
                  onValueChange={(value) => updateField("managerEmployeeId", value)}
                  providerKey="hr.employees.lookup"
                  value={draft.managerEmployeeId ?? ""}
                />
              </FormGrid>
            </WizardSection>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <WizardSection
              description="Confirm required data before creating the employee record."
              title="Review"
            >
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{draft.fullName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Employee number</dt>
                  <dd className="font-medium">{draft.employeeNumber || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Employment type</dt>
                  <dd>{draft.employmentType || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Effective from</dt>
                  <dd>{draft.effectiveFrom || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Attendance code</dt>
                  <dd>{draft.attendanceCode || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[hsl(var(--border))]/60 py-2">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd>{draft.departmentId ? "Selected" : "Required"}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd>{draft.email || draft.phone ? "Provided" : "Can add later"}</dd>
                </div>
              </dl>
            </WizardSection>

            <WizardSection
              description="Compensation defines payroll inputs. Payroll calculation happens later in payroll readiness."
              title="Compensation (optional)"
            >
              <FieldGroup help={resolveHrFieldHelp("salaryPackageRef")} label="Salary package reference (optional)">
                <Input
                  name="salaryPackageRef"
                  onChange={(event) => updateField("salaryPackageRef", event.target.value)}
                  placeholder="Salary package reference"
                  value={draft.salaryPackageRef ?? ""}
                />
              </FieldGroup>
              <p className="text-sm text-muted-foreground">
                Upload documents after employee creation from the employee profile or document center.
              </p>
            </WizardSection>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Required: full name, employee number, employment type, effective date, and department. Format dates as {ISO_DATE_FORMAT}.
        </p>
      </form>
    </RecordFormDialog>
  );
}

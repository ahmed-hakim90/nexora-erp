"use client";

import { useMemo, useState } from "react";

import { HR_ASSIGNMENT_QUICK_ACTIONS } from "@/features/hr/public-api";
import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { Button, DatePickerField, EntityLookup, FieldGroup, nativeSelectClassName, nativeTextareaClassName, useTranslations } from "@/shared/ui";

const assignmentTypeOptions = [
  "position",
  "department",
  "section",
  "team",
  "manager",
  "cost_center",
  "work_location",
  "shift_schedule",
  "payroll_group",
] as const;

const assignmentScopeOptions = ["primary", "temporary", "acting", "delegated", "project", "emergency"] as const;

const lookupByReferenceType: Record<string, string> = {
  hr_employees: "hr.employees.lookup",
  hr_org_units: "hr.org-units.lookup",
  hr_payroll_groups: "hr.employees.lookup",
  hr_positions: "hr.positions.lookup",
  hr_shift_schedules: "hr.employees.lookup",
};

export function HrAssignmentCreateForm({
  action,
  employeeId,
  employmentProfileId,
  preset,
}: Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  employeeId: string;
  employmentProfileId?: string;
  preset?: string;
}>) {
  const t = useTranslations();
  const initialPreset =
    HR_ASSIGNMENT_QUICK_ACTIONS.find((item) => item.actionKey === preset || item.label === preset) ??
    HR_ASSIGNMENT_QUICK_ACTIONS[0];
  const [assignmentType, setAssignmentType] = useState<string>(initialPreset.assignmentType);
  const [assignmentScope, setAssignmentScope] = useState<string>(initialPreset.assignmentScope);
  const [referenceEntityType, setReferenceEntityType] = useState(initialPreset.referenceEntityType);
  const providerKey = lookupByReferenceType[referenceEntityType] ?? "hr.org-units.lookup";

  const impactPreview = useMemo(
    () => [
      { label: t("hr.assignments.field.type"), value: assignmentType.replaceAll("_", " ") },
      { label: t("hr.common.scope"), value: assignmentScope },
      { label: t("hr.assignments.impact.effectiveDate"), value: t("hr.assignments.impact.effectiveDatePending") },
      {
        label: t("hr.assignments.impact.payrollReadiness"),
        value: t("hr.assignments.impact.payrollReadinessValue"),
      },
    ],
    [assignmentScope, assignmentType, t],
  );

  return (
    <form action={action} className="space-y-4 rounded-lg border p-5">
      <h2 className="font-medium">{t("hr.assignments.createTitle")}</h2>
      <div className="flex flex-wrap gap-2">
        {HR_ASSIGNMENT_QUICK_ACTIONS.map((item) => (
          <Button
            key={item.actionKey}
            onClick={() => {
              setAssignmentType(item.assignmentType);
              setAssignmentScope(item.assignmentScope);
              setReferenceEntityType(item.referenceEntityType);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {t(`hr.assignments.quick.${item.actionKey}`)}
          </Button>
        ))}
      </div>
      <input name="employeeId" type="hidden" value={employeeId} />
      <input name="employmentProfileId" type="hidden" value={employmentProfileId ?? ""} />
      <FieldGroup help={resolveHrFieldHelp("status")} isRequired label={t("hr.assignments.field.type")}>
        <select className={nativeSelectClassName} name="assignmentType" onChange={(event) => setAssignmentType(event.target.value)} required value={assignmentType}>
          {assignmentTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </FieldGroup>
      <FieldGroup label={t("hr.common.scope")}>
        <select className={nativeSelectClassName} name="assignmentScope" onChange={(event) => setAssignmentScope(event.target.value)} value={assignmentScope}>
          {assignmentScopeOptions.map((option) => (
            <option key={option} value={option}>
              {t(`hr.assignments.scope.${option}`)}
            </option>
          ))}
        </select>
      </FieldGroup>
      <EntityLookup key={providerKey} label={t("hr.assignments.field.targetEntity")} name="referenceEntityId" providerKey={providerKey} required />
      <input name="referenceEntityType" type="hidden" value={referenceEntityType} />
      <DatePickerField isRequired label={t("hr.common.effectiveFrom")} name="effectiveFrom" />
      <DatePickerField label={t("hr.common.effectiveTo")} name="effectiveTo" />
      <FieldGroup help={resolveHrFieldHelp("reason")} label={t("hr.common.reason")}>
        <textarea className={nativeTextareaClassName} name="reason" placeholder={t("hr.common.reason")} />
      </FieldGroup>
      <div className="rounded-md border bg-[hsl(var(--muted))] p-3 text-sm">
        <p className="font-medium">{t("hr.assignments.impactPreview")}</p>
        <ul className="mt-2 space-y-1">
          {impactPreview.map((item) => (
            <li key={item.label}>
              <span className="text-muted-foreground">{item.label}:</span> {item.value}
            </li>
          ))}
        </ul>
      </div>
      <Button type="submit" variant="primary">
        {t("hr.assignments.save")}
      </Button>
    </form>
  );
}

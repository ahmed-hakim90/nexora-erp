"use client";

import { useMemo, useState } from "react";

import { HR_ASSIGNMENT_QUICK_ACTIONS } from "@/features/hr/public-api";
import { resolveHrFieldHelp } from "@/features/hr/public-api";
import { Button, DatePickerField, EntityLookup, FieldGroup, nativeSelectClassName, nativeTextareaClassName } from "@/shared/ui";

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
  const initialPreset = HR_ASSIGNMENT_QUICK_ACTIONS.find((item) => item.label === preset) ?? HR_ASSIGNMENT_QUICK_ACTIONS[0];
  const [assignmentType, setAssignmentType] = useState<string>(initialPreset.assignmentType);
  const [assignmentScope, setAssignmentScope] = useState<string>(initialPreset.assignmentScope);
  const [referenceEntityType, setReferenceEntityType] = useState(initialPreset.referenceEntityType);
  const providerKey = lookupByReferenceType[referenceEntityType] ?? "hr.org-units.lookup";

  const impactPreview = useMemo(
    () => [
      { label: "Assignment type", value: assignmentType.replaceAll("_", " ") },
      { label: "Scope", value: assignmentScope },
      { label: "Effective date", value: "Set before save" },
      { label: "Payroll / attendance readiness", value: "Validated by assignment conflict engine on save" },
    ],
    [assignmentScope, assignmentType],
  );

  return (
    <form action={action} className="space-y-4 rounded-lg border p-5">
      <h2 className="font-medium">Create Assignment</h2>
      <div className="flex flex-wrap gap-2">
        {HR_ASSIGNMENT_QUICK_ACTIONS.map((item) => (
          <Button
            key={item.label}
            onClick={() => {
              setAssignmentType(item.assignmentType);
              setAssignmentScope(item.assignmentScope);
              setReferenceEntityType(item.referenceEntityType);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {item.label}
          </Button>
        ))}
      </div>
      <input name="employeeId" type="hidden" value={employeeId} />
      <input name="employmentProfileId" type="hidden" value={employmentProfileId ?? ""} />
      <FieldGroup help={resolveHrFieldHelp("status")} isRequired label="Assignment type">
        <select className={nativeSelectClassName} name="assignmentType" onChange={(event) => setAssignmentType(event.target.value)} required value={assignmentType}>
          {assignmentTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </FieldGroup>
      <FieldGroup label="Scope">
        <select className={nativeSelectClassName} name="assignmentScope" onChange={(event) => setAssignmentScope(event.target.value)} value={assignmentScope}>
          <option value="primary">Primary</option>
          <option value="temporary">Temporary</option>
          <option value="acting">Acting</option>
          <option value="delegated">Delegated</option>
          <option value="project">Project</option>
          <option value="emergency">Emergency</option>
        </select>
      </FieldGroup>
      <EntityLookup key={providerKey} label="Target entity" name="referenceEntityId" providerKey={providerKey} required />
      <input name="referenceEntityType" type="hidden" value={referenceEntityType} />
      <DatePickerField isRequired label="Effective from" name="effectiveFrom" />
      <DatePickerField label="Effective to" name="effectiveTo" />
      <FieldGroup help={resolveHrFieldHelp("reason")} label="Reason">
        <textarea className={nativeTextareaClassName} name="reason" placeholder="Reason" />
      </FieldGroup>
      <div className="rounded-md border bg-[hsl(var(--muted))] p-3 text-sm">
        <p className="font-medium">Impact preview</p>
        <ul className="mt-2 space-y-1">
          {impactPreview.map((item) => (
            <li key={item.label}>
              <span className="text-muted-foreground">{item.label}:</span> {item.value}
            </li>
          ))}
        </ul>
      </div>
      <Button type="submit" variant="primary">
        Save assignment
      </Button>
    </form>
  );
}

"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { HrEmployeeProfileData } from "@/features/hr/routes/loaders/hr-employee-profile.loader";
import { createHrAssignmentAction } from "@/features/hr/routes/actions/hr-employees.actions";
import { updateEmployeeQuickEditAction } from "@/features/hr/routes/actions/hr-operational.actions";
import {
  EditablePage,
  EditableProfileSection,
  EditableProfileWorkspace,
  useEditablePageContext,
  type ProfileFieldDefinition,
  type ProfileSectionDefinition,
} from "@/shared/ui";

import { HrAssignmentCreateForm } from "./hr-assignment-form";

const EMPLOYEE_ENTITY_FIELDS: readonly ProfileFieldDefinition[] = [
  { name: "fullName", label: "Full name", editorType: "text", isRequired: true, ownership: "entity" },
  { name: "employeeNumber", label: "Employee number", editorType: "text", isRequired: true, ownership: "entity" },
  { name: "nationalId", label: "National ID", editorType: "text", ownership: "entity" },
  { name: "birthDate", label: "Birth date", editorType: "date", ownership: "entity" },
  { name: "gender", label: "Gender", editorType: "text", ownership: "entity" },
  { name: "nationality", label: "Nationality", editorType: "text", ownership: "entity" },
  { name: "maritalStatus", label: "Marital status", editorType: "text", ownership: "entity" },
  { name: "email", label: "Email", editorType: "email", ownership: "entity" },
  { name: "phone", label: "Phone", editorType: "phone", ownership: "entity" },
];

const EMPLOYEE_ASSIGNMENT_FIELDS: readonly ProfileFieldDefinition[] = [
  {
    name: "position",
    label: "Position",
    ownership: "cross-engine",
    workflowKey: "position-assignment",
    workflowTitle: "Position Assignment",
  },
  {
    name: "department",
    label: "Department",
    ownership: "cross-engine",
    workflowKey: "department-assignment",
    workflowTitle: "Change Assignment",
  },
  {
    name: "manager",
    label: "Manager",
    ownership: "cross-engine",
    workflowKey: "manager-assignment",
    workflowTitle: "Manager Assignment",
  },
  {
    name: "branchLabel",
    label: "Branch",
    ownership: "readonly",
  },
  {
    name: "payrollGroupLabel",
    label: "Payroll group",
    ownership: "cross-engine",
    workflowKey: "payroll-group-assignment",
    workflowTitle: "Compensation Assignment",
  },
];

const WORKFLOW_PRESET_BY_FIELD: Readonly<Record<string, string>> = {
  department: "Change department",
  manager: "Change manager",
  payrollGroupLabel: "Change payroll group",
  position: "Change position",
};

function employeeRecord(data: HrEmployeeProfileData): Record<string, unknown> {
  return {
    ...data.employee,
    department: data.assignment.department?.label ?? null,
    manager: data.assignment.manager?.label ?? null,
    payrollGroupLabel: data.assignment.payrollGroupLabel,
    position: data.assignment.position?.label ?? null,
  };
}

function employeeExtraValues(employeeId: string) {
  return { employeeId };
}

function HrEmployeeWorkflowPanel({
  data,
  fieldName,
}: Readonly<{ data: HrEmployeeProfileData; fieldName: string }>) {
  const page = useEditablePageContext();
  const router = useRouter();
  const preset = WORKFLOW_PRESET_BY_FIELD[fieldName];

  if (!preset) {
    return <p className="text-sm text-muted-foreground">Workflow is not configured for this field.</p>;
  }

  return (
    <HrAssignmentCreateForm
      action={async (formData) => {
        await createHrAssignmentAction(formData);
        page?.closeWorkflow();
        router.refresh();
      }}
      employeeId={data.employee.id}
      preset={preset}
    />
  );
}

const EMPLOYEE_STATUS_FIELD: ProfileFieldDefinition = {
  name: "status",
  label: "Employment status",
  ownership: "readonly",
};

function buildEmployeeSections(
  data: HrEmployeeProfileData,
  sectionKeys?: readonly string[],
): readonly ProfileSectionDefinition[] {
  const sections: ProfileSectionDefinition[] = [
    {
      key: "personal",
      title: "Personal",
      description: "Employee-owned contact and identity fields.",
      fields: EMPLOYEE_ENTITY_FIELDS,
    },
    {
      key: "employment",
      title: "Employment",
      description: "Current employment status and organization context.",
      fields: [EMPLOYEE_STATUS_FIELD, ...EMPLOYEE_ASSIGNMENT_FIELDS],
    },
    {
      key: "assignments",
      title: "Current Organization Context",
      description: `Resolved through Assignment Engine as of ${data.assignment.asOfDate}`,
      fields: EMPLOYEE_ASSIGNMENT_FIELDS,
    },
  ];

  return sectionKeys ? sections.filter((section) => sectionKeys.includes(section.key)) : sections;
}

export function HrEmployeeEditableWorkspace({
  canManage = true,
  data,
  sectionKeys,
  showAuditSection = false,
  title,
}: Readonly<{
  canManage?: boolean;
  data: HrEmployeeProfileData;
  sectionKeys?: readonly string[];
  showAuditSection?: boolean;
  title?: string;
}>) {
  const router = useRouter();
  const record = useMemo(() => employeeRecord(data), [data]);
  const sections = useMemo(() => buildEmployeeSections(data, sectionKeys), [data, sectionKeys]);
  const fields = useMemo(
    () => sections.flatMap((section) => section.fields),
    [sections],
  );

  return (
    <EditableProfileWorkspace
      canEdit={canManage}
      entityId={data.employee.id}
      entityLabel={data.employee.fullName}
      entityType="hr_employee"
      extraValues={employeeExtraValues(data.employee.id)}
      fields={fields}
      record={record}
      renderWorkflow={(fieldName) => <HrEmployeeWorkflowPanel data={data} fieldName={fieldName} />}
      sections={sections}
      showAuditSection={showAuditSection}
      sourceScreen="hr.employee.profile"
      title={title}
      onSave={async (formData) => updateEmployeeQuickEditAction(formData)}
      onSaved={() => router.refresh()}
    />
  );
}

export function HrEmployeeProfileEditablePage({
  canManage = true,
  children,
  data,
}: Readonly<{
  canManage?: boolean;
  children: ReactNode;
  data: HrEmployeeProfileData;
}>) {
  const router = useRouter();
  const record = useMemo(() => employeeRecord(data), [data]);
  const fields = useMemo(() => [...EMPLOYEE_ENTITY_FIELDS, ...EMPLOYEE_ASSIGNMENT_FIELDS], []);

  return (
    <EditablePage
      canEdit={canManage}
      entityId={data.employee.id}
      entityLabel={data.employee.fullName}
      entityType="hr_employee"
      extraValues={employeeExtraValues(data.employee.id)}
      fields={fields}
      record={record}
      renderWorkflow={(fieldName) => <HrEmployeeWorkflowPanel data={data} fieldName={fieldName} />}
      sourceScreen="hr.employee.profile"
      onSave={async (formData) => updateEmployeeQuickEditAction(formData)}
      onSaved={() => router.refresh()}
    >
      {children}
    </EditablePage>
  );
}

export function HrEmployeePersonalSection({
  canManage = true,
  data,
}: Readonly<{ canManage?: boolean; data: HrEmployeeProfileData }>) {
  return <HrEmployeeEditableWorkspace canManage={canManage} data={data} sectionKeys={["personal"]} />;
}

export function HrEmployeeOverviewSections({
  canManage = true,
  data,
}: Readonly<{ canManage?: boolean; data: HrEmployeeProfileData }>) {
  return (
    <HrEmployeeEditableWorkspace
      canManage={canManage}
      data={data}
      sectionKeys={["personal", "assignments"]}
      title="Overview"
    />
  );
}

export function HrEmployeeEmploymentSection({
  canManage = true,
  data,
}: Readonly<{ canManage?: boolean; data: HrEmployeeProfileData }>) {
  return <HrEmployeeEditableWorkspace canManage={canManage} data={data} sectionKeys={["employment"]} title="Employment" />;
}

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
  useTranslations,
  type ProfileFieldDefinition,
  type ProfileSectionDefinition,
} from "@/shared/ui";

import { HrAssignmentCreateForm } from "./hr-assignment-form";
import { HrEmployeeHireCompletionCard } from "./hr-employee-hire-completion-card";

function useGenderOptions() {
  const t = useTranslations();
  return useMemo(
    () => [
      { label: t("hr.common.gender.female"), value: "female" },
      { label: t("hr.common.gender.male"), value: "male" },
      { label: t("hr.common.gender.other"), value: "other" },
      { label: t("hr.common.gender.undisclosed"), value: "undisclosed" },
    ],
    [t],
  );
}

function useMaritalStatusOptions() {
  const t = useTranslations();
  return useMemo(
    () => [
      { label: t("hr.common.maritalStatus.single"), value: "single" },
      { label: t("hr.common.maritalStatus.married"), value: "married" },
      { label: t("hr.common.maritalStatus.divorced"), value: "divorced" },
      { label: t("hr.common.maritalStatus.widowed"), value: "widowed" },
      { label: t("hr.common.maritalStatus.undisclosed"), value: "undisclosed" },
    ],
    [t],
  );
}

function useEmployeeEntityFields(): readonly ProfileFieldDefinition[] {
  const t = useTranslations();
  const genderOptions = useGenderOptions();
  const maritalStatusOptions = useMaritalStatusOptions();

  return useMemo(
    () => [
      { name: "fullName", label: t("hr.common.fullName"), editorType: "text", isRequired: true, ownership: "entity" },
      {
        name: "employeeNumber",
        label: t("hr.employees.profile.field.employeeCode"),
        editorType: "text",
        isRequired: true,
        ownership: "entity",
      },
      { name: "nationalId", label: t("hr.common.nationalId"), editorType: "text", ownership: "entity" },
      { name: "birthDate", label: t("hr.common.birthDate"), editorType: "date", ownership: "entity" },
      {
        name: "gender",
        label: t("hr.common.gender"),
        editorType: "select",
        ownership: "entity",
        selectOptions: genderOptions,
      },
      { name: "nationality", label: t("hr.common.nationality"), editorType: "text", ownership: "entity" },
      {
        name: "maritalStatus",
        label: t("hr.common.maritalStatus"),
        editorType: "select",
        ownership: "entity",
        selectOptions: maritalStatusOptions,
      },
      { name: "email", label: t("hr.common.email"), editorType: "email", ownership: "entity" },
      { name: "phone", label: t("hr.common.phone"), editorType: "phone", ownership: "entity" },
    ],
    [genderOptions, maritalStatusOptions, t],
  );
}

function useEmployeeAssignmentFields(): readonly ProfileFieldDefinition[] {
  const t = useTranslations();

  return useMemo(
    () => [
      {
        name: "position",
        label: t("hr.common.position"),
        ownership: "cross-engine",
        workflowKey: "position-assignment",
        workflowTitle: t("hr.employees.profile.workflow.positionAssignment"),
      },
      {
        name: "department",
        label: t("hr.common.department"),
        ownership: "cross-engine",
        workflowKey: "department-assignment",
        workflowTitle: t("hr.employees.profile.workflow.changeAssignment"),
      },
      {
        name: "manager",
        label: t("hr.common.manager"),
        ownership: "cross-engine",
        workflowKey: "manager-assignment",
        workflowTitle: t("hr.employees.profile.workflow.managerAssignment"),
      },
      {
        name: "branchLabel",
        label: t("hr.common.branch"),
        ownership: "readonly",
      },
      {
        name: "payrollGroupLabel",
        label: t("hr.common.payrollGroup"),
        ownership: "cross-engine",
        workflowKey: "payroll-group-assignment",
        workflowTitle: t("hr.employees.profile.workflow.compensationAssignment"),
      },
    ],
    [t],
  );
}

const WORKFLOW_PRESET_BY_FIELD: Readonly<Record<string, string>> = {
  department: "changeDepartment",
  manager: "changeManager",
  payrollGroupLabel: "changePayrollGroup",
  position: "changePosition",
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
  const t = useTranslations();
  const page = useEditablePageContext();
  const router = useRouter();
  const preset = WORKFLOW_PRESET_BY_FIELD[fieldName];

  if (!preset) {
    return <p className="text-sm text-muted-foreground">{t("hr.employees.profile.workflow.notConfigured")}</p>;
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

function useEmployeeStatusField(): ProfileFieldDefinition {
  const t = useTranslations();
  return useMemo(
    () => ({
      name: "status",
      label: t("hr.common.employmentStatus"),
      ownership: "readonly",
    }),
    [t],
  );
}

function buildEmployeeSections(
  data: HrEmployeeProfileData,
  labels: {
    assignmentsDescription: string;
    assignmentsTitle: string;
    employmentDescription: string;
    employmentTitle: string;
    personalDescription: string;
    personalTitle: string;
  },
  employeeAssignmentFields: readonly ProfileFieldDefinition[],
  employeeEntityFields: readonly ProfileFieldDefinition[],
  employeeStatusField: ProfileFieldDefinition,
  sectionKeys?: readonly string[],
): readonly ProfileSectionDefinition[] {
  const sections: ProfileSectionDefinition[] = [
    {
      key: "personal",
      title: labels.personalTitle,
      description: labels.personalDescription,
      fields: employeeEntityFields,
    },
    {
      key: "employment",
      title: labels.employmentTitle,
      description: labels.employmentDescription,
      fields: [employeeStatusField, ...employeeAssignmentFields],
    },
    {
      key: "assignments",
      title: labels.assignmentsTitle,
      description: labels.assignmentsDescription,
      fields: employeeAssignmentFields,
    },
  ];

  return sectionKeys ? sections.filter((section) => sectionKeys.includes(section.key)) : sections;
}

function HrEmployeeProfileSections({
  canManage = true,
  data,
  sectionKeys,
}: Readonly<{
  canManage?: boolean;
  data: HrEmployeeProfileData;
  sectionKeys?: readonly string[];
}>) {
  const t = useTranslations();
  const employeeEntityFields = useEmployeeEntityFields();
  const employeeAssignmentFields = useEmployeeAssignmentFields();
  const employeeStatusField = useEmployeeStatusField();
  const record = useMemo(() => employeeRecord(data), [data]);
  const sections = useMemo(
    () =>
      buildEmployeeSections(
        data,
        {
          assignmentsDescription: t("hr.employees.profile.section.assignmentsDescription", { date: data.assignment.asOfDate }),
          assignmentsTitle: t("hr.employees.profile.section.assignments"),
          employmentDescription: t("hr.employees.profile.section.employmentDescription"),
          employmentTitle: t("hr.employees.profile.section.employment"),
          personalDescription: t("hr.employees.profile.section.personalDescription"),
          personalTitle: t("hr.employees.profile.section.personal"),
        },
        employeeAssignmentFields,
        employeeEntityFields,
        employeeStatusField,
        sectionKeys,
      ),
    [
      data,
      employeeAssignmentFields,
      employeeEntityFields,
      employeeStatusField,
      sectionKeys,
      t,
    ],
  );

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <EditableProfileSection canEdit={canManage} key={section.key} record={record} section={section} />
      ))}
    </div>
  );
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
  const t = useTranslations();
  const router = useRouter();
  const page = useEditablePageContext();
  const employeeEntityFields = useEmployeeEntityFields();
  const employeeAssignmentFields = useEmployeeAssignmentFields();
  const employeeStatusField = useEmployeeStatusField();
  const record = useMemo(() => employeeRecord(data), [data]);
  const sections = useMemo(
    () =>
      buildEmployeeSections(
        data,
        {
          assignmentsDescription: t("hr.employees.profile.section.assignmentsDescription", { date: data.assignment.asOfDate }),
          assignmentsTitle: t("hr.employees.profile.section.assignments"),
          employmentDescription: t("hr.employees.profile.section.employmentDescription"),
          employmentTitle: t("hr.employees.profile.section.employment"),
          personalDescription: t("hr.employees.profile.section.personalDescription"),
          personalTitle: t("hr.employees.profile.section.personal"),
        },
        employeeAssignmentFields,
        employeeEntityFields,
        employeeStatusField,
        sectionKeys,
      ),
    [
      data,
      employeeAssignmentFields,
      employeeEntityFields,
      employeeStatusField,
      sectionKeys,
      t,
    ],
  );
  const fields = useMemo(
    () => sections.flatMap((section) => section.fields),
    [sections],
  );

  if (page) {
    return <HrEmployeeProfileSections canManage={canManage} data={data} sectionKeys={sectionKeys} />;
  }

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
  const employeeEntityFields = useEmployeeEntityFields();
  const employeeAssignmentFields = useEmployeeAssignmentFields();
  const record = useMemo(() => employeeRecord(data), [data]);
  const fields = useMemo(() => [...employeeEntityFields, ...employeeAssignmentFields], [employeeAssignmentFields, employeeEntityFields]);

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
      toolbarPlacement="embedded"
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
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <HrEmployeeHireCompletionCard employeeId={data.employee.id} hireReadiness={data.hireReadiness} />
      <HrEmployeeEditableWorkspace
        canManage={canManage}
        data={data}
        sectionKeys={["personal", "assignments"]}
        title={t("hr.employees.profile.overview")}
      />
    </div>
  );
}

export function HrEmployeeEmploymentSection({
  canManage = true,
  data,
}: Readonly<{ canManage?: boolean; data: HrEmployeeProfileData }>) {
  const t = useTranslations();

  return (
    <HrEmployeeEditableWorkspace
      canManage={canManage}
      data={data}
      sectionKeys={["employment"]}
      title={t("hr.employees.profile.section.employment")}
    />
  );
}

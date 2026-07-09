import { listUploadDocumentTypeOptions } from "./hr-document-kind.registry";

export const HR_DOCUMENT_TYPES = listUploadDocumentTypeOptions().map((option) => ({
  label: option.label,
  value: option.value,
}));

export const HR_DOCUMENT_STATUSES = ["active", "expired", "missing", "archived"] as const;

export const HR_CUSTODY_ASSET_TYPES = [
  { label: "Laptop", value: "laptop" },
  { label: "Mobile", value: "mobile" },
  { label: "Car", value: "car" },
  { label: "Uniform", value: "uniform" },
  { label: "Tools", value: "tools" },
  { label: "Keys", value: "keys" },
  { label: "Other", value: "other" },
] as const;

export const HR_REQUEST_TYPES = [
  { actionType: "leave", label: "Leave Request" },
  { actionType: "attendance_adjustment", label: "Overtime Request" },
  { actionType: "advance", label: "Advance Request" },
  { actionType: "loan", label: "Loan Request" },
  { actionType: "custom_hr_action", label: "Salary Letter", metadataType: "salary_letter" },
  { actionType: "custom_hr_action", label: "Certificate Request", metadataType: "certificate_request" },
  { actionType: "custody_assignment", label: "Equipment Request" },
  { actionType: "resignation", label: "Resignation Request" },
  { actionType: "transfer", label: "Transfer Request" },
  { actionType: "document_renewal", label: "Contract Change Request" },
] as const;

export const HR_REPORT_CARDS = [
  { description: "Active employees with assignment-resolved context.", href: "/erp/hr/employees", label: "Employee Directory", labelAr: "دليل الموظفين" },
  { description: "Departments, sections, and teams hierarchy.", href: "/erp/hr/organization", label: "Organization Structure", labelAr: "الهيكل التنظيمي" },
  { description: "Assignment history and effective dating.", href: "/erp/hr/assignments", label: "Assignment History", labelAr: "سجل التعيينات" },
  { description: "Contracts ending within 60 days.", href: "/erp/hr/contracts", label: "Contract Expiry", labelAr: "انتهاء العقود" },
  { description: "Employee documents with expiry alerts.", href: "/erp/hr/documents", label: "Document Expiry", labelAr: "انتهاء المستندات" },
  { description: "Leave balances and requests readiness.", href: "/erp/hr/attendance-leave", label: "Leave Balance", labelAr: "رصيد الإجازات" },
  { description: "Payroll readiness exceptions.", href: "/erp/hr/payroll-readiness", label: "Payroll Readiness", labelAr: "جاهزية الرواتب" },
  { description: "Assigned assets and custody history.", href: "/erp/hr/custody", label: "Custody Report", labelAr: "تقرير العهدة" },
  { description: "Skills and competencies matrix readiness.", href: "/erp/hr/skills-competencies/skills", label: "Skills Matrix", labelAr: "مصفوفة المهارات" },
  { description: "Vacant and partially filled positions.", href: "/erp/hr/positions-jobs/positions", label: "Vacancy Report", labelAr: "تقرير الشواغر" },
] as const;

export const HR_ASSIGNMENT_QUICK_ACTIONS = [
  { actionKey: "changeDepartment", assignmentScope: "primary", assignmentType: "department", label: "Change department", referenceEntityType: "hr_org_units" },
  { actionKey: "changePosition", assignmentScope: "primary", assignmentType: "position", label: "Change position", referenceEntityType: "hr_positions" },
  { actionKey: "changeManager", assignmentScope: "primary", assignmentType: "manager", label: "Change manager", referenceEntityType: "hr_employees" },
  { actionKey: "changeShift", assignmentScope: "primary", assignmentType: "shift_schedule", label: "Change shift", referenceEntityType: "hr_shift_schedules" },
  { actionKey: "changePayrollGroup", assignmentScope: "primary", assignmentType: "payroll_group", label: "Change payroll group", referenceEntityType: "hr_payroll_groups" },
  { actionKey: "temporaryAssignment", assignmentScope: "temporary", assignmentType: "department", label: "Temporary assignment", referenceEntityType: "hr_org_units" },
  { actionKey: "actingAssignment", assignmentScope: "acting", assignmentType: "position", label: "Acting assignment", referenceEntityType: "hr_positions" },
] as const;

import { HR_PERMISSIONS } from "../permissions/permission-registry";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { WorkspaceNavigationGroupKey } from "@/shared/ui/app-shell/workspace-navigation.types";

export type HrNavItem = Readonly<{
  key: string;
  label: string;
  href: string;
  permission: PermissionKey;
  labelAr?: string;
  group?: WorkspaceNavigationGroupKey;
  priority?: number;
  fullLabel?: string;
  mobileLabel?: string;
}>;

export const HR_NAV_ITEMS: readonly HrNavItem[] = [
  { key: "dashboard", label: "HR Dashboard", labelAr: "لوحة الموارد البشرية", href: "/erp/hr", permission: HR_PERMISSIONS.view, group: "overview", priority: 0 },
  { key: "employees", label: "Employees", labelAr: "الموظفين", href: "/erp/hr/employees", permission: HR_PERMISSIONS.employeesView, group: "personal", priority: 10 },
  { key: "organization", label: "Organization", labelAr: "الهيكل التنظيمي", href: "/erp/hr/organization", permission: HR_PERMISSIONS.positionsView, group: "personal", priority: 20 },
  { key: "positions-jobs", label: "Positions & Jobs", labelAr: "المناصب والوظائف", href: "/erp/hr/positions-jobs", permission: HR_PERMISSIONS.jobsView, group: "personal", priority: 30 },
  { key: "skills-competencies", label: "Skills & Competencies", labelAr: "المهارات والكفاءات", href: "/erp/hr/skills-competencies/skills", permission: HR_PERMISSIONS.skillsView, group: "personal", priority: 40 },
  { key: "assignments", label: "Assignments", labelAr: "التعيينات", href: "/erp/hr/assignments", permission: HR_PERMISSIONS.assignmentsView, group: "employment", priority: 10 },
  { key: "contracts", label: "Contracts", labelAr: "العقود", href: "/erp/hr/contracts", permission: HR_PERMISSIONS.contractsView, group: "employment", priority: 20 },
  { key: "compensation", label: "Compensation", labelAr: "التعويضات", href: "/erp/hr/compensation", permission: HR_PERMISSIONS.compensationView, group: "employment", priority: 30 },
  { key: "attendance-leave", label: "Attendance & Leave", labelAr: "الحضور والإجازات", href: "/erp/hr/attendance-leave", permission: HR_PERMISSIONS.leaveView, group: "attendance", priority: 10 },
  { key: "leave-management", label: "Leave Management", labelAr: "إدارة الإجازات", href: "/erp/hr/leave", permission: HR_PERMISSIONS.leaveView, group: "attendance", priority: 20 },
  { key: "leave-reports", label: "Leave Reports", labelAr: "تقارير الإجازات", href: "/erp/hr/leave/reports", permission: HR_PERMISSIONS.leaveReportsView, group: "attendance", priority: 30 },
  { key: "attendance-devices", label: "Attendance Devices", labelAr: "أجهزة الحضور", href: "/erp/hr/attendance-devices", permission: HR_PERMISSIONS.leaveView, group: "attendance", priority: 40 },
  { key: "attendance-live", label: "Attendance Live", labelAr: "الحضور المباشر", href: "/erp/hr/attendance-live", permission: HR_PERMISSIONS.attendanceMonitorView, group: "attendance", priority: 50 },
  { key: "attendance-processing", label: "Attendance Processing", labelAr: "معالجة الحضور", href: "/erp/hr/attendance-processing", permission: HR_PERMISSIONS.attendanceView, group: "attendance", priority: 60 },
  { key: "attendance-export", label: "Attendance Export", labelAr: "تصدير الحضور", href: "/erp/hr/attendance-export", permission: HR_PERMISSIONS.attendanceExport, group: "attendance", priority: 70 },
  { key: "overtime", label: "Overtime", labelAr: "الوقت الإضافي", href: "/erp/hr/overtime", permission: HR_PERMISSIONS.overtimeView, group: "attendance", priority: 80 },
  { key: "overtime-reports", label: "Overtime Reports", labelAr: "تقارير الوقت الإضافي", href: "/erp/hr/overtime/reports", permission: HR_PERMISSIONS.overtimeExport, group: "attendance", priority: 90 },
  { key: "late-early", label: "Late / Early", labelAr: "التأخير والانصراف المبكر", href: "/erp/hr/late-early", permission: HR_PERMISSIONS.lateView, group: "attendance", priority: 95 },
  { key: "late-early-reports", label: "Late/Early Reports", labelAr: "تقارير التأخير والانصراف", href: "/erp/hr/late-early/reports", permission: HR_PERMISSIONS.lateExport, group: "attendance", priority: 96 },
  { key: "shifts", label: "Shifts", labelAr: "الورديات", href: "/erp/hr/shifts", permission: HR_PERMISSIONS.shiftsView, group: "attendance", priority: 97 },
  { key: "time-policies", label: "Time Policies", labelAr: "سياسات الوقت", href: "/erp/hr/time-policies", permission: HR_PERMISSIONS.manage, group: "attendance", priority: 100 },
  { key: "payroll-readiness", label: "Payroll Readiness", labelAr: "جاهزية الرواتب", href: "/erp/hr/payroll-readiness", permission: HR_PERMISSIONS.payrollView, group: "payroll", priority: 10 },
  { key: "advances", label: "Advances", labelAr: "السلف", href: "/erp/hr/advances", permission: HR_PERMISSIONS.compensationView, group: "financial", priority: 10 },
  { key: "loans", label: "Loans", labelAr: "القروض", href: "/erp/hr/loans", permission: HR_PERMISSIONS.compensationView, group: "financial", priority: 20 },
  { key: "bonuses", label: "Bonuses", labelAr: "المكافآت", href: "/erp/hr/bonuses", permission: HR_PERMISSIONS.compensationView, group: "financial", priority: 30 },
  { key: "incentives", label: "Incentives", labelAr: "الحوافز", href: "/erp/hr/incentives", permission: HR_PERMISSIONS.compensationView, group: "financial", priority: 40 },
  { key: "penalties", label: "Penalties", labelAr: "الجزاءات", href: "/erp/hr/penalties", permission: HR_PERMISSIONS.employeesView, group: "financial", priority: 50 },
  { key: "bank-accounts", label: "Bank Accounts", labelAr: "الحسابات البنكية", href: "/erp/hr/bank-accounts", permission: HR_PERMISSIONS.compensationView, group: "financial", priority: 60 },
  { key: "recruitment", label: "Recruitment", labelAr: "التوظيف", href: "/erp/hr/recruitment", permission: HR_PERMISSIONS.employeesView, group: "talent", priority: 10 },
  { key: "onboarding", label: "Onboarding", labelAr: "التهيئة والانضمام", href: "/erp/hr/onboarding", permission: HR_PERMISSIONS.employeesView, group: "talent", priority: 20 },
  { key: "training", label: "Training", labelAr: "التدريب", href: "/erp/hr/training", permission: HR_PERMISSIONS.employeesView, group: "talent", priority: 30 },
  { key: "performance", label: "Performance", labelAr: "تقييم الأداء", href: "/erp/hr/performance", permission: HR_PERMISSIONS.employeesView, group: "talent", priority: 40 },
  { key: "succession", label: "Succession", labelAr: "التعاقب الوظيفي", href: "/erp/hr/succession", permission: HR_PERMISSIONS.employeesView, group: "talent", priority: 50 },
  { key: "requests", label: "Requests", labelAr: "الطلبات", href: "/erp/hr/requests", permission: HR_PERMISSIONS.actionsView, group: "documents", priority: 10 },
  { key: "documents", label: "Documents", labelAr: "المستندات", href: "/erp/hr/documents", permission: HR_PERMISSIONS.employeesView, group: "documents", priority: 20 },
  { key: "custody", label: "Custody / Assets", labelAr: "العهد والأصول", href: "/erp/hr/custody", permission: HR_PERMISSIONS.employeesView, group: "documents", priority: 30 },
  { key: "dashboard-department", label: "Department Dashboard", labelAr: "لوحة القسم", href: "/erp/hr/dashboards/department", permission: HR_PERMISSIONS.view, group: "reports", priority: 10 },
  { key: "dashboard-executive", label: "Executive Dashboard", labelAr: "لوحة الإدارة", href: "/erp/hr/dashboards/executive", permission: HR_PERMISSIONS.view, group: "reports", priority: 20 },
  { key: "reports", label: "Reports", labelAr: "التقارير", href: "/erp/hr/reports", permission: HR_PERMISSIONS.reportsView, group: "reports", priority: 30 },
  { key: "settings", label: "Settings", labelAr: "الإعدادات", href: "/erp/hr/settings", permission: HR_PERMISSIONS.manage, group: "administration", priority: 10 },
] as const;

export function filterHrNavByPermissions(
  permissions: ReadonlySet<PermissionKey> | readonly PermissionKey[],
): readonly HrNavItem[] {
  const granted = permissions instanceof Set ? permissions : new Set(permissions);
  return HR_NAV_ITEMS.filter((item) => granted.has(item.permission));
}

export function resolveHrActiveNavKey(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "") || "/erp/hr";
  const match = [...HR_NAV_ITEMS]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => normalized === item.href || normalized.startsWith(`${item.href}/`));
  return match?.key ?? "dashboard";
}

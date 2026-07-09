import {
  defineSearchProvider,
  type SearchContext,
  type SearchProvider,
  type SearchResult,
} from "@/platform/search/public-api";

import { HR_PERMISSIONS } from "../permissions/permission-registry";
import { HR_NAV_ITEMS } from "./hr-navigation";

const HR_OPERATIONAL_SHORTCUTS = [
  { href: "/erp/hr", keywords: ["dashboard", "operations", "overview", "kpi"], label: "HR Dashboard", permission: HR_PERMISSIONS.view },
  { href: "/erp/hr/leave", keywords: ["leave", "vacation", "absence", "approval"], label: "Leave Management", permission: HR_PERMISSIONS.leaveView },
  { href: "/erp/hr/attendance-live", keywords: ["attendance", "live", "presence", "exceptions"], label: "Attendance Live", permission: HR_PERMISSIONS.attendanceMonitorView },
  { href: "/erp/hr/overtime?tab=candidates", keywords: ["overtime", "ot", "candidates"], label: "Overtime Candidates", permission: HR_PERMISSIONS.overtimeView },
  { href: "/erp/hr/late-early", keywords: ["late", "early", "violations"], label: "Late / Early", permission: HR_PERMISSIONS.lateView },
  { href: "/erp/hr/payroll-readiness", keywords: ["payroll", "readiness", "period", "wps"], label: "Payroll Readiness", permission: HR_PERMISSIONS.payrollView },
  { href: "/erp/hr/assignments", keywords: ["assignment", "temporary", "acting"], label: "Assignments", permission: HR_PERMISSIONS.assignmentsView },
  { href: "/erp/hr/employees?wizard=1", keywords: ["employee", "hire", "onboard", "create"], label: "Add Employee", permission: HR_PERMISSIONS.employeesView },
] as const;

function hasPermission(context: SearchContext, permission: string): boolean {
  return [...(context.grantedPermissions ?? [])].some((granted) => granted === permission);
}

function matchesSearchTerm(term: string, values: readonly string[]): boolean {
  if (term.length < 2) return false;
  const haystack = values.join(" ").toLowerCase();
  return term.split(/\s+/u).every((token) => haystack.includes(token));
}

function mapNavResults(queryTerm: string, context: SearchContext): readonly SearchResult[] {
  return HR_NAV_ITEMS
    .filter((item) => hasPermission(context, item.permission))
    .filter((item) =>
      matchesSearchTerm(queryTerm, [
        item.label,
        item.labelAr ?? "",
        item.key,
        item.href,
        item.group ?? "",
      ]),
    )
    .map((item) => ({
      appKey: "hr",
      entityId: item.key,
      entityType: "hr_navigation",
      href: item.href,
      moduleKey: "hr",
      rank: item.key === "dashboard" ? 25 : 12,
      requiredPermissions: [item.permission],
      sensitivity: "internal" as const,
      subtitle: `HR · ${item.group ?? "navigation"}`,
      title: item.label,
      type: "navigation" as const,
    }));
}

function mapShortcutResults(queryTerm: string, context: SearchContext): readonly SearchResult[] {
  return HR_OPERATIONAL_SHORTCUTS
    .filter((item) => hasPermission(context, item.permission))
    .filter((item) => matchesSearchTerm(queryTerm, [item.label, ...item.keywords, item.href]))
    .map((item) => ({
      appKey: "hr",
      entityId: item.href,
      entityType: "hr_operational_shortcut",
      href: item.href,
      moduleKey: "hr",
      rank: 22,
      requiredPermissions: [item.permission],
      sensitivity: "internal" as const,
      subtitle: "HR operational shortcut",
      title: item.label,
      type: "command" as const,
    }));
}

export function createHrNavigationSearchProvider(): SearchProvider {
  return defineSearchProvider({
    appKey: "hr",
    entityTypes: ["hr_navigation"],
    key: "hr.navigation.search",
    moduleKey: "hr",
    requiredPermissions: [HR_PERMISSIONS.view],
    searchableEntities: [{
      displayName: "HR Navigation",
      entityType: "hr_navigation",
      moduleKey: "hr",
      quickSearchFields: ["label", "href", "group"],
      rankingStrategy: "exact-first",
      resultType: "navigation",
    }],
    source: "navigation",
    supportedExperiences: ["erp"],
    search: (query, context) => mapNavResults(query.normalizedTerm, context),
  });
}

export function createHrOperationalShortcutSearchProvider(): SearchProvider {
  return defineSearchProvider({
    appKey: "hr",
    entityTypes: ["hr_operational_shortcut"],
    key: "hr.operations.shortcuts",
    moduleKey: "hr",
    requiredPermissions: [HR_PERMISSIONS.view],
    searchableEntities: [{
      displayName: "HR Operational Shortcuts",
      entityType: "hr_operational_shortcut",
      moduleKey: "hr",
      quickSearchFields: ["label", "keywords"],
      rankingStrategy: "exact-first",
      resultType: "command",
    }],
    source: "command",
    supportedExperiences: ["erp"],
    search: (query, context) => mapShortcutResults(query.normalizedTerm, context),
  });
}

export function createHrRuntimeRecordSearchProvider(): SearchProvider {
  return defineSearchProvider({
    appKey: "hr",
    entityTypes: [
      "hr_employee",
      "hr_contract",
      "hr_position",
      "hr_action_request",
      "hr_leave_request",
      "hr_overtime_candidate",
      "hr_late_early_violation",
    ],
    key: "hr.runtime.records",
    moduleKey: "hr",
    requiredPermissions: [HR_PERMISSIONS.searchView],
    searchableEntities: [
      {
        appKey: "hr",
        displayName: "Employees",
        entityType: "hr_employee",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.employeesView],
          sensitivity: "restricted",
        },
        quickSearchFields: ["fullName", "employeeNumber", "attendanceCode", "nationalId"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "Contracts",
        entityType: "hr_contract",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.contractsView],
          sensitivity: "restricted",
        },
        quickSearchFields: ["contractNumber", "employeeName"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "Positions",
        entityType: "hr_position",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.positionsView],
          sensitivity: "sensitive",
        },
        quickSearchFields: ["name", "positionKey"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "HR Requests",
        entityType: "hr_action_request",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.actionsView],
          sensitivity: "internal",
        },
        quickSearchFields: ["documentNumber", "actionType"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "Leave Requests",
        entityType: "hr_leave_request",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.leaveView],
          sensitivity: "restricted",
        },
        quickSearchFields: ["employeeName", "status", "startsOn"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "Overtime Candidates",
        entityType: "hr_overtime_candidate",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.overtimeView],
          sensitivity: "internal",
        },
        quickSearchFields: ["employeeName", "workDate", "status"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
      {
        appKey: "hr",
        displayName: "Late / Early Violations",
        entityType: "hr_late_early_violation",
        moduleKey: "hr",
        permissionPolicy: {
          hideWhenUnauthorized: true,
          requiredPermissions: [HR_PERMISSIONS.lateView],
          sensitivity: "internal",
        },
        quickSearchFields: ["employeeName", "violationKind", "status"],
        rankingStrategy: "weighted",
        resultType: "record",
      },
    ],
    source: "app",
    supportedExperiences: ["erp"],
    search: async (query) => {
      if (query.normalizedTerm.length < 2 || typeof window === "undefined") {
        return [];
      }

      try {
        const response = await fetch(
          new URL(`/api/erp/search?term=${encodeURIComponent(query.term.trim())}&limit=${query.limit ?? 8}`, window.location.origin),
          { credentials: "same-origin" },
        );

        if (!response.ok) {
          return [];
        }

        const payload = (await response.json()) as { records?: SearchResult[] };
        return payload.records ?? [];
      } catch {
        return [];
      }
    },
  });
}

export function createHrWorkspaceSearchProviders(): readonly SearchProvider[] {
  return [
    createHrNavigationSearchProvider(),
    createHrOperationalShortcutSearchProvider(),
    createHrRuntimeRecordSearchProvider(),
  ];
}

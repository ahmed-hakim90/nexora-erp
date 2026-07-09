import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission, hasServerPermission } from "@/platform/permissions/server";
import type { SearchResult } from "@/platform/search/public-api";

import { formatHrDisplayLabel, formatHrStatusLabel } from "../utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function matchesOperationalStatusTerm(term: string): boolean {
  const normalized = term.trim().toLowerCase();
  return ["pending", "submitted", "under review", "under_review", "awaiting", "review"].some((token) =>
    normalized.includes(token),
  );
}

function matchesTerm(term: string, values: readonly (string | null | undefined)[]): boolean {
  const tokens = term.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (tokens.length === 0) return false;
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export async function searchHrWorkspaceRecords(
  term: string,
  limit = 8,
): Promise<readonly SearchResult[]> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.searchView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const normalizedTerm = term.trim();
  if (normalizedTerm.length < 2) {
    return [];
  }

  const ilikeTerm = escapeIlike(normalizedTerm);
  const results: SearchResult[] = [];

  const [canSearchEmployees, canSearchContracts, canSearchPositions, canSearchRequests, canSearchLeave, canSearchOvertime, canSearchLateEarly] =
    await Promise.all([
    hasServerPermission({ context, permission: HR_PERMISSIONS.employeesView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.contractsView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.positionsView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.actionsView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.leaveView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.overtimeView }),
    hasServerPermission({ context, permission: HR_PERMISSIONS.lateView }),
  ]);

  const matchingEmployeeIds = canSearchEmployees
    ? (
        await supabase
          .from("hr_employees")
          .select("id")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null)
          .or(
            `employee_number.ilike.%${ilikeTerm}%,full_name.ilike.%${ilikeTerm}%,national_id.ilike.%${ilikeTerm}%,attendance_code.ilike.%${ilikeTerm}%`,
          )
          .limit(limit)
      ).data?.map((row) => String(row.id)) ?? []
    : [];

  const queries: Promise<void>[] = [];

  if (canSearchEmployees) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("hr_employees")
          .select("id, employee_number, attendance_code, full_name, national_id, status")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null)
          .or(
            `employee_number.ilike.%${ilikeTerm}%,full_name.ilike.%${ilikeTerm}%,national_id.ilike.%${ilikeTerm}%,attendance_code.ilike.%${ilikeTerm}%`,
          )
          .order("full_name", { ascending: true })
          .limit(limit);

        if (error) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not search employees.", cause: error });
        }

        for (const row of data ?? []) {
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_employee",
            href: `/erp/hr/employees/${String(row.id)}`,
            moduleKey: "hr",
            rank: 30,
            requiredPermissions: [HR_PERMISSIONS.employeesView],
            sensitivity: "restricted",
            subtitle: `${formatHrDisplayLabel(row.employee_number, "—")} · ${formatHrStatusLabel(String(row.status))}`,
            title: formatHrDisplayLabel(row.full_name, "Employee"),
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchContracts) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("hr_contracts")
          .select("id, contract_number, status, starts_on, ends_on, hr_employees(full_name, employee_number)")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null)
          .ilike("contract_number", `%${ilikeTerm}%`)
          .order("starts_on", { ascending: false })
          .limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          const employee = row.hr_employees as { employee_number?: string; full_name?: string } | null;
          const employeeLabel = formatHrDisplayLabel(employee?.full_name, "Employee");
          if (!matchesTerm(normalizedTerm, [row.contract_number as string, employee?.full_name, employee?.employee_number])) {
            continue;
          }
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_contract",
            href: `/erp/hr/contracts?edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 24,
            requiredPermissions: [HR_PERMISSIONS.contractsView],
            sensitivity: "restricted",
            subtitle: `${employeeLabel} · ${formatHrStatusLabel(String(row.status))}`,
            title: formatHrDisplayLabel(row.contract_number, "Contract"),
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchPositions) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("hr_positions")
          .select("id, position_key, name, vacancy_status, status")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null)
          .or(`position_key.ilike.%${ilikeTerm}%,name.ilike.%${ilikeTerm}%`)
          .order("name", { ascending: true })
          .limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_position",
            href: `/erp/hr/positions-jobs?edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 20,
            requiredPermissions: [HR_PERMISSIONS.positionsView],
            sensitivity: "sensitive",
            subtitle: `${formatHrStatusLabel(String(row.vacancy_status))} · ${formatHrStatusLabel(String(row.status))}`,
            title: formatHrDisplayLabel(row.name, "Position"),
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchRequests) {
    queries.push(
      (async () => {
        const { data, error } = await supabase
          .from("hr_action_documents")
          .select("id, action_type, status, document_number")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null)
          .or(`document_number.ilike.%${ilikeTerm}%,action_type.ilike.%${ilikeTerm}%`)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_action_request",
            href: `/erp/hr/requests?edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 18,
            requiredPermissions: [HR_PERMISSIONS.actionsView],
            sensitivity: "internal",
            subtitle: formatHrStatusLabel(String(row.status)),
            title: formatHrDisplayLabel(row.document_number ?? row.action_type, "HR request"),
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchLeave && (matchingEmployeeIds.length > 0 || matchesOperationalStatusTerm(normalizedTerm))) {
    queries.push(
      (async () => {
        let leaveQuery = supabase
          .from("hr_leave_requests")
          .select("id, status, starts_on, ends_on, employee_id, hr_employees(full_name, employee_number)")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null);

        if (matchingEmployeeIds.length > 0) {
          leaveQuery = leaveQuery.in("employee_id", matchingEmployeeIds);
        } else {
          leaveQuery = leaveQuery.in("status", ["submitted", "under_review"]);
        }

        const { data, error } = await leaveQuery.order("starts_on", { ascending: false }).limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          const employee = row.hr_employees as { employee_number?: string; full_name?: string } | null;
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_leave_request",
            href: `/erp/hr/leave?edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 26,
            requiredPermissions: [HR_PERMISSIONS.leaveView],
            sensitivity: "restricted",
            subtitle: `${formatHrDisplayLabel(employee?.full_name, "Employee")} · ${formatHrStatusLabel(String(row.status))}`,
            title: `Leave ${String(row.starts_on)} → ${String(row.ends_on)}`,
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchOvertime && (matchingEmployeeIds.length > 0 || matchesOperationalStatusTerm(normalizedTerm))) {
    queries.push(
      (async () => {
        let overtimeQuery = supabase
          .from("hr_overtime_candidates")
          .select("id, status, work_date, candidate_minutes, employee_id, hr_employees(full_name, employee_number)")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null);

        if (matchingEmployeeIds.length > 0) {
          overtimeQuery = overtimeQuery.in("employee_id", matchingEmployeeIds);
        } else {
          overtimeQuery = overtimeQuery.eq("status", "pending");
        }

        const { data, error } = await overtimeQuery.order("work_date", { ascending: false }).limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          const employee = row.hr_employees as { employee_number?: string; full_name?: string } | null;
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_overtime_candidate",
            href: `/erp/hr/overtime?tab=candidates&edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 23,
            requiredPermissions: [HR_PERMISSIONS.overtimeView],
            sensitivity: "internal",
            subtitle: `${formatHrDisplayLabel(employee?.full_name, "Employee")} · ${formatHrStatusLabel(String(row.status))}`,
            title: `OT candidate on ${String(row.work_date)}`,
            type: "record",
          });
        }
      })(),
    );
  }

  if (canSearchLateEarly && (matchingEmployeeIds.length > 0 || matchesOperationalStatusTerm(normalizedTerm))) {
    queries.push(
      (async () => {
        let lateEarlyQuery = supabase
          .from("hr_late_early_violations")
          .select("id, status, work_date, violation_kind, employee_id, hr_employees(full_name, employee_number)")
          .eq("tenant_id", context.tenantId)
          .eq("company_id", context.companyId)
          .is("deleted_at", null);

        if (matchingEmployeeIds.length > 0) {
          lateEarlyQuery = lateEarlyQuery.in("employee_id", matchingEmployeeIds);
        } else {
          lateEarlyQuery = lateEarlyQuery.eq("status", "submitted");
        }

        const { data, error } = await lateEarlyQuery.order("work_date", { ascending: false }).limit(limit);

        if (error) return;

        for (const row of data ?? []) {
          const employee = row.hr_employees as { employee_number?: string; full_name?: string } | null;
          results.push({
            appKey: "hr",
            entityId: String(row.id),
            entityType: "hr_late_early_violation",
            href: `/erp/hr/late-early?edit=${String(row.id)}`,
            moduleKey: "hr",
            rank: 21,
            requiredPermissions: [HR_PERMISSIONS.lateView],
            sensitivity: "internal",
            subtitle: `${formatHrDisplayLabel(employee?.full_name, "Employee")} · ${formatHrStatusLabel(String(row.status))}`,
            title: `${formatHrStatusLabel(String(row.violation_kind))} on ${String(row.work_date)}`,
            type: "record",
          });
        }
      })(),
    );
  }

  await Promise.all(queries);

  return results
    .sort((left, right) => (right.rank ?? 0) - (left.rank ?? 0) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

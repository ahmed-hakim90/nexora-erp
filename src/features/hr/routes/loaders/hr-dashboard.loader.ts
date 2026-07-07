import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import type { HrDashboardMetrics, HrTimelineEntry } from "../../application/types/hr-ui.types";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrDashboardData = Readonly<{
  metrics: HrDashboardMetrics;
  recentChanges: readonly HrTimelineEntry[];
  pendingApprovals: readonly { id: string; label: string; status: string }[];
  alerts: readonly { id: string; label: string; severity: "info" | "warning" | "error" }[];
}>;

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function loadHrDashboardWorkspace(): Promise<HrDashboardData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [
    employeesResult,
    lifecycleResult,
    contractsResult,
    timelineResult,
    actionsResult,
    positionsResult,
    payrollExceptionsResult,
    payslipDraftResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select("id, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null),
    supabase
      .from("hr_employee_lifecycle_states")
      .select("id, lifecycle_state")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("lifecycle_state", "probation")
      .is("deleted_at", null),
    supabase
      .from("hr_contracts")
      .select("id, ends_on, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .lte("ends_on", addDaysIso(60))
      .gte("ends_on", new Date().toISOString().slice(0, 10)),
    supabase
      .from("hr_employee_timeline_events")
      .select("id, event_type, occurred_at, source_document_type")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(8),
    supabase
      .from("hr_action_documents")
      .select("id, action_type, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["submitted", "under_review"])
      .is("deleted_at", null)
      .limit(10),
    supabase
      .from("hr_positions")
      .select("id, vacancy_status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("vacancy_status", ["vacant", "partially-filled"])
      .is("deleted_at", null),
    supabase
      .from("hr_payroll_validation_results")
      .select("id, severity")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("severity", "error")
      .is("deleted_at", null)
      .limit(100),
    supabase
      .from("hr_payslip_publications")
      .select("id, publishing_status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .neq("publishing_status", "published")
      .is("deleted_at", null)
      .limit(100),
    supabase
      .from("file_attachments")
      .select("id, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("module_key", "hr")
      .eq("entity_type", "hr_employee_document")
      .is("deleted_at", null)
      .limit(200),
  ]);

  for (const result of [employeesResult, lifecycleResult, contractsResult, timelineResult, actionsResult, positionsResult]) {
    if (result.error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load HR dashboard.", cause: result.error });
    }
  }

  const employees = employeesResult.data ?? [];
  const monthStart = startOfMonthIso();
  const documentsExpiringSoon = (documentsResult.data ?? []).filter((row) => {
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
    const expiry = (metadata as Record<string, unknown>).expiry_date;
    if (!expiry) return false;
    const expiryDate = String(expiry);
    const today = new Date().toISOString().slice(0, 10);
    return expiryDate >= today && expiryDate <= addDaysIso(30);
  }).length;

  const metrics: HrDashboardMetrics = {
    activeEmployees: employees.filter((row) => row.status === "active").length,
    contractsExpiringSoon: contractsResult.data?.length ?? 0,
    documentsExpiringSoon,
    newHires: employees.filter((row) => String(row.created_at).slice(0, 10) >= monthStart).length,
    onProbation: lifecycleResult.data?.length ?? 0,
    openVacancies: positionsResult.data?.length ?? 0,
    payrollReadinessIssues:
      (payrollExceptionsResult.error ? 0 : payrollExceptionsResult.data?.length ?? 0) +
      (payslipDraftResult.error ? 0 : payslipDraftResult.data?.length ?? 0),
    pendingApprovals: actionsResult.data?.filter((row) => row.status === "under_review").length ?? 0,
    pendingHrRequests: actionsResult.data?.length ?? 0,
    totalEmployees: employees.length,
  };

  const recentChanges: HrTimelineEntry[] = (timelineResult.data ?? []).map((row) => ({
    eventType: String(row.event_type),
    id: String(row.id),
    label: formatHrStatusLabel(String(row.event_type)),
    occurredAt: String(row.occurred_at),
    sourceDocumentType: row.source_document_type ? String(row.source_document_type) : null,
  }));

  const pendingApprovals = (actionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: formatHrDisplayLabel(row.action_type, "HR request"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const alerts = [
    metrics.contractsExpiringSoon > 0
      ? { id: "contracts-expiring", label: `${metrics.contractsExpiringSoon} contracts expiring within 60 days`, severity: "warning" as const }
      : null,
    metrics.documentsExpiringSoon > 0
      ? { id: "documents-expiring", label: `${metrics.documentsExpiringSoon} documents expiring within 30 days`, severity: "warning" as const }
      : null,
    metrics.payrollReadinessIssues > 0
      ? { id: "payroll-readiness", label: `${metrics.payrollReadinessIssues} payroll readiness issues`, severity: "error" as const }
      : null,
    metrics.openVacancies > 0
      ? { id: "open-vacancies", label: `${metrics.openVacancies} open vacancies`, severity: "info" as const }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return { alerts, metrics, pendingApprovals, recentChanges };
}

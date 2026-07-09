import { redirect } from "next/navigation";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrAssignmentsWorkspace } from "../_components/hr-assignments-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrAssignmentsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  if (params.create === "1" && !params.employeeId) {
    redirect("/erp/hr/employees");
  }

  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.assignmentsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_assignments")
    .select("id, employee_id, assignment_type, assignment_scope, assignment_status, effective_from, effective_to, reason, priority, reference_entity_type")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("effective_from", { ascending: false })
    .limit(50);

  if (params.employeeId) request = request.eq("employee_id", params.employeeId);

  const { data } = await request;

  let employmentProfileId = params.employmentProfileId;
  if (params.create === "1" && params.employeeId && !employmentProfileId) {
    const profileResult = await supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", params.employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    employmentProfileId = profileResult.data?.id ? String(profileResult.data.id) : undefined;
  }

  const records = (data ?? []).map((row) => ({
    effectiveFrom: String(row.effective_from),
    effectiveTo: row.effective_to ? String(row.effective_to) : "",
    id: String(row.id),
    priority: String(row.priority),
    rawStatus: String(row.assignment_status),
    reason: row.reason ? String(row.reason) : "",
    scope: formatHrStatusLabel(String(row.assignment_scope)),
    status: formatHrStatusLabel(String(row.assignment_status)),
    type: formatHrStatusLabel(String(row.assignment_type)),
  }));

  const editRecord = params.edit ? records.find((r) => r.id === params.edit) : undefined;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <HrShell activeKey="assignments">
      <HrAssignmentsWorkspace
        editRecord={editRecord}
        employeeId={params.employeeId}
        employmentProfileId={employmentProfileId}
        preset={params.preset}
        records={records}
        showCreate={params.create === "1"}
        today={today}
      />
    </HrShell>
  );
}

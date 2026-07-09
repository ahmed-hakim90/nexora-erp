import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";

import { HrRecruitmentWorkspace } from "../_components/hr-recruitment-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrRecruitmentPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data: vacancies }, { data: hiring }] = await Promise.all([
    supabase
      .from("hr_workforce_vacancies")
      .select("id, position_id, status, vacancy_reason")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .limit(30),
    supabase
      .from("hr_hiring_requests")
      .select("id, requested_position_id, required_date, approval_status, justification")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .limit(30),
  ]);

  const vacancyRecords = (vacancies ?? []).map((row) => ({
    id: String(row.id),
    positionId: String(row.position_id),
    reason: formatHrStatusLabel(String(row.vacancy_reason)),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const hiringRecords = (hiring ?? []).map((row) => ({
    date: String(row.required_date),
    id: String(row.id),
    justification: String(row.justification).slice(0, 80),
    positionId: String(row.requested_position_id),
    status: formatHrStatusLabel(String(row.approval_status)),
  }));

  return (
    <HrShell activeKey="recruitment" pathname="/erp/hr/recruitment">
      <HrRecruitmentWorkspace hiringRecords={hiringRecords} query={query} vacancyRecords={vacancyRecords} />
    </HrShell>
  );
}

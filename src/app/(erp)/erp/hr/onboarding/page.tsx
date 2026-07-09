import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";

import { HrTalentProgramWorkspace } from "../_components/hr-talent-program-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrOnboardingPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: programs } = await supabase
    .from("hr_talent_programs")
    .select("id, code, title, status, employee_id, starts_on, ends_on")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("program_type", "onboarding")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const programIds = (programs ?? []).map((p) => String(p.id));
  const { data: items } = programIds.length
    ? await supabase.from("hr_talent_program_items").select("id, program_id, title, status, due_date").in("program_id", programIds).is("deleted_at", null)
    : { data: [] };

  const programRecords = (programs ?? []).map((row) => ({
    code: String(row.code),
    employeeId: row.employee_id ? String(row.employee_id) : "—",
    id: String(row.id),
    period: [row.starts_on, row.ends_on].filter(Boolean).join(" → ") || "—",
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  const itemRecords = (items ?? []).map((row) => ({
    due: row.due_date ? String(row.due_date) : "—",
    id: String(row.id),
    programId: String(row.program_id),
    rawStatus: String(row.status),
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  return (
    <HrShell activeKey="onboarding" pathname="/erp/hr/onboarding">
      <HrTalentProgramWorkspace
        defaultProgramId={programIds[0]}
        itemRecords={itemRecords}
        programRecords={programRecords}
        programType="onboarding"
        query={query}
      />
    </HrShell>
  );
}

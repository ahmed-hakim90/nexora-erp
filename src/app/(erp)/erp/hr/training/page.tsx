import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";

import { HrTalentProgramWorkspace } from "../_components/hr-talent-program-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrTrainingPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: programs } = await supabase
    .from("hr_talent_programs")
    .select("id, code, title, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("program_type", "training")
    .is("deleted_at", null)
    .limit(30);

  const programIds = (programs ?? []).map((p) => String(p.id));
  const { data: items } = programIds.length
    ? await supabase.from("hr_talent_program_items").select("id, program_id, title, status").in("program_id", programIds).is("deleted_at", null)
    : { data: [] };

  const programRecords = (programs ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  const itemRecords = (items ?? []).map((row) => ({
    id: String(row.id),
    rawStatus: String(row.status),
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  return (
    <HrShell activeKey="training" pathname="/erp/hr/training">
      <HrTalentProgramWorkspace
        defaultProgramId={programIds[0]}
        itemRecords={itemRecords}
        programRecords={programRecords}
        programType="training"
        query={query}
      />
    </HrShell>
  );
}

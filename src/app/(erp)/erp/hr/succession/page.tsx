import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";

import { HrSuccessionWorkspace } from "../_components/hr-succession-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrSuccessionPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data } = await supabase
    .from("hr_talent_programs")
    .select("id, code, title, status, metadata")
    .eq("program_type", "succession")
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .limit(30);

  const records = (data ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    readiness: String((row.metadata as { readiness?: string })?.readiness ?? "—"),
    status: formatHrStatusLabel(String(row.status)),
    title: String(row.title),
  }));

  return (
    <HrShell activeKey="succession" pathname="/erp/hr/succession">
      <HrSuccessionWorkspace records={records} />
    </HrShell>
  );
}

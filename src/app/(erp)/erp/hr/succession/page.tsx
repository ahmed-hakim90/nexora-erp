import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { createTalentProgramAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrSuccessionPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase.from("hr_talent_programs").select("id, code, title, status, metadata").eq("program_type", "succession").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(30);
  const records = (data ?? []).map((row) => ({ code: String(row.code), id: String(row.id), readiness: String((row.metadata as { readiness?: string })?.readiness ?? "—"), status: formatHrStatusLabel(String(row.status)), title: String(row.title) }));

  return (
    <HrShell activeKey="succession" pathname="/erp/hr/succession">
      <PageContainer className="max-w-[96rem]">
        <PageHeader description="Succession plans, talent pools, and readiness tracking." title="Succession Planning" />
        <form action={createTalentProgramAction} className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
          <input name="programType" type="hidden" value="succession" />
          <Input name="code" placeholder="Plan code" required />
          <Input name="title" placeholder="Succession plan title" required />
          <Button type="submit">Create plan</Button>
        </form>
        <EnterpriseDataTable columns={[{ header: "Code", key: "code", render: (r) => r.code }, { header: "Plan", key: "title", render: (r) => r.title }, { header: "Readiness", key: "ready", render: (r) => r.readiness }, { header: "Status", key: "status", render: (r) => r.status }]} emptyMessage="No succession plans." getRowId={(r) => r.id} pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }} records={records} />
      </PageContainer>
    </HrShell>
  );
}

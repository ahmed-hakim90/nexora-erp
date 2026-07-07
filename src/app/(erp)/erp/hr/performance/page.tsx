import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { createTalentProgramAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrPerformancePage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase.from("hr_talent_programs").select("id, code, title, status, employee_id").eq("program_type", "performance").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(30);
  const records = (data ?? []).map((row) => ({ code: String(row.code), employeeId: row.employee_id ? String(row.employee_id) : "—", id: String(row.id), status: formatHrStatusLabel(String(row.status)), title: String(row.title) }));

  return (
    <HrShell activeKey="performance" pathname="/erp/hr/performance">
      <PageContainer className="max-w-[96rem]">
        <PageHeader description="Performance goals, reviews, and calibration cycles." title="Performance" />
        <form action={createTalentProgramAction} className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-4">
          <input name="programType" type="hidden" value="performance" />
          <Input name="code" placeholder="Cycle code" required />
          <Input name="title" placeholder="Review cycle title" required />
          <Input name="employeeId" placeholder="Employee ID" />
          <Button type="submit">Create review cycle</Button>
        </form>
        <EnterpriseDataTable columns={[{ header: "Code", key: "code", render: (r) => r.code }, { header: "Title", key: "title", render: (r) => r.title }, { header: "Employee", key: "emp", render: (r) => r.employeeId }, { header: "Status", key: "status", render: (r) => r.status }]} emptyMessage="No performance cycles." getRowId={(r) => r.id} pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }} records={records} />
      </PageContainer>
    </HrShell>
  );
}

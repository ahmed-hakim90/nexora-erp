import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { addTalentProgramItemAction, completeTalentProgramItemAction, createTalentProgramAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

async function TalentProgramPage({
  programType,
  title,
  description,
  activeKey,
}: Readonly<{ programType: "onboarding" | "training" | "performance" | "succession"; title: string; description: string; activeKey: string }>) {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: programs } = await supabase
    .from("hr_talent_programs")
    .select("id, code, title, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("program_type", programType)
    .is("deleted_at", null)
    .limit(30);

  const programIds = (programs ?? []).map((p) => String(p.id));
  const { data: items } = programIds.length
    ? await supabase.from("hr_talent_program_items").select("id, program_id, title, status").in("program_id", programIds).is("deleted_at", null)
    : { data: [] };

  const programRecords = (programs ?? []).map((row) => ({ code: String(row.code), id: String(row.id), status: formatHrStatusLabel(String(row.status)), title: String(row.title) }));
  const itemRecords = (items ?? []).map((row) => ({ id: String(row.id), status: formatHrStatusLabel(String(row.status)), title: String(row.title) }));

  return (
    <HrShell activeKey={activeKey} pathname={`/erp/hr/${activeKey}`}>
      <PageContainer className="max-w-[96rem]">
        <PageHeader description={description} title={title} />
        <form action={createTalentProgramAction} className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
          <input name="programType" type="hidden" value={programType} />
          <Input name="code" placeholder="Code" required />
          <Input name="title" placeholder="Title" required />
          <Button type="submit">Create</Button>
        </form>
        {programIds[0] ? (
          <form action={addTalentProgramItemAction} className="mb-6 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
            <Input defaultValue={programIds[0]} name="programId" required />
            <Input name="itemKey" placeholder="Item key" required />
            <Input name="title" placeholder="Title" required />
            <Button type="submit">Add item</Button>
          </form>
        ) : null}
        <EnterpriseDataTable columns={[{ header: "Program", key: "title", render: (r) => r.title }, { header: "Status", key: "status", render: (r) => r.status }]} emptyMessage="No programs." getRowId={(r) => r.id} pagination={{ mode: "page", page: 1, pageSize: programRecords.length || 1, totalRows: programRecords.length }} records={programRecords} />
        <div className="mt-4 flex flex-wrap gap-2">
          {itemRecords.filter((i) => i.status.toLowerCase() === "pending").map((item) => (
            <form action={completeTalentProgramItemAction.bind(null, item.id)} key={item.id}><Button size="sm" type="submit">Complete {item.title}</Button></form>
          ))}
        </div>
      </PageContainer>
    </HrShell>
  );
}

export default function HrTrainingPage() {
  return <TalentProgramPage activeKey="training" description="Training courses, sessions, and certificates." programType="training" title="Training" />;
}

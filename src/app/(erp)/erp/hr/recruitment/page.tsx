import Link from "next/link";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { createHiringRequestAction, createVacancyAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { HR_PERMISSIONS, formatHrStatusLabel } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrRecruitmentPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data: vacancies }, { data: hiring }] = await Promise.all([
    supabase.from("hr_workforce_vacancies").select("id, position_id, status, vacancy_reason").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).limit(30),
    supabase.from("hr_hiring_requests").select("id, requested_position_id, required_date, approval_status, justification").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).limit(30),
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
      <PageContainer className="max-w-[96rem]">
        <PageHeader description="Vacancies and hiring requests from workforce planning." title="Recruitment" />

        <div className="grid gap-6 lg:grid-cols-2">
          <form action={createVacancyAction} className="space-y-3 rounded-lg border p-4">
            <p className="font-medium">Open vacancy</p>
            <Input name="positionId" placeholder="Position ID" required />
            <Input name="jobId" placeholder="Job ID" required />
            <Input name="departmentId" placeholder="Department ID" required />
            <select className={nativeSelectClassName} defaultValue="new_position" name="vacancyReason">
              <option value="new_position">New position</option>
              <option value="replacement">Replacement</option>
              <option value="expansion">Expansion</option>
            </select>
            <Button type="submit">Create vacancy</Button>
          </form>

          <form action={createHiringRequestAction} className="space-y-3 rounded-lg border p-4">
            <p className="font-medium">Hiring request</p>
            <Input name="positionId" placeholder="Position ID" required />
            <DatePicker name="requiredDate" placeholder="Required date" required />
            <Input name="vacancyId" placeholder="Vacancy ID (optional)" />
            <Input name="justification" placeholder="Justification" required />
            <Button type="submit">Submit request</Button>
          </form>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <EnterpriseDataTable columns={[{ header: "Position", key: "pos", render: (r) => r.positionId }, { header: "Reason", key: "reason", render: (r) => r.reason }, { header: "Status", key: "status", render: (r) => r.status }]} emptyMessage="No vacancies." getRowId={(r) => r.id} pagination={{ mode: "page", page: 1, pageSize: vacancyRecords.length || 1, totalRows: vacancyRecords.length }} records={vacancyRecords} />
          <EnterpriseDataTable columns={[{ header: "Position", key: "pos", render: (r) => r.positionId }, { header: "Required", key: "date", render: (r) => r.date }, { header: "Status", key: "status", render: (r) => r.status }]} emptyMessage="No hiring requests." getRowId={(r) => r.id} pagination={{ mode: "page", page: 1, pageSize: hiringRecords.length || 1, totalRows: hiringRecords.length }} records={hiringRecords} />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Talent programs: <Link className="underline" href="/erp/hr/onboarding">Onboarding</Link> · <Link className="underline" href="/erp/hr/training">Training</Link> · <Link className="underline" href="/erp/hr/performance">Performance</Link> · <Link className="underline" href="/erp/hr/succession">Succession</Link>
        </p>
      </PageContainer>
    </HrShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { Button, DatePicker, EnterpriseDataTable, Input, PageContainer, PageHeader } from "@/shared/ui";

import { resolveHrPageHelp } from "@/features/hr/public-api";
import { createHrAssignmentAction, endHrAssignmentAction, updateHrAssignmentAction } from "@/features/hr/routes/actions/hr-employees.actions";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";
import { HrAssignmentCreateForm } from "../_components/hr-assignment-form";
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

  return (
    <HrShell activeKey="assignments">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Assignment timeline, future/temporary/acting/delegated assignments, and conflict-aware creation."
          help={resolveHrPageHelp("assignments")}
          title="Assignments"
        >
          {params.employeeId ? (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
              href={`/erp/hr/assignments?employeeId=${params.employeeId}&create=1`}
            >
              Create assignment
            </Link>
          ) : null}
        </PageHeader>
        <div className="space-y-6">
          <EnterpriseDataTable
            columns={[
              { header: "Type", key: "type", render: (record) => record.type },
              { header: "Scope", key: "scope", render: (record) => record.scope },
              { header: "Status", key: "status", render: (record) => record.status },
              { header: "Effective from", key: "from", render: (record) => record.effectiveFrom },
              { header: "Effective to", key: "to", render: (record) => record.effectiveTo },
              { header: "Priority", key: "priority", render: (record) => record.priority },
              { header: "Reason", key: "reason", render: (record) => record.reason || "—" },
              {
                header: "Actions",
                key: "actions",
                render: (record) => (
                  <div className="flex flex-wrap gap-1">
                    <a className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/erp/hr/assignments?edit=${record.id}${params.employeeId ? `&employeeId=${params.employeeId}` : ""}`}>
                      Edit
                    </a>
                    {["active", "planned"].includes(record.rawStatus) ? (
                      <form action={endHrAssignmentAction}>
                        <input name="assignmentId" type="hidden" value={record.id} />
                        <input name="effectiveTo" type="hidden" value={new Date().toISOString().slice(0, 10)} />
                        <Button size="sm" type="submit" variant="secondary">
                          End
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage="No assignments yet."
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={records}
          />

          {editRecord ? (
            <form action={updateHrAssignmentAction} className="grid gap-3 rounded-lg border border-accent p-4 md:grid-cols-3 xl:grid-cols-5">
              <input name="assignmentId" type="hidden" value={editRecord.id} />
              <DatePicker defaultValue={editRecord.effectiveFrom} name="effectiveFrom" placeholder="Effective from" required />
              <DatePicker defaultValue={editRecord.effectiveTo || undefined} name="effectiveTo" placeholder="Effective to" />
              <Input defaultValue={editRecord.priority} min="1" name="priority" type="number" />
              <Input defaultValue={editRecord.reason} name="reason" placeholder="Reason" />
              <Button type="submit" variant="primary">
                Save Assignment
              </Button>
            </form>
          ) : null}

          {params.create === "1" && params.employeeId ? (
            <HrAssignmentCreateForm action={createHrAssignmentAction} employeeId={params.employeeId} employmentProfileId={employmentProfileId} preset={params.preset} />
          ) : null}
        </div>
      </PageContainer>
    </HrShell>
  );
}

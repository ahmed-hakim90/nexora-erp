import Link from "next/link";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  approvePayrollRunAction,
  calculatePayrollRunAction,
  createPayrollRunAction,
  deletePayrollRunAction,
  publishPayslipsAction,
  validatePayrollRunAction,
} from "@/features/hr/routes/actions/hr-payroll.actions";
import { ensureEgyptPayrollPackAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, nativeSelectClassName, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

import { HrSectionWorkspace } from "../_components/hr-section-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrPayrollReadinessPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [runs, results, payslips, publications, exceptions, periods, groups, runList] = await Promise.all([
    supabase.from("hr_payroll_runs").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payroll_results").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payslips").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).is("deleted_at", null),
    supabase.from("hr_payslip_publications").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("publishing_status", "published"),
    supabase.from("hr_payroll_validation_results").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("severity", "error"),
    supabase.from("hr_payroll_periods").select("id, period_name, start_date, end_date").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(20),
    supabase.from("hr_payroll_groups").select("id, name, code").eq("tenant_id", context.tenantId).is("deleted_at", null).limit(20),
    supabase.from("hr_payroll_runs").select("id, status, run_type, created_at, payroll_period_id, payroll_group_id").eq("tenant_id", context.tenantId).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
  ]);

  const draftHidden = Math.max(0, (payslips.count ?? 0) - (publications.count ?? 0));
  const periodMap = new Map((periods.data ?? []).map((p) => [String(p.id), String(p.period_name)]));
  const groupMap = new Map((groups.data ?? []).map((g) => [String(g.id), String(g.name)]));

  const runRecords = (runList.data ?? []).map((row) => ({
    createdAt: String(row.created_at).slice(0, 10),
    group: groupMap.get(String(row.payroll_group_id)) ?? "—",
    id: String(row.id),
    period: periodMap.get(String(row.payroll_period_id)) ?? "—",
    rawStatus: String(row.status),
    runType: String(row.run_type),
    status: formatHrStatusLabel(String(row.status)),
  }));

  return (
    <HrShell activeKey="payroll-readiness">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Payroll runs, validation, calculation, approval, and readiness metrics."
          help={resolveHrPageHelp("payrollReadiness")}
          title="Payroll Readiness"
        />
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">Payroll Runs</p><p className="mt-2 text-3xl font-semibold">{runs.count ?? 0}</p></article>
            <article className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">Payroll Results</p><p className="mt-2 text-3xl font-semibold">{results.count ?? 0}</p></article>
            <article className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">Validation Issues</p><p className="mt-2 text-3xl font-semibold">{exceptions.count ?? 0}</p></article>
          </section>

          <form action={ensureEgyptPayrollPackAction} className="rounded-lg border p-4">
            <p className="text-sm font-medium">Egypt Payroll Localization (OP-25)</p>
            <p className="mt-1 text-sm text-muted-foreground">Activate EG-V1 pack with social insurance and income tax rules for payroll calculation.</p>
            <Button className="mt-3" type="submit" variant="secondary">Ensure Egypt pack</Button>
          </form>

          {(groups.data ?? []).length === 0 ? (
            <article className="rounded-lg border bg-[hsl(var(--surface))] p-5">
              <p className="text-sm text-muted-foreground">
                No payroll groups or periods are configured yet. Set up payroll foundation data before creating runs.
              </p>
              <Link className={`${secondaryButtonLinkClassName} mt-4 inline-flex`} href="/erp/hr/settings">
                Open HR Settings
              </Link>
            </article>
          ) : (
            <form action={createPayrollRunAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
              <select className={nativeSelectClassName} name="payrollPeriodId" required>
                <option value="">Payroll period</option>
                {(periods.data ?? []).map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>{p.period_name} ({p.start_date} → {p.end_date})</option>
                ))}
              </select>
              <select className={nativeSelectClassName} name="payrollGroupId" required>
                <option value="">Payroll group</option>
                {(groups.data ?? []).map((g) => (
                  <option key={String(g.id)} value={String(g.id)}>{g.name} ({g.code})</option>
                ))}
              </select>
              <Button type="submit" variant="primary">Create Payroll Run</Button>
            </form>
          )}

          <EnterpriseDataTable
            columns={[
              { header: "Period", key: "period", render: (r) => r.period },
              { header: "Group", key: "group", render: (r) => r.group },
              { header: "Type", key: "type", render: (r) => r.runType },
              { header: "Status", key: "status", render: (r) => r.status },
              { header: "Created", key: "created", render: (r) => r.createdAt },
              {
                header: "Actions",
                key: "actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {["draft", "validating"].includes(r.rawStatus) ? (
                      <form action={validatePayrollRunAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">Validate</Button>
                      </form>
                    ) : null}
                    {["ready", "draft"].includes(r.rawStatus) ? (
                      <form action={calculatePayrollRunAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="primary">Calculate</Button>
                      </form>
                    ) : null}
                    {r.rawStatus === "completed" ? (
                      <form action={approvePayrollRunAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="primary">Approve</Button>
                      </form>
                    ) : null}
                    {["approved", "paid", "completed"].includes(r.rawStatus) ? (
                      <a
                        className="inline-flex h-8 items-center rounded-md border bg-[hsl(var(--surface-muted))] px-3 text-xs font-medium"
                        href={`/api/hr/payroll/wps/${r.id}`}
                      >
                        WPS File
                      </a>
                    ) : null}
                    {r.rawStatus === "approved" ? (
                      <form action={publishPayslipsAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">Mark Paid</Button>
                      </form>
                    ) : null}
                    {r.rawStatus !== "paid" ? (
                      <form action={deletePayrollRunAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">Delete</Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage={
              (groups.data ?? []).length === 0
                ? "No payroll runs yet. Configure payroll groups and periods in HR Settings first."
                : "No payroll runs yet. Create one using the form above."
            }
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={runRecords}
          />

          <HrSectionWorkspace description="Draft payslips hidden from employees until published through the portal layer." title="Readiness Summary">
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">Payslips</p><p className="mt-2 text-3xl font-semibold">{payslips.count ?? 0}</p></article>
              <article className="rounded-lg border p-5"><p className="text-sm text-muted-foreground">Draft Payslips Hidden</p><p className="mt-2 text-3xl font-semibold">{draftHidden}</p></article>
            </section>
          </HrSectionWorkspace>
        </div>
      </PageContainer>
    </HrShell>
  );
}

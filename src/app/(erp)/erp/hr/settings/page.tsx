import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  activateLeavePolicyAction,
  archiveLeavePolicyAction,
  createLeavePolicyAction,
  ensureDefaultLeaveTypesAction,
} from "@/features/hr/routes/actions/hr-leave.actions";
import { ensureDefaultPayrollSetupAction } from "@/features/hr/routes/actions/hr-payroll.actions";
import { runHrExpiryNotificationScanAndRedirectAction } from "@/features/hr/routes/actions/hr-operational.actions";
import { formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrSettingsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.manage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [leaveTypes, leavePolicies, payrollGroups, payrollPeriods, payrollCalendars] = await Promise.all([
    supabase
      .from("hr_leave_types")
      .select("id, code, name, paid, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("code")
      .limit(50),
    supabase
      .from("hr_leave_policies")
      .select("id, leave_type_id, entitlement_unit, annual_entitlement, carry_forward_allowed, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_payroll_groups")
      .select("id, code, name, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("code")
      .limit(20),
    supabase
      .from("hr_payroll_periods")
      .select("id, period_code, period_name, start_date, end_date, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false })
      .limit(20),
    supabase
      .from("hr_payroll_calendars")
      .select("id, code, name, frequency, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .limit(20),
  ]);

  const leaveTypeRecords = (leaveTypes.data ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    name: String(row.name),
    paid: row.paid ? "Paid" : "Unpaid",
    status: formatHrStatusLabel(String(row.status)),
  }));

  const leaveTypeNames = new Map(leaveTypeRecords.map((row) => [row.id, row.name]));
  const activeLeaveTypes = (leaveTypes.data ?? []).filter((row) => String(row.status) === "active");

  const leavePolicyRecords = (leavePolicies.data ?? []).map((row) => ({
    annualEntitlement: Number(row.annual_entitlement ?? 0),
    carryForward: row.carry_forward_allowed ? "Yes" : "No",
    entitlementUnit: String(row.entitlement_unit),
    id: String(row.id),
    leaveType: leaveTypeNames.get(String(row.leave_type_id)) ?? "Leave",
    rawStatus: String(row.status),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const groupRecords = (payrollGroups.data ?? []).map((row) => ({
    code: String(row.code),
    id: String(row.id),
    name: String(row.name),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const periodRecords = (payrollPeriods.data ?? []).map((row) => ({
    code: String(row.period_code),
    endDate: String(row.end_date),
    id: String(row.id),
    name: String(row.period_name),
    startDate: String(row.start_date),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const calendarRecords = (payrollCalendars.data ?? []).map((row) => ({
    code: String(row.code),
    frequency: String(row.frequency),
    id: String(row.id),
    name: String(row.name),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const scanTotal = params.scanTotal ? Number(params.scanTotal) : null;

  return (
    <HrShell activeKey="settings">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Seed operational defaults for leave types and payroll setup. Advanced configuration uses foundation workspaces."
          help={resolveHrPageHelp("settings")}
          title="HR Settings"
        />
        <div className="space-y-8">
          {scanTotal !== null && Number.isFinite(scanTotal) ? (
            <p className="rounded-md border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/5 px-3 py-2 text-sm">
              Expiry notification scan queued {scanTotal} alert(s): contracts {params.scanContracts ?? "0"}, documents{" "}
              {params.scanDocuments ?? "0"}, probation {params.scanProbation ?? "0"}.
            </p>
          ) : null}

          <section className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Operator Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Scan contracts, documents, and probation end dates for upcoming expiry alerts.
                </p>
              </div>
              <form action={runHrExpiryNotificationScanAndRedirectAction}>
                <Button type="submit" variant="secondary">
                  Run expiry scan
                </Button>
              </form>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Leave Types</h2>
                <p className="text-sm text-muted-foreground">Annual, sick, and unpaid leave types required for leave requests.</p>
              </div>
              {leaveTypeRecords.length === 0 ? (
                <form action={ensureDefaultLeaveTypesAction}>
                  <Button type="submit" variant="primary">
                    Seed Default Leave Types
                  </Button>
                </form>
              ) : null}
            </div>
            <EnterpriseDataTable
              columns={[
                { header: "Code", key: "code", render: (record) => record.code },
                { header: "Name", key: "name", render: (record) => record.name },
                { header: "Paid", key: "paid", render: (record) => record.paid },
                { header: "Status", key: "status", render: (record) => record.status },
              ]}
              emptyMessage="No leave types yet. Seed defaults to enable leave requests."
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={leaveTypeRecords}
            />
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div>
              <h2 className="text-lg font-semibold">Leave Policies</h2>
              <p className="text-sm text-muted-foreground">
                Annual entitlements and carry-forward rules per leave type. Active policies are used for balance planning.
              </p>
            </div>

            <form action={createLeavePolicyAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5">
              <select className={nativeSelectClassName} name="leaveTypeId" required>
                <option value="">Leave type</option>
                {activeLeaveTypes.map((type) => (
                  <option key={String(type.id)} value={String(type.id)}>
                    {String(type.name)}
                  </option>
                ))}
              </select>
              <Input defaultValue="21" min="0" name="annualEntitlement" placeholder="Annual entitlement" required step="0.5" type="number" />
              <select className={nativeSelectClassName} defaultValue="days" name="entitlementUnit">
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input name="carryForwardAllowed" type="checkbox" value="on" />
                Allow carry forward
              </label>
              <Button disabled={activeLeaveTypes.length === 0} type="submit" variant="primary">
                Create policy
              </Button>
            </form>

            <EnterpriseDataTable
              columns={[
                { header: "Leave type", key: "leaveType", render: (record) => record.leaveType },
                { header: "Entitlement", key: "entitlement", render: (record) => `${record.annualEntitlement} ${record.entitlementUnit}` },
                { header: "Carry forward", key: "carryForward", render: (record) => record.carryForward },
                { header: "Status", key: "status", render: (record) => record.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (record) => (
                    <div className="flex flex-wrap gap-1">
                      {["draft", "inactive"].includes(record.rawStatus) ? (
                        <form action={activateLeavePolicyAction.bind(null, record.id)}>
                          <Button size="sm" type="submit" variant="primary">
                            Activate
                          </Button>
                        </form>
                      ) : null}
                      {record.rawStatus !== "archived" ? (
                        <form action={archiveLeavePolicyAction.bind(null, record.id)}>
                          <Button size="sm" type="submit" variant="secondary">
                            Archive
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              emptyMessage="No leave policies yet. Create one after seeding leave types."
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={leavePolicyRecords}
            />
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Payroll Setup</h2>
                <p className="text-sm text-muted-foreground">Calendar, default group, and current-month period for payroll runs.</p>
              </div>
              {groupRecords.length === 0 ? (
                <form action={ensureDefaultPayrollSetupAction}>
                  <Button type="submit" variant="primary">
                    Seed Default Payroll Setup
                  </Button>
                </form>
              ) : null}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <EnterpriseDataTable
                columns={[
                  { header: "Code", key: "code", render: (record) => record.code },
                  { header: "Name", key: "name", render: (record) => record.name },
                  { header: "Frequency", key: "frequency", render: (record) => record.frequency },
                  { header: "Status", key: "status", render: (record) => record.status },
                ]}
                emptyMessage="No payroll calendars."
                getRowId={(record) => record.id}
                pagination={{ mode: "cursor", pageSize: 20 }}
                records={calendarRecords}
              />
              <EnterpriseDataTable
                columns={[
                  { header: "Code", key: "code", render: (record) => record.code },
                  { header: "Name", key: "name", render: (record) => record.name },
                  { header: "Status", key: "status", render: (record) => record.status },
                ]}
                emptyMessage="No payroll groups."
                getRowId={(record) => record.id}
                pagination={{ mode: "cursor", pageSize: 20 }}
                records={groupRecords}
              />
            </div>
            <EnterpriseDataTable
              columns={[
                { header: "Period", key: "name", render: (record) => record.name },
                { header: "Code", key: "code", render: (record) => record.code },
                { header: "From", key: "from", render: (record) => record.startDate },
                { header: "To", key: "to", render: (record) => record.endDate },
                { header: "Status", key: "status", render: (record) => record.status },
              ]}
              emptyMessage="No payroll periods."
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 20 }}
              records={periodRecords}
            />
          </section>
        </div>
      </PageContainer>
    </HrShell>
  );
}

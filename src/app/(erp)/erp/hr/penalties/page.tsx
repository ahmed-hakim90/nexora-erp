import {
  acknowledgePenaltyAction,
  createEmployeePenaltyAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_PENALTY_SEVERITIES, HR_PENALTY_TYPES } from "@/features/hr/financial-services-foundation";
import { loadHrPenaltiesWorkspace } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrPenaltiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });

  const { records } = await loadHrPenaltiesWorkspace({
    employeeId: query.employeeId,
    search: query.search,
    status: query.status,
  });

  return (
    <HrShell activeKey="penalties">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee disciplinary penalties with acknowledgment tracking and payroll deduction support."
          help={resolveHrPageHelp("penalties")}
          title="Penalties / الجزاءات"
        />
        <div className="space-y-4">
          <form action="/erp/hr/penalties" className="grid gap-3 md:grid-cols-3">
            <Input defaultValue={query.search ?? ""} name="search" placeholder="Search employee..." />
            <Input defaultValue={query.status ?? ""} name="status" placeholder="Status filter" />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <form action={createEmployeePenaltyAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-7">
            <EntityLookup value={query.employeeId} label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="penaltyType">
              {HR_PENALTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select className={nativeSelectClassName} name="severity">
              {HR_PENALTY_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Input name="description" placeholder="Description" required />
            <DatePicker name="incidentDate" placeholder="Incident date" />
            <Input min="0" name="amount" placeholder="Amount (optional)" step="0.01" type="number" />
            <Button type="submit" variant="primary">
              Issue Penalty
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Document #", key: "doc", render: (r) => r.documentNumber },
              { header: "Employee", key: "emp", render: (r) => r.employeeLabel ?? r.employeeId },
              { header: "Type", key: "type", render: (r) => r.penaltyType },
              { header: "Severity", key: "severity", render: (r) => r.severity },
              { header: "Amount", key: "amount", render: (r) => (r.amount ? `${r.amount.toLocaleString()} ${r.currencyCode}` : "—") },
              { header: "Incident", key: "incident", render: (r) => r.incidentDate },
              { header: "Status", key: "status", render: (r) => r.status },
              {
                header: "Actions",
                key: "actions",
                render: (r) =>
                  r.status === "issued" ? (
                    <form action={acknowledgePenaltyAction.bind(null, r.id)}>
                      <Button size="sm" type="submit" variant="primary">
                        Acknowledge
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted-foreground">{r.status}</span>
                  ),
              },
            ]}
            emptyMessage="No penalties recorded yet."
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={records}
            rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: "View profile" }]}
          />
        </div>
      </PageContainer>
    </HrShell>
  );
}

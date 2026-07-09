"use client";

import {
  approveEncashmentAction,
  createEncashmentAction,
  executeCarryForwardAction,
  previewCarryForwardAction,
} from "@/features/hr/routes/actions/hr-leave-runtime.actions";
import type { HrLeaveRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-leave-runtime.loader";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";
import Link from "next/link";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

const LEAVE_TABS = ["overview", "carry-forward", "encashment", "calendar", "balances", "ledger", "holidays"] as const;

export function HrLeaveWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrLeaveRuntimeWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const { balances, carryForwardRuns, dashboard, encashments, holidays, leaveTypes, ledger, teamCalendar } = data;
  const activeTab = resolveHrSectionTab(query.tab, LEAVE_TABS, "overview");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/leave", { tab });

  const navItems = [
    { href: href("overview"), key: "overview", label: t("hr.leave.tab.overview") },
    { href: href("carry-forward"), key: "carry-forward", label: t("hr.leave.tab.carryForward") },
    { href: href("encashment"), key: "encashment", label: t("hr.leave.tab.encashment") },
    { href: href("calendar"), key: "calendar", label: t("hr.leave.tab.calendar") },
    { href: href("balances"), key: "balances", label: t("hr.leave.tab.balances") },
    { href: href("ledger"), key: "ledger", label: t("hr.leave.tab.ledger") },
    { href: href("holidays"), key: "holidays", label: t("hr.leave.tab.holidays") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.leave.description")}
      headerActions={
        <Link className={secondaryButtonLinkClassName} href="/erp/hr/leave/reports">
          {t("hr.leave.reportsLink")}
        </Link>
      }
      help={resolveHrPageHelp("attendanceLeave")}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.leave.kpi.pendingApprovals.helper"),
          href: href("encashment"),
          label: t("hr.leave.kpi.pendingApprovals"),
          value: dashboard.pendingApprovals,
        },
        {
          helper: t("hr.leave.kpi.currentlyAway.helper"),
          href: href("calendar"),
          label: t("hr.leave.kpi.currentlyAway"),
          value: dashboard.employeesCurrentlyAway,
        },
        {
          helper: t("hr.leave.kpi.balanceRisk.helper"),
          href: href("balances"),
          label: t("hr.leave.kpi.balanceRisk"),
          value: dashboard.leaveBalanceRisk,
        },
        {
          helper: t("hr.leave.kpi.carryForwardDue.helper"),
          href: href("carry-forward"),
          label: t("hr.leave.kpi.carryForwardDue"),
          value: dashboard.carryForwardDue,
        },
        {
          helper: t("hr.leave.kpi.encashmentPending.helper"),
          href: href("encashment"),
          label: t("hr.leave.kpi.encashmentPending"),
          value: dashboard.encashmentPending,
        },
        {
          helper: t("hr.leave.kpi.upcomingWindow.helper"),
          href: href("calendar"),
          label: t("hr.leave.kpi.upcomingWindow"),
          value: dashboard.upcomingLeaveWindowEnd,
        },
      ]}
      title={t("hr.leave.title")}
      workspaceKey="leave"
    >
      {activeTab === "overview" ? (
        <div className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.overview.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("hr.leave.overview.body")}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {navItems.filter((item) => item.key !== "overview").map((item) => (
              <Link className={secondaryButtonLinkClassName} href={item.href} key={item.key}>
                {t("hr.common.open", { label: item.label })}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "carry-forward" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.carryForward")}</h2>
          <form action={previewCarryForwardAction} className="grid gap-3 md:grid-cols-4">
            <select className={nativeSelectClassName} defaultValue="company_closing" name="scope">
              <option value="company_closing">{t("hr.leave.scope.companyClosing")}</option>
              <option value="policy_closing">{t("hr.leave.scope.policyClosing")}</option>
              <option value="employee_anniversary">{t("hr.leave.scope.employeeAnniversary")}</option>
              <option value="manual">{t("hr.leave.scope.manual")}</option>
            </select>
            <DatePicker name="sourcePeriodEnd" placeholder={t("hr.leave.field.sourcePeriodEnd")} required />
            <DatePicker name="targetPeriodStart" placeholder={t("hr.leave.field.targetPeriodStart")} required />
            <Button type="submit" variant="secondary">
              {t("hr.leave.action.previewCarryForward")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.leave.column.scope"), key: "scope", render: (record) => record.scope },
              {
                header: t("hr.leave.column.period"),
                key: "period",
                render: (record) => `${record.sourcePeriodEnd} → ${record.targetPeriodStart}`,
              },
              { header: t("hr.leave.column.employees"), key: "employees", render: (record) => record.employeeCount },
              { header: t("hr.leave.column.carried"), key: "carried", render: (record) => record.totalQuantityCarried },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.leave.action.execute"),
                key: "execute",
                render: (record) =>
                  record.status.toLowerCase().includes("draft") ? (
                    <form action={executeCarryForwardAction}>
                      <input name="runId" type="hidden" value={record.id} />
                      <input name="scope" type="hidden" value="company_closing" />
                      <input name="sourcePeriodEnd" type="hidden" value={record.sourcePeriodEnd} />
                      <input name="targetPeriodStart" type="hidden" value={record.targetPeriodStart} />
                      <Button size="sm" type="submit" variant="primary">
                        {t("hr.leave.action.execute")}
                      </Button>
                    </form>
                  ) : (
                    "—"
                  ),
              },
            ]}
            emptyMessage={t("hr.leave.empty.carryForward")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: carryForwardRuns.length || 1, totalRows: carryForwardRuns.length }}
            records={carryForwardRuns}
          />
        </section>
      ) : null}

      {activeTab === "encashment" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.encashment")}</h2>
          <form action={createEncashmentAction} className="grid gap-3 md:grid-cols-5">
            <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="leaveTypeId" required>
              <option value="">{t("hr.leave.column.leaveType")}</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <Input min="0.5" name="requestedQuantity" placeholder={t("hr.leave.column.quantity")} required step="0.5" type="number" />
            <select className={nativeSelectClassName} defaultValue="partial" name="encashmentKind">
              <option value="partial">Partial</option>
              <option value="full">Full</option>
            </select>
            <Button type="submit" variant="primary">
              {t("hr.leave.action.submitEncashment")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.quantity"), key: "qty", render: (record) => record.requestedQuantity },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.common.approve"),
                key: "approve",
                render: (record) =>
                  record.status.toLowerCase().includes("submitted") ? (
                    <form action={approveEncashmentAction}>
                      <input name="encashmentId" type="hidden" value={record.id} />
                      <Button size="sm" type="submit" variant="primary">
                        {t("hr.common.approve")}
                      </Button>
                    </form>
                  ) : (
                    "—"
                  ),
              },
            ]}
            emptyMessage={t("hr.leave.empty.encashment")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: encashments.length || 1, totalRows: encashments.length }}
            records={encashments}
          />
        </section>
      ) : null}

      {activeTab === "calendar" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.calendar")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employee },
              { header: t("hr.leave.column.leaveType"), key: "type", render: (record) => record.leaveType },
              { header: t("hr.leave.column.from"), key: "from", render: (record) => record.startsOn },
              { header: t("hr.leave.column.to"), key: "to", render: (record) => record.endsOn },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.leave.empty.calendar")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: teamCalendar.length || 1, totalRows: teamCalendar.length }}
            records={teamCalendar}
          />
        </section>
      ) : null}

      {activeTab === "balances" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.balances")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.type"), key: "type", render: (record) => record.leaveType },
              { header: t("hr.leave.column.available"), key: "available", render: (record) => record.available },
              { header: t("hr.leave.column.pending"), key: "pending", render: (record) => record.pending },
              { header: t("hr.leave.column.consumed"), key: "consumed", render: (record) => record.consumed },
              { header: t("hr.leave.column.carried"), key: "carried", render: (record) => record.carriedForward },
              { header: t("hr.leave.column.projected"), key: "projected", render: (record) => record.projected },
            ]}
            emptyMessage={t("hr.leave.empty.balances")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: balances.length || 1, totalRows: balances.length }}
            records={balances}
          />
        </section>
      ) : null}

      {activeTab === "ledger" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.ledger")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.leave.column.movement"), key: "movement", render: (record) => record.movementKind },
              { header: t("hr.leave.column.quantity"), key: "qty", render: (record) => record.quantity },
              { header: t("hr.leave.column.balanceAfter"), key: "after", render: (record) => record.balanceAfter },
              { header: t("hr.common.date"), key: "date", render: (record) => record.asOfDate },
            ]}
            emptyMessage={t("hr.leave.empty.ledger")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: ledger.length || 1, totalRows: ledger.length }}
            records={ledger}
          />
        </section>
      ) : null}

      {activeTab === "holidays" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.leave.tab.holidays")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.date"), key: "date", render: (record) => record.holidayDate },
              { header: t("hr.leave.column.name"), key: "name", render: (record) => record.name },
              { header: t("hr.leave.column.type"), key: "type", render: (record) => record.type },
            ]}
            emptyMessage={t("hr.leave.empty.holidays")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: holidays.length || 1, totalRows: holidays.length }}
            records={holidays}
          />
        </section>
      ) : null}
    </HrSectionWorkspace>
  );
}

"use client";

import Link from "next/link";

import {
  approveLateEarlyViolationAction,
  cancelLateEarlyViolationAction,
  createLateEarlyPolicyAction,
  createLateEarlyPolicyAssignmentAction,
  rejectLateEarlyViolationAction,
} from "@/features/hr/routes/actions/hr-late-early-runtime.actions";
import type { HrLateEarlyRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-late-early-runtime.loader";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  Input,
  PlatformTimeline,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

const LATE_EARLY_TABS = ["overview", "team", "policies", "assignments", "violations", "ledger", "timeline"] as const;

export function HrLateEarlyWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrLateEarlyRuntimeWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const { approvalEvents, dashboard, ledger, managerScopeActive, policyAssignments, policies, teamViolations, timelineEvents, violations } = data;
  const activeTab = resolveHrSectionTab(query.tab, LATE_EARLY_TABS, "overview");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/late-early", { tab });

  const navItems = [
    { href: href("overview"), key: "overview", label: t("hr.common.overview") },
    ...(teamViolations.length > 0 ? [{ href: href("team"), key: "team", label: t("hr.lateEarly.tab.team") }] : []),
    { href: href("policies"), key: "policies", label: t("hr.lateEarly.tab.policies") },
    { href: href("assignments"), key: "assignments", label: t("hr.assignments.title") },
    { href: href("violations"), key: "violations", label: t("hr.lateEarly.tab.violations") },
    { href: href("ledger"), key: "ledger", label: t("hr.leave.tab.ledger") },
    { href: href("timeline"), key: "timeline", label: t("hr.lateEarly.tab.timeline") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.lateEarly.description")}
      headerActions={
        <div className="flex flex-wrap items-center gap-3">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early/reports">
            {t("hr.lateEarly.reportsLink")}
          </Link>
          {managerScopeActive ? <span className="text-sm text-muted-foreground">{t("hr.lateEarly.managerScope")}</span> : null}
        </div>
      }
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.lateEarly.kpi.todayLate.helper"),
          href: href("violations"),
          label: t("hr.lateEarly.kpi.todayLate"),
          value: dashboard.todayLate,
        },
        {
          helper: t("hr.lateEarly.kpi.todayEarly.helper"),
          href: href("violations"),
          label: t("hr.lateEarly.kpi.todayEarly"),
          value: dashboard.todayEarlyLeave,
        },
        {
          helper: t("hr.lateEarly.kpi.pendingApprovals.helper"),
          href: href("violations"),
          label: t("hr.lateEarly.kpi.pendingApprovals"),
          value: dashboard.pendingApprovals,
        },
        {
          helper: t("hr.lateEarly.kpi.repeated.helper"),
          href: href("ledger"),
          label: t("hr.lateEarly.kpi.repeated"),
          value: dashboard.repeatedViolations,
        },
      ]}
      title={t("hr.lateEarly.title")}
      workspaceKey="late-early"
    >
      {activeTab === "overview" ? (
        <div className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.lateEarly.overviewTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("hr.lateEarly.overviewDescription")}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {navItems.filter((item) => item.key !== "overview").map((item) => (
              <Link className={secondaryButtonLinkClassName} href={item.href} key={item.key}>
                {t("hr.common.openLabel", { label: item.label })}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "team" && teamViolations.length > 0 ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.lateEarly.teamPendingTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.kind"), key: "kind", render: (record) => record.violationKind },
              { header: t("hr.common.deduction"), key: "deduction", render: (record) => record.deductionMinutes },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            ]}
            emptyMessage={t("hr.lateEarly.emptyTeam")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: teamViolations.length || 1, totalRows: teamViolations.length }}
            records={teamViolations}
          />
        </section>
      ) : null}

      {activeTab === "policies" ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="text-lg font-medium">{t("hr.lateEarly.createPolicyTitle")}</h2>
            <form action={createLateEarlyPolicyAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="code" placeholder={t("hr.lateEarly.policyCode")} required />
              <Input name="name" placeholder={t("hr.lateEarly.policyName")} required />
              <DatePicker name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
              <Input defaultValue="15" min={0} name="graceMinutes" placeholder={t("hr.lateEarly.graceMinutes")} type="number" />
              <Input defaultValue="1" min={0} name="lateThresholdMinutes" placeholder={t("hr.lateEarly.lateThreshold")} type="number" />
              <Input defaultValue="120" min={0} name="monthlyLimitMinutes" placeholder={t("hr.lateEarly.monthlyLimit")} type="number" />
              <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" defaultValue="minutes" name="deductionMethod">
                <option value="minutes">{t("hr.lateEarly.deductionMinutes")}</option>
                <option value="half_day">{t("hr.lateEarly.deductionHalfDay")}</option>
                <option value="full_day">{t("hr.lateEarly.deductionFullDay")}</option>
                <option value="none">{t("hr.lateEarly.deductionNone")}</option>
              </select>
              <Button type="submit" variant="primary">
                {t("hr.lateEarly.createPolicy")}
              </Button>
            </form>
          </section>
          <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="text-lg font-medium">{t("hr.lateEarly.activePoliciesTitle")}</h2>
            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.code"), key: "code", render: (record) => record.code },
                { header: t("hr.common.name"), key: "name", render: (record) => record.name },
                { header: t("hr.common.grace"), key: "grace", render: (record) => `${record.graceMinutes} min` },
                { header: t("hr.common.effective"), key: "effective", render: (record) => record.effectiveFrom },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              ]}
              emptyMessage={t("hr.lateEarly.emptyPolicies")}
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: policies.length || 1, totalRows: policies.length }}
              records={policies}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.lateEarly.assignmentsTitle")}</h2>
          <form action={createLateEarlyPolicyAssignmentAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" name="policyId" required>
              <option value="">{t("hr.lateEarly.selectPolicy")}</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.code} — {policy.name}
                </option>
              ))}
            </select>
            <select className="rounded-md border bg-[hsl(var(--surface))] px-3 py-2" defaultValue="company" name="assignmentScope" required>
              <option value="employee">{t("hr.lateEarly.scope.employee")}</option>
              <option value="contract">{t("hr.lateEarly.scope.contract")}</option>
              <option value="shift">{t("hr.lateEarly.scope.shift")}</option>
              <option value="department">{t("hr.lateEarly.scope.department")}</option>
              <option value="branch">{t("hr.lateEarly.scope.branch")}</option>
              <option value="company">{t("hr.lateEarly.scope.company")}</option>
            </select>
            <Input name="referenceEntityId" placeholder={t("hr.lateEarly.referenceOptional")} />
            <DatePicker name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
            <Button type="submit" variant="primary">
              {t("hr.lateEarly.assignPolicy")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.policy"), key: "policy", render: (record) => record.policyName },
              { header: t("hr.common.scope"), key: "scope", render: (record) => record.assignmentScope },
              { header: t("hr.common.reference"), key: "reference", render: (record) => record.referenceEntityId ?? "—" },
              { header: t("hr.common.effective"), key: "effective", render: (record) => record.effectiveFrom },
            ]}
            emptyMessage={t("hr.lateEarly.emptyAssignments")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: policyAssignments.length || 1, totalRows: policyAssignments.length }}
            records={policyAssignments}
          />
        </section>
      ) : null}

      {activeTab === "violations" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.lateEarly.violationsTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.workDate },
              { header: t("hr.common.kind"), key: "kind", render: (record) => record.violationKind },
              { header: t("hr.common.lateMin"), key: "late", render: (record) => record.lateMinutes },
              { header: t("hr.common.earlyMin"), key: "early", render: (record) => record.earlyLeaveMinutes },
              { header: t("hr.common.deduction"), key: "deduction", render: (record) => record.deductionMinutes },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) =>
                  record.status.toLowerCase().includes("submitted") ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={approveLateEarlyViolationAction}>
                        <input name="violationId" type="hidden" value={record.id} />
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.common.approve")}
                        </Button>
                      </form>
                      <form action={rejectLateEarlyViolationAction}>
                        <input name="violationId" type="hidden" value={record.id} />
                        <input name="reason" type="hidden" value="Rejected by manager" />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.reject")}
                        </Button>
                      </form>
                      <form action={cancelLateEarlyViolationAction}>
                        <input name="violationId" type="hidden" value={record.id} />
                        <input name="reason" type="hidden" value="Cancelled by HR" />
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.cancel")}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]}
            emptyMessage={t("hr.lateEarly.emptyViolations")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: violations.length || 1, totalRows: violations.length }}
            records={violations}
          />
        </section>
      ) : null}

      {activeTab === "ledger" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <h2 className="text-lg font-medium">{t("hr.lateEarly.ledgerTitle")}</h2>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.date"), key: "date", render: (record) => record.asOfDate },
              { header: t("hr.common.movement"), key: "movement", render: (record) => record.movementKind },
              { header: t("hr.common.late"), key: "late", render: (record) => record.lateMinutes },
              { header: t("hr.common.early"), key: "early", render: (record) => record.earlyLeaveMinutes },
              { header: t("hr.common.deduction"), key: "deduction", render: (record) => record.deductionMinutes },
            ]}
            emptyMessage={t("hr.lateEarly.emptyLedger")}
            getRowId={(record) => record.id}
            pagination={{ mode: "page", page: 1, pageSize: ledger.length || 1, totalRows: ledger.length }}
            records={ledger}
          />
        </section>
      ) : null}

      {activeTab === "timeline" ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="text-lg font-medium">{t("hr.lateEarly.approvalHistoryTitle")}</h2>
            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
                { header: t("hr.common.event"), key: "event", render: (record) => record.eventKind },
                { header: t("hr.common.when"), key: "when", render: (record) => record.occurredAt },
                { header: t("hr.common.reason"), key: "reason", render: (record) => record.reason ?? "—" },
              ]}
              emptyMessage={t("hr.lateEarly.emptyApprovalEvents")}
              getRowId={(record) => record.id}
              pagination={{ mode: "page", page: 1, pageSize: approvalEvents.length || 1, totalRows: approvalEvents.length }}
              records={approvalEvents}
            />
          </section>
          <PlatformTimeline events={timelineEvents} title={t("hr.lateEarly.timelineTitle")} />
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

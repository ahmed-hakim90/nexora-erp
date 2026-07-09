"use client";

import Link from "next/link";

import {
  approveOvertimeRequestAction,
  createOvertimePolicyAction,
  createOvertimeRequestAction,
  rejectOvertimeRequestAction,
  resolveOvertimeCandidateAction,
} from "@/features/hr/routes/actions/hr-overtime-runtime.actions";
import type { HrOvertimeRuntimeWorkspaceData } from "@/features/hr/routes/loaders/hr-overtime-runtime.loader";
import {
  Button,
  DatePicker,
  EditableSectionCard,
  EntityLookup,
  Input,
  PageContainer,
  PlatformTimeline,
  secondaryButtonLinkClassName,
  nativeSelectClassName,
  type PlatformTimelineEvent,
  useTranslations,
} from "@/shared/ui";

import { HrWorkforceEnterpriseTable } from "./hr-workforce-enterprise-table";
import {
  HrWorkforceDateRangeFilters,
  HrWorkforceEmployeeFilter,
  HrWorkforceFilterBar,
  HrWorkforceSearchFilter,
  HrWorkforceStatusFilter,
} from "./hr-workforce-filter-bar";
import { HrWorkforceWorkspaceShell } from "./hr-workforce-workspace-shell";

function buildHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/overtime?${query}` : "/erp/hr/overtime";
}

export function HrOvertimeWorkspace({
  data,
  query = {},
}: Readonly<{
  data: HrOvertimeRuntimeWorkspaceData;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const { approvalEvents, candidates, dashboard, policies, requests, teamView } = data;
  const activeTab = query.tab ?? "overview";
  const searchTerm = (query.search ?? "").trim().toLowerCase();

  const filteredCandidates = candidates.filter((row) => !searchTerm || row.employeeLabel.toLowerCase().includes(searchTerm));
  const filteredRequests = requests.filter((row) => {
    if (query.status && !row.status.toLowerCase().includes(query.status.toLowerCase())) return false;
    return !searchTerm || row.employeeLabel.toLowerCase().includes(searchTerm);
  });

  const timelineEvents: PlatformTimelineEvent[] = approvalEvents.map((event) => ({
    action: event.eventKind,
    actor: event.employeeLabel,
    category: "approval",
    fieldChanges: event.reason ? [event.reason] : undefined,
    key: event.id,
    source: "Overtime approval",
    timestamp: event.occurredAt,
  }));

  const navItems = [
    { href: buildHref({ tab: "overview" }), key: "overview", label: t("hr.overtime.tab.overview") },
    { href: buildHref({ tab: "candidates" }), key: "candidates", label: t("hr.overtime.tab.candidates") },
    { href: buildHref({ tab: "requests" }), key: "requests", label: t("hr.overtime.tab.requests") },
    { href: buildHref({ tab: "policies" }), key: "policies", label: t("hr.overtime.tab.policies") },
    { href: buildHref({ tab: "team" }), key: "team", label: t("hr.overtime.tab.team") },
    { href: buildHref({ tab: "timeline" }), key: "timeline", label: t("hr.overtime.tab.timeline") },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description={t("hr.overtime.description")}
        navItems={navItems}
        summaryMetrics={[
          {
            helper: t("hr.overtime.kpi.pendingApprovals.helper"),
            href: buildHref({ tab: "requests", status: "submitted" }),
            label: t("hr.overtime.kpi.pendingApprovals"),
            value: dashboard.pendingApprovals,
          },
          {
            helper: t("hr.overtime.kpi.candidates.helper"),
            href: buildHref({ tab: "candidates" }),
            label: t("hr.overtime.kpi.candidates"),
            value: dashboard.pendingCandidates,
          },
          {
            helper: t("hr.overtime.kpi.approvedToday.helper"),
            href: buildHref({ tab: "requests", status: "approved" }),
            label: t("hr.overtime.kpi.approvedToday"),
            value: dashboard.approvedToday,
          },
          {
            helper: t("hr.overtime.kpi.activePolicies.helper"),
            href: buildHref({ tab: "policies" }),
            label: t("hr.overtime.kpi.activePolicies"),
            value: dashboard.activePolicies,
          },
        ]}
        title={t("hr.overtime.title")}
        workspaceKey="overtime"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/overtime" query={query} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceSearchFilter defaultValue={query.search} placeholder={t("hr.common.searchEmployee")} />
            <HrWorkforceEmployeeFilter defaultValue={query.employeeId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: t("hr.overtime.status.submitted"), value: "submitted" },
                { label: t("hr.overtime.status.underReview"), value: "under" },
                { label: t("hr.overtime.status.approved"), value: "approved" },
                { label: t("hr.overtime.status.rejected"), value: "rejected" },
              ]}
            />
            <HrWorkforceDateRangeFilters endValue={query.periodEnd} startValue={query.periodStart} />
          </HrWorkforceFilterBar>
        }
        sidebar={
          <EditableSectionCard title={t("hr.common.reports")}>
            <Link className={secondaryButtonLinkClassName} href="/erp/hr/overtime/reports">
              {t("hr.overtime.reportsLink")}
            </Link>
          </EditableSectionCard>
        }
      >
        {activeTab === "overview" ? (
          <EditableSectionCard title={t("hr.overtime.submitSection")}>
            <form action={createOvertimeRequestAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required value={query.employeeId} />
              <DatePicker name="workDate" placeholder={t("hr.common.workDate")} required />
              <Input min={0.5} name="hours" placeholder={t("hr.common.hours")} required step="0.5" type="number" />
              <select className={nativeSelectClassName} defaultValue="normal" name="overtimeType">
                <option value="normal">{t("hr.overtime.type.normal")}</option>
                <option value="weekend">{t("hr.overtime.type.weekend")}</option>
                <option value="holiday">{t("hr.overtime.type.holiday")}</option>
                <option value="night">{t("hr.overtime.type.night")}</option>
                <option value="emergency">{t("hr.overtime.type.emergency")}</option>
              </select>
              <Input defaultValue="1.5" min={1} name="rateMultiplier" step="0.1" type="number" />
              <Input className="md:col-span-2" name="reason" placeholder={t("hr.common.reason")} />
              <Button type="submit" variant="primary">
                {t("hr.overtime.submit")}
              </Button>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "candidates" ? (
          <EditableSectionCard description={t("hr.overtime.candidatesDescription")} title={t("hr.overtime.candidatesTitle")}>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (r) => r.employeeLabel },
                { header: t("hr.common.date"), key: "date", render: (r) => r.workDate },
                { header: t("hr.common.minutes"), key: "minutes", render: (r) => r.candidateMinutes },
                { header: t("hr.common.type"), key: "type", render: (r) => r.overtimeType },
                { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (r) =>
                    r.status.toLowerCase().includes("pending") ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="approve" />
                          <Button size="sm" type="submit" variant="primary">
                            {t("hr.common.approve")}
                          </Button>
                        </form>
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="convert" />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.convert")}
                          </Button>
                        </form>
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="ignore" />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.ignore")}
                          </Button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage={t("hr.overtime.emptyCandidates")}
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredCandidates.length || 1, totalRows: filteredCandidates.length }}
              records={filteredCandidates}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "requests" ? (
          <EditableSectionCard title={t("hr.overtime.requestsTitle")}>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (r) => r.employeeLabel },
                { header: t("hr.common.date"), key: "date", render: (r) => r.workDate },
                { header: t("hr.common.hours"), key: "hours", render: (r) => (r.durationMinutes / 60).toFixed(2) },
                { header: t("hr.common.type"), key: "type", render: (r) => r.overtimeType },
                { header: t("hr.common.rate"), key: "rate", render: (r) => `${r.rateMultiplier}x` },
                {
                  header: t("hr.common.payroll"),
                  key: "payroll",
                  render: (r) => (r.payrollEligible ? t("hr.common.eligible") : t("hr.common.excluded")),
                },
                { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                {
                  header: t("hr.common.approve"),
                  key: "approve",
                  render: (r) =>
                    r.status.toLowerCase().includes("submitted") || r.status.toLowerCase().includes("under review") ? (
                      <div className="flex gap-2">
                        <form action={approveOvertimeRequestAction}>
                          <input name="overtimeRequestId" type="hidden" value={r.id} />
                          <Button size="sm" type="submit" variant="primary">
                            {t("hr.common.approve")}
                          </Button>
                        </form>
                        <form action={rejectOvertimeRequestAction}>
                          <input name="overtimeRequestId" type="hidden" value={r.id} />
                          <input name="reason" type="hidden" value="Rejected from workspace" />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.reject")}
                          </Button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage={t("hr.overtime.emptyRequests")}
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredRequests.length || 1, totalRows: filteredRequests.length }}
              records={filteredRequests}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "policies" ? (
          <EditableSectionCard title={t("hr.overtime.policiesTitle")}>
            <form action={createOvertimePolicyAction} className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input name="code" placeholder={t("hr.overtime.policyCode")} required />
              <Input name="name" placeholder={t("hr.overtime.policyName")} required />
              <DatePicker name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
              <Input defaultValue="1.5" min={1} name="rateMultiplier" step="0.1" type="number" />
              <select className={nativeSelectClassName} defaultValue="normal" name="overtimeType">
                <option value="normal">{t("hr.overtime.type.normal")}</option>
                <option value="weekend">{t("hr.overtime.type.weekend")}</option>
                <option value="holiday">{t("hr.overtime.type.holiday")}</option>
              </select>
              <Button type="submit" variant="secondary">
                {t("hr.overtime.createPolicy")}
              </Button>
            </form>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.code"), key: "code", render: (r) => r.code },
                { header: t("hr.common.name"), key: "name", render: (r) => r.name },
                { header: t("hr.common.type"), key: "type", render: (r) => r.overtimeType },
                { header: t("hr.common.rate"), key: "rate", render: (r) => `${r.rateMultiplier}x` },
                { header: t("hr.common.effective"), key: "effective", render: (r) => r.effectiveFrom },
                { header: t("hr.common.status"), key: "status", render: (r) => r.status },
              ]}
              emptyMessage={t("hr.overtime.emptyPolicies")}
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: policies.length || 1, totalRows: policies.length }}
              records={policies}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "team" ? (
          <EditableSectionCard title={t("hr.overtime.teamTitle")}>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
                { header: t("hr.common.date"), key: "date", render: (r) => r.workDate },
                { header: t("hr.common.minutes"), key: "minutes", render: (r) => r.durationMinutes },
                { header: t("hr.common.type"), key: "type", render: (r) => r.overtimeType },
                { header: t("hr.common.status"), key: "status", render: (r) => r.status },
              ]}
              emptyMessage={t("hr.overtime.emptyTeam")}
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: teamView.length || 1, totalRows: teamView.length }}
              records={teamView}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title={t("hr.overtime.timelineTitle")} /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}

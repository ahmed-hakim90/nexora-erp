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
    { href: buildHref({ tab: "overview" }), key: "overview", label: "Overview" },
    { href: buildHref({ tab: "candidates" }), key: "candidates", label: "Candidates" },
    { href: buildHref({ tab: "requests" }), key: "requests", label: "Requests" },
    { href: buildHref({ tab: "policies" }), key: "policies", label: "Policies" },
    { href: buildHref({ tab: "team" }), key: "team", label: "Team View" },
    { href: buildHref({ tab: "timeline" }), key: "timeline", label: "Timeline" },
  ] as const;

  return (
    <PageContainer className="max-w-[96rem]">
      <HrWorkforceWorkspaceShell
        activeTab={activeTab}
        description="Overtime policy engine, attendance candidates, approval workflow, and payroll input runtime."
        navItems={navItems}
        summaryMetrics={[
          { helper: "Awaiting manager/HR action", href: buildHref({ tab: "requests", status: "submitted" }), label: "Pending Approvals", value: dashboard.pendingApprovals },
          { helper: "From attendance aggregation", href: buildHref({ tab: "candidates" }), label: "Candidates", value: dashboard.pendingCandidates },
          { helper: "Approved for today", href: buildHref({ tab: "requests", status: "approved" }), label: "Approved Today", value: dashboard.approvedToday },
          { helper: "Active overtime policies", href: buildHref({ tab: "policies" }), label: "Active Policies", value: dashboard.activePolicies },
        ]}
        title="Overtime"
        workspaceKey="overtime"
        filters={
          <HrWorkforceFilterBar basePath="/erp/hr/overtime" query={query} resetHref={buildHref({ tab: activeTab })}>
            <HrWorkforceSearchFilter defaultValue={query.search} placeholder="Search employee" />
            <HrWorkforceEmployeeFilter defaultValue={query.employeeId} />
            <HrWorkforceStatusFilter
              defaultValue={query.status}
              options={[
                { label: "Submitted", value: "submitted" },
                { label: "Under review", value: "under" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ]}
            />
            <HrWorkforceDateRangeFilters endValue={query.periodEnd} startValue={query.periodStart} />
          </HrWorkforceFilterBar>
        }
        sidebar={
          <EditableSectionCard title="Reports">
            <Link className={secondaryButtonLinkClassName} href="/erp/hr/overtime/reports">
              Open overtime reports
            </Link>
          </EditableSectionCard>
        }
      >
        {activeTab === "overview" ? (
          <EditableSectionCard title="Submit Overtime Request">
            <form action={createOvertimeRequestAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required value={query.employeeId} />
              <DatePicker name="workDate" placeholder="Work date" required />
              <Input min={0.5} name="hours" placeholder="Hours" required step="0.5" type="number" />
              <select className={nativeSelectClassName} defaultValue="normal" name="overtimeType">
                <option value="normal">Normal</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Holiday</option>
                <option value="night">Night</option>
                <option value="emergency">Emergency</option>
              </select>
              <Input defaultValue="1.5" min={1} name="rateMultiplier" step="0.1" type="number" />
              <Input className="md:col-span-2" name="reason" placeholder="Reason" />
              <Button type="submit" variant="primary">
                Submit overtime
              </Button>
            </form>
          </EditableSectionCard>
        ) : null}

        {activeTab === "candidates" ? (
          <EditableSectionCard description="Attendance-derived overtime candidates with quick approve, convert, or ignore actions." title="Attendance Candidates">
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Minutes", key: "minutes", render: (r) => r.candidateMinutes },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (r) =>
                    r.status.toLowerCase().includes("pending") ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="approve" />
                          <Button size="sm" type="submit" variant="primary">Approve</Button>
                        </form>
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="convert" />
                          <Button size="sm" type="submit" variant="secondary">Convert</Button>
                        </form>
                        <form action={resolveOvertimeCandidateAction}>
                          <input name="candidateId" type="hidden" value={r.id} />
                          <input name="action" type="hidden" value="ignore" />
                          <Button size="sm" type="submit" variant="secondary">Ignore</Button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage="No overtime candidates from attendance."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredCandidates.length || 1, totalRows: filteredCandidates.length }}
              records={filteredCandidates}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "requests" ? (
          <EditableSectionCard title="Overtime Requests">
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employeeLabel },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Hours", key: "hours", render: (r) => (r.durationMinutes / 60).toFixed(2) },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Rate", key: "rate", render: (r) => `${r.rateMultiplier}x` },
                { header: "Payroll", key: "payroll", render: (r) => (r.payrollEligible ? "Eligible" : "Excluded") },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Approve",
                  key: "approve",
                  render: (r) =>
                    r.status.toLowerCase().includes("submitted") || r.status.toLowerCase().includes("under review") ? (
                      <div className="flex gap-2">
                        <form action={approveOvertimeRequestAction}>
                          <input name="overtimeRequestId" type="hidden" value={r.id} />
                          <Button size="sm" type="submit" variant="primary">Approve</Button>
                        </form>
                        <form action={rejectOvertimeRequestAction}>
                          <input name="overtimeRequestId" type="hidden" value={r.id} />
                          <input name="reason" type="hidden" value="Rejected from workspace" />
                          <Button size="sm" type="submit" variant="secondary">Reject</Button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    ),
                },
              ]}
              emptyMessage="No overtime requests."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: filteredRequests.length || 1, totalRows: filteredRequests.length }}
              records={filteredRequests}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "policies" ? (
          <EditableSectionCard title="Overtime Policies">
            <form action={createOvertimePolicyAction} className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input name="code" placeholder="Policy code" required />
              <Input name="name" placeholder="Policy name" required />
              <DatePicker name="effectiveFrom" placeholder="Effective from" required />
              <Input defaultValue="1.5" min={1} name="rateMultiplier" step="0.1" type="number" />
              <select className={nativeSelectClassName} defaultValue="normal" name="overtimeType">
                <option value="normal">Normal</option>
                <option value="weekend">Weekend</option>
                <option value="holiday">Holiday</option>
              </select>
              <Button type="submit" variant="secondary">Create policy</Button>
            </form>
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Code", key: "code", render: (r) => r.code },
                { header: "Name", key: "name", render: (r) => r.name },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Rate", key: "rate", render: (r) => `${r.rateMultiplier}x` },
                { header: "Effective", key: "effective", render: (r) => r.effectiveFrom },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No overtime policies configured."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: policies.length || 1, totalRows: policies.length }}
              records={policies}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "team" ? (
          <EditableSectionCard title="Team View">
            <HrWorkforceEnterpriseTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employee },
                { header: "Date", key: "date", render: (r) => r.workDate },
                { header: "Minutes", key: "minutes", render: (r) => r.durationMinutes },
                { header: "Type", key: "type", render: (r) => r.overtimeType },
                { header: "Status", key: "status", render: (r) => r.status },
              ]}
              emptyMessage="No team overtime scheduled."
              getRowId={(r) => r.id}
              pagination={{ mode: "page", page: 1, pageSize: teamView.length || 1, totalRows: teamView.length }}
              records={teamView}
            />
          </EditableSectionCard>
        ) : null}

        {activeTab === "timeline" ? <PlatformTimeline events={timelineEvents} title="Overtime approval timeline" /> : null}
      </HrWorkforceWorkspaceShell>
    </PageContainer>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { HrEmployeeProfileData } from "@/features/hr/routes/loaders/hr-employee-profile.loader";
import { archiveEmployeeSkillRecordAction, createEmployeeSkillRecordAction } from "@/features/hr/routes/actions/hr-employee-skills.actions";
import {
  archiveHrEmployeeDocumentAction,
  createHrCustodyAssignmentAction,
  createHrEmployeeDocumentAction,
  createHrRequestAction,
  updateEmployeePhotoAction,
} from "@/features/hr/routes/actions/hr-operational.actions";
import { HR_CUSTODY_ASSET_TYPES, HR_DOCUMENT_TYPES, HR_PRINT_TEMPLATE_KEYS, HR_REQUEST_TYPES } from "@/features/hr/public-api";
import { formatHrStatusLabel, resolveHrTabHelp } from "@/features/hr/public-api";
import {
  AdaptiveWorkspaceNav,
  AttachmentPanel,
  Button,
  DatePicker,
  HelpHint,
  Input,
  PlatformTimeline,
  ProfileActivityRail,
  ProfileBody,
  ProfileHeader,
  ProfileLayout,
  ProfileQuickActions,
  ProfileRelatedRecords,
  ProfileSidebar,
  ProfileStatusBadge,
  ProfileSummaryMetric,
  ProfileSummaryStrip,
  cn,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  type PlatformTimelineEvent,
} from "@/shared/ui";

import {
  HrEmployeeEmploymentSection,
  HrEmployeeOverviewSections,
  HrEmployeePersonalSection,
  HrEmployeeProfileEditablePage,
} from "./hr-employee-profile-editable";

const PROFILE_FAVORITES_KEY = "nexora.hr.employee.profile.favorites";
const PROFILE_RECENT_KEY = "nexora.hr.employee.profile.recent";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
  { key: "assignments", label: "Assignments" },
  { key: "contracts", label: "Contracts" },
  { key: "compensation", label: "Compensation" },
  { key: "attendance-leave", label: "Attendance & leave" },
  { key: "skills", label: "Skills" },
  { key: "documents", label: "Documents" },
  { key: "custody", label: "Custody" },
  { key: "payroll-readiness", label: "Payroll readiness" },
  { key: "requests", label: "Requests" },
  { key: "timeline", label: "Timeline" },
  { key: "audit", label: "Audit" },
] as const;

function readStoredKeys(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredKeys(storageKey: string, keys: readonly string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(keys));
}

function mapTimelineEvents(data: HrEmployeeProfileData): readonly PlatformTimelineEvent[] {
  return data.timeline.map((entry) => ({
    action: entry.label,
    actor: "System",
    category: entry.sourceDocumentType ? "attachment" : "status",
    key: entry.id,
    source: entry.sourceDocumentType ?? entry.eventType,
    timestamp: entry.occurredAt,
  }));
}

function EmployeeAvatar({ name, photoUrl }: Readonly<{ name: string; photoUrl?: string | null }>) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="inline-flex size-14 items-center justify-center overflow-hidden rounded-2xl border bg-[hsl(var(--muted))] text-sm font-semibold">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={photoUrl} />
      ) : (
        initials || "HR"
      )}
    </span>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string | null | undefined }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value || "—"}</span>
    </div>
  );
}

export function HrEmployeeProfileWorkspace({
  data,
  tab = "overview",
}: Readonly<{ data: HrEmployeeProfileData; tab?: string }>) {
  const activeTab = tabs.find((item) => item.key === tab)?.key ?? "overview";
  const [favoriteTabKeys, setFavoriteTabKeys] = useState<string[]>([]);
  const [recentTabKeys, setRecentTabKeys] = useState<string[]>([]);
  const timelineEvents = useMemo(() => mapTimelineEvents(data), [data]);

  useEffect(() => {
    setFavoriteTabKeys(readStoredKeys(PROFILE_FAVORITES_KEY));
    setRecentTabKeys(readStoredKeys(PROFILE_RECENT_KEY));
  }, []);

  useEffect(() => {
    setRecentTabKeys((current) => {
      const nextRecent = [activeTab, ...current.filter((key) => key !== activeTab)].slice(0, 6);
      writeStoredKeys(PROFILE_RECENT_KEY, nextRecent);
      return nextRecent;
    });
  }, [activeTab]);

  const navItems = tabs.map((item) => {
    const tabHelp = resolveHrTabHelp(item.key);
    return {
      favorite: favoriteTabKeys.includes(item.key),
      href: `/erp/hr/employees/${data.employee.id}?tab=${item.key}`,
      key: item.key,
      label: (
        <span className="inline-flex items-center gap-1">
          {item.label}
          {tabHelp ? <HelpHint help={tabHelp} side="bottom" /> : null}
        </span>
      ),
    };
  });

  const toggleFavoriteTab = (key: string) => {
    setFavoriteTabKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      writeStoredKeys(PROFILE_FAVORITES_KEY, next);
      return next;
    });
  };

  const quickActions = (
    <ProfileQuickActions sticky={false} title="Quick actions">
      <a
        className={secondaryButtonLinkClassName}
        href={`/api/hr/print/${encodeURIComponent(HR_PRINT_TEMPLATE_KEYS.employeeProfile)}?employeeId=${data.employee.id}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Print profile
      </a>
      <a
        className={secondaryButtonLinkClassName}
        href={`/api/hr/print/${encodeURIComponent(HR_PRINT_TEMPLATE_KEYS.employeeCertificate)}?employeeId=${data.employee.id}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Employment certificate
      </a>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/assignments?employeeId=${data.employee.id}&create=1`}>
        Change assignment
      </Link>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/documents?employeeId=${data.employee.id}&upload=1`}>
        Upload document
      </Link>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/requests?employeeId=${data.employee.id}&create=1`}>
        New HR action
      </Link>
    </ProfileQuickActions>
  );

  const sidebar = (
    <ProfileSidebar>
      <ProfileActivityRail title="Recent activity">
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ol className="space-y-2">
            {timelineEvents.slice(0, 5).map((event) => (
              <li className="text-sm" key={event.key}>
                <p className="font-medium">{event.action}</p>
                <p className="text-xs text-muted-foreground">{event.timestamp}</p>
              </li>
            ))}
          </ol>
        )}
      </ProfileActivityRail>
      <ProfileRelatedRecords title="Related records">
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/contracts?employeeId=${data.employee.id}`}>
          Contracts ({data.contracts.length})
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/leave?employeeId=${data.employee.id}`}>
          Leave requests ({data.leaveRuntime.requests.length})
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/assignments?employeeId=${data.employee.id}`}>
          Assignments
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/attendance-leave?employeeId=${data.employee.id}`}>
          Attendance & leave
        </Link>
      </ProfileRelatedRecords>
      {quickActions}
    </ProfileSidebar>
  );

  return (
    <HrEmployeeProfileEditablePage data={data}>
      <ProfileLayout>
        <ProfileHeader
          avatar={
            <div className="space-y-2">
              <EmployeeAvatar name={data.employee.fullName} />
              <form action={updateEmployeePhotoAction.bind(null, data.employee.id)} encType="multipart/form-data">
                <label className="sr-only" htmlFor={`employee-photo-${data.employee.id}`}>
                  Upload employee photo
                </label>
                <input
                  accept="image/*"
                  className="block w-full max-w-[10rem] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1.5 text-xs file:me-2 file:rounded-md file:border file:border-[hsl(var(--border))] file:bg-[hsl(var(--muted))] file:px-2 file:py-1 file:text-xs"
                  id={`employee-photo-${data.employee.id}`}
                  name="file"
                  type="file"
                />
                <Button className="mt-2" size="sm" type="submit" variant="secondary">
                  Upload photo
                </Button>
              </form>
            </div>
          }
          badges={<ProfileStatusBadge label={formatHrStatusLabel(data.employee.status)} tone="info" />}
          description="Enterprise employee profile with inline editing, assignment context, and operational workspaces."
          subtitle={data.employee.employeeNumber}
          title={data.employee.fullName}
        />

        <ProfileSummaryStrip>
          <ProfileSummaryMetric
            helper={data.assignment.department?.label ?? "Unassigned"}
            label="Position"
            value={data.assignment.position?.label ?? "—"}
          />
          <ProfileSummaryMetric label="Branch" value={data.employee.branchLabel ?? "—"} />
          <ProfileSummaryMetric label="Contracts" value={String(data.contracts.length)} />
          <ProfileSummaryMetric
            helper={data.payrollReadiness.length > 0 ? `${data.payrollReadiness.length} blockers` : "Ready"}
            label="Payroll readiness"
            value={data.payrollReadiness.length > 0 ? "Attention" : "Clear"}
          />
        </ProfileSummaryStrip>

        <AdaptiveWorkspaceNav
          activeKey={activeTab}
          favoriteKeys={favoriteTabKeys}
          items={navItems}
          label="Employee profile sections"
          onToggleFavorite={toggleFavoriteTab}
          recentKeys={recentTabKeys}
        />

        <ProfileBody sidebar={sidebar}>
          {activeTab === "overview" ? <HrEmployeeOverviewSections data={data} /> : null}
          {activeTab === "personal" ? <HrEmployeePersonalSection data={data} /> : null}
          {activeTab === "employment" ? <HrEmployeeEmploymentSection data={data} /> : null}

          {activeTab === "assignments" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Assignment timeline and changes are managed in the Assignments workspace.
              </p>
              <Link className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)} href={`/erp/hr/assignments?employeeId=${data.employee.id}`}>
                Open assignment timeline
              </Link>
            </article>
          ) : null}

          {activeTab === "timeline" ? (
            <PlatformTimeline events={timelineEvents} title="Employee timeline" />
          ) : null}

          {activeTab === "audit" ? (
            <PlatformTimeline
              events={timelineEvents.map((event) => ({ ...event, category: "audit" as const }))}
              title="Audit history"
            />
          ) : null}

          {activeTab === "contracts" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              {data.contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contracts on file.</p>
              ) : (
                <ul className="space-y-2">
                  {data.contracts.map((contract) => (
                    <li className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={contract.id}>
                      <span>
                        {contract.contractNumber} — {contract.status}
                      </span>
                      <span className="text-muted-foreground">
                        {contract.startsOn}
                        {contract.endsOn ? ` → ${contract.endsOn}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)} href={`/erp/hr/contracts?employeeId=${data.employee.id}`}>
                Open contracts workspace
              </Link>
            </article>
          ) : null}

          {activeTab === "compensation" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <div className="space-y-2">
                <InfoRow label="Active advances" value={String(data.financialSummary.activeAdvances)} />
                <InfoRow label="Active loans" value={String(data.financialSummary.activeLoans)} />
                <InfoRow label="Pending bonuses" value={String(data.financialSummary.pendingBonuses)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className={secondaryButtonLinkClassName} href={`/erp/hr/advances?search=${data.employee.fullName}`}>Advances</Link>
                <Link className={secondaryButtonLinkClassName} href={`/erp/hr/loans?search=${data.employee.fullName}`}>Loans</Link>
                <Link className={secondaryButtonLinkClassName} href="/erp/hr/compensation?tab=assignments">Assign salary package</Link>
              </div>
            </article>
          ) : null}

          {activeTab === "attendance-leave" ? (
            <div className="space-y-4">
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
                <h2 className="font-medium">Current balances</h2>
                <div className="mt-4 space-y-2">
                  {data.leaveRuntime.balances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leave balances recorded yet.</p>
                  ) : (
                    data.leaveRuntime.balances.map((item) => (
                      <InfoRow
                        key={`${item.leaveType}-balance`}
                        label={item.leaveType}
                        value={`${item.available} available · ${item.pending} pending · ${item.consumed} consumed · ${item.carriedForward} carried`}
                      />
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
                <h2 className="font-medium">Late / Early</h2>
                <div className="mt-4 space-y-2">
                  <InfoRow label="Policy" value={data.lateEarlyRuntime.policyName} />
                  <InfoRow label="Monthly late (min)" value={String(data.lateEarlyRuntime.monthlyLateMinutes)} />
                  <InfoRow label="Monthly early (min)" value={String(data.lateEarlyRuntime.monthlyEarlyMinutes)} />
                  <InfoRow label="Pending violations" value={String(data.lateEarlyRuntime.pendingViolations)} />
                </div>
                <ul className="mt-4 space-y-2">
                  {data.lateEarlyRuntime.violations.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No violations on file.</li>
                  ) : (
                    data.lateEarlyRuntime.violations.slice(0, 10).map((item) => (
                      <li className="border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                        {item.workDate} — {item.violationKind}: late {item.lateMinutes} / early {item.earlyLeaveMinutes} min ({item.status})
                      </li>
                    ))
                  )}
                </ul>
              </article>

              <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early">
                Open late/early management
              </Link>
              <Link className={secondaryButtonLinkClassName} href={`/erp/hr/attendance-leave?employeeId=${data.employee.id}`}>
                Open attendance & leave workspace
              </Link>
            </div>
          ) : null}

          {activeTab === "skills" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createEmployeeSkillRecordAction} className="grid gap-3 md:grid-cols-3">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="skillId" required>
                  <option value="">Select skill</option>
                  {data.skillOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <DatePicker name="effectiveFrom" placeholder="Effective from" />
                <Button type="submit" variant="primary">Add skill</Button>
              </form>
              <ul className="space-y-2">
                {data.skillRecords.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No skills recorded.</li>
                ) : (
                  data.skillRecords.map((item) => (
                    <li className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                      <span>{item.skillName} — {item.status} (from {item.effectiveFrom})</span>
                      <form action={archiveEmployeeSkillRecordAction.bind(null, item.id)}>
                        <Button size="sm" type="submit" variant="secondary">Archive</Button>
                      </form>
                    </li>
                  ))
                )}
              </ul>
            </article>
          ) : null}

          {activeTab === "documents" ? (
            <div className="space-y-4">
              <form action={createHrEmployeeDocumentAction} className="grid gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5" encType="multipart/form-data">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="documentType" required>
                  <option value="">Document type</option>
                  {HR_DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <Input name="fileName" placeholder="Title (if no file)" />
                <input accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" name="file" type="file" />
                <DatePicker name="expiryDate" placeholder="Expiry date" />
                <Button type="submit" variant="primary">Upload</Button>
              </form>
              <AttachmentPanel
                attachments={data.documents.map((doc) => ({
                  fileName: doc.fileName,
                  id: doc.id,
                  status: doc.status,
                  uploadedAt: doc.expiresOn ? `Expires ${doc.expiresOn}` : undefined,
                }))}
                emptyMessage="No documents on file."
                title="Employee documents"
              />
            </div>
          ) : null}

          {activeTab === "custody" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createHrCustodyAssignmentAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="assetType" required>
                  <option value="">Asset type</option>
                  {HR_CUSTODY_ASSET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <Input name="assetLabel" placeholder="Asset label" required />
                <DatePicker name="effectiveDate" placeholder="Assignment date" required />
                <Button type="submit" variant="primary">Assign</Button>
              </form>
              <ul className="space-y-2">
                {data.custodyItems.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No custody items.</li>
                ) : (
                  data.custodyItems.map((item) => (
                    <li className="border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                      {item.assetLabel} — {item.assetType} ({item.status}) assigned {item.effectiveDate}
                    </li>
                  ))
                )}
              </ul>
            </article>
          ) : null}

          {activeTab === "payroll-readiness" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <h2 className="font-medium">Payroll readiness blockers</h2>
              <div className="mt-4 space-y-2">
                {data.payrollReadiness.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No blocking readiness issues.</p>
                ) : (
                  data.payrollReadiness.map((item) => (
                    <p className="text-sm" key={`${item.label}-${item.status}`}>
                      {item.label} — {item.status}
                    </p>
                  ))
                )}
              </div>
              <Link className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)} href="/erp/hr/payroll-readiness">
                Open payroll readiness dashboard
              </Link>
            </article>
          ) : null}

          {activeTab === "requests" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createHrRequestAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="requestType" required>
                  <option value="">Request type</option>
                  {HR_REQUEST_TYPES.map((type) => (
                    <option key={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`} value={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <DatePicker name="effectiveDate" placeholder="Effective date" required />
                <Input name="notes" placeholder="Notes" />
                <Button type="submit" variant="primary">Create request</Button>
              </form>
              <ul className="space-y-2">
                {data.pendingActions.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No pending requests.</li>
                ) : (
                  data.pendingActions.map((item) => (
                    <li className="flex items-center justify-between gap-3 text-sm" key={item.id}>
                      <span>{item.label}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{item.status}</span>
                    </li>
                  ))
                )}
              </ul>
            </article>
          ) : null}
        </ProfileBody>
      </ProfileLayout>
    </HrEmployeeProfileEditablePage>
  );
}

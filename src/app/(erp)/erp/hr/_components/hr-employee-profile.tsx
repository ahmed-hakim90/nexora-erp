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
import { HR_CUSTODY_ASSET_TYPES, HR_DOCUMENT_TYPES, HR_PRINT_TEMPLATE_KEYS, HR_REQUEST_TYPES, resolveHrTabHelp, translateHrAssetType, translateHrDocumentType, translateHrMessageKey, translateHrRequestTypeLabel, translateHrStatus, translateHrTimelineEvent } from "@/features/hr/public-api";
import type { TranslateFn } from "@/platform/localization/public-api";
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
  EditablePageToolbar,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  type PlatformTimelineEvent,
  useTranslations,
} from "@/shared/ui";

import { HrEmployeeDocumentChecklist } from "./hr-employee-document-checklist";
import { HrEmployeeCompensationSection } from "./hr-employee-compensation-section";
import {
  HrEmployeeEmploymentSection,
  HrEmployeeOverviewSections,
  HrEmployeePersonalSection,
  HrEmployeeProfileEditablePage,
} from "./hr-employee-profile-editable";

const PROFILE_FAVORITES_KEY = "nexora.hr.employee.profile.favorites";
const PROFILE_RECENT_KEY = "nexora.hr.employee.profile.recent";

const PROFILE_TABS = [
  "overview",
  "personal",
  "employment",
  "assignments",
  "contracts",
  "compensation",
  "attendance-leave",
  "skills",
  "documents",
  "custody",
  "payroll-readiness",
  "requests",
  "timeline",
  "audit",
] as const;

const PROFILE_TAB_LABEL_KEYS: Record<(typeof PROFILE_TABS)[number], string> = {
  overview: "hr.employees.profile.overview",
  personal: "hr.employees.profile.tab.personal",
  employment: "hr.employees.profile.tab.employment",
  assignments: "hr.employees.profile.tab.assignments",
  contracts: "hr.employees.profile.tab.contracts",
  compensation: "hr.employees.profile.tab.compensation",
  "attendance-leave": "hr.employees.profile.tab.attendanceLeave",
  skills: "hr.employees.profile.tab.skills",
  documents: "hr.employees.profile.tab.documents",
  custody: "hr.employees.profile.tab.custody",
  "payroll-readiness": "hr.employees.profile.tab.payrollReadiness",
  requests: "hr.employees.profile.tab.requests",
  timeline: "hr.employees.profile.tab.timeline",
  audit: "hr.employees.profile.tab.audit",
};

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

function mapTimelineEvents(data: HrEmployeeProfileData, actorLabel: string, t: TranslateFn): readonly PlatformTimelineEvent[] {
  return data.timeline.map((entry) => ({
    action: translateHrTimelineEvent(t, entry.eventType),
    actor: actorLabel,
    category: entry.sourceDocumentType ? "attachment" : "status",
    key: entry.id,
    source: entry.sourceDocumentType ?? entry.eventType,
    timestamp: entry.occurredAt,
  }));
}

function EmployeeAvatar({
  className,
  name,
  photoUrl,
}: Readonly<{ className?: string; name: string; photoUrl?: string | null }>) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={cn(
        "inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-base font-semibold",
        className,
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={photoUrl} />
      ) : (
        initials || "HR"
      )}
    </span>
  );
}

function EmployeeAvatarUpload({
  employeeId,
  name,
  photoUrl,
}: Readonly<{ employeeId: string; name: string; photoUrl?: string | null }>) {
  const t = useTranslations();
  const inputId = `employee-photo-${employeeId}`;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <EmployeeAvatar name={name} photoUrl={photoUrl} />
      <form action={updateEmployeePhotoAction.bind(null, employeeId)} encType="multipart/form-data">
        <label className="sr-only" htmlFor={inputId}>
          {t("hr.employees.profile.uploadPhotoSrOnly")}
        </label>
        <input
          accept="image/*"
          className="sr-only"
          id={inputId}
          name="file"
          type="file"
          onChange={(event) => {
            if (event.currentTarget.files?.[0]) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button
          onClick={() => document.getElementById(inputId)?.click()}
          size="sm"
          type="button"
          variant="secondary"
        >
          {t("hr.employees.profile.uploadPhoto")}
        </Button>
      </form>
    </div>
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
  uploadKind,
}: Readonly<{ data: HrEmployeeProfileData; tab?: string; uploadKind?: string }>) {
  const t = useTranslations();
  const activeTab = PROFILE_TABS.find((item) => item === tab) ?? "overview";
  const [favoriteTabKeys, setFavoriteTabKeys] = useState<string[]>([]);
  const [recentTabKeys, setRecentTabKeys] = useState<string[]>([]);
  const [selectedUploadType, setSelectedUploadType] = useState(uploadKind ?? "");
  const timelineEvents = useMemo(
    () => mapTimelineEvents(data, t("hr.employees.profile.timelineActor"), t),
    [data, t],
  );

  useEffect(() => {
    setFavoriteTabKeys(readStoredKeys(PROFILE_FAVORITES_KEY));
    setRecentTabKeys(readStoredKeys(PROFILE_RECENT_KEY));
  }, []);

  useEffect(() => {
    if (uploadKind) setSelectedUploadType(uploadKind);
  }, [uploadKind]);

  useEffect(() => {
    setRecentTabKeys((current) => {
      const nextRecent = [activeTab, ...current.filter((key) => key !== activeTab)].slice(0, 6);
      writeStoredKeys(PROFILE_RECENT_KEY, nextRecent);
      return nextRecent;
    });
  }, [activeTab]);

  const navItems = useMemo(
    () =>
      PROFILE_TABS.map((key) => {
        const tabHelp = resolveHrTabHelp(key);
        return {
          favorite: favoriteTabKeys.includes(key),
          href: `/erp/hr/employees/${data.employee.id}?tab=${key}`,
          key,
          label: (
            <span className="inline-flex items-center gap-1">
              {translateHrMessageKey(t, PROFILE_TAB_LABEL_KEYS[key])}
              {tabHelp ? <HelpHint help={tabHelp} side="bottom" /> : null}
            </span>
          ),
        };
      }),
    [data.employee.id, favoriteTabKeys, t],
  );

  const toggleFavoriteTab = (key: string) => {
    setFavoriteTabKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      writeStoredKeys(PROFILE_FAVORITES_KEY, next);
      return next;
    });
  };

  const quickActions = (
    <ProfileQuickActions sticky={false} title={t("hr.employees.profile.quickActions")}>
      <a
        className={secondaryButtonLinkClassName}
        href={`/api/hr/print/${encodeURIComponent(HR_PRINT_TEMPLATE_KEYS.employeeProfile)}?employeeId=${data.employee.id}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("hr.employees.profile.printProfile")}
      </a>
      <a
        className={secondaryButtonLinkClassName}
        href={`/api/hr/print/${encodeURIComponent(HR_PRINT_TEMPLATE_KEYS.employeeCertificate)}?employeeId=${data.employee.id}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("hr.employees.profile.employmentCertificate")}
      </a>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/assignments?employeeId=${data.employee.id}&create=1`}>
        {t("hr.employees.profile.changeAssignment")}
      </Link>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/documents?employeeId=${data.employee.id}&upload=1`}>
        {t("hr.employees.profile.uploadDocument")}
      </Link>
      <Link className={secondaryButtonLinkClassName} href={`/erp/hr/requests?employeeId=${data.employee.id}&create=1`}>
        {t("hr.employees.profile.newHrAction")}
      </Link>
    </ProfileQuickActions>
  );

  const sidebar = (
    <ProfileSidebar>
      <ProfileActivityRail title={t("hr.employees.profile.recentActivity")}>
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("hr.employees.profile.noRecentActivity")}</p>
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
      <ProfileRelatedRecords title={t("hr.employees.profile.relatedRecords")}>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/contracts?employeeId=${data.employee.id}`}>
          {t("hr.employees.profile.contractsLink", { count: data.contracts.length })}
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/leave?employeeId=${data.employee.id}`}>
          {t("hr.employees.profile.leaveRequestsLink", { count: data.leaveRuntime.requests.length })}
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/assignments?employeeId=${data.employee.id}`}>
          {t("hr.assignments.title")}
        </Link>
        <Link className={secondaryButtonLinkClassName} href={`/erp/hr/attendance-leave?employeeId=${data.employee.id}`}>
          {t("hr.attendanceLeave.title")}
        </Link>
      </ProfileRelatedRecords>
      {quickActions}
    </ProfileSidebar>
  );

  return (
    <HrEmployeeProfileEditablePage data={data}>
      <ProfileLayout>
        <ProfileHeader
          actions={<EditablePageToolbar />}
          avatar={<EmployeeAvatarUpload employeeId={data.employee.id} name={data.employee.fullName} />}
          badges={<ProfileStatusBadge label={translateHrStatus(t, data.employee.status)} tone="info" />}
          description={t("hr.employees.profile.description")}
          subtitle={data.employee.employeeNumber}
          title={data.employee.fullName}
        />

        <ProfileSummaryStrip>
          <ProfileSummaryMetric
            helper={data.assignment.department?.label ?? t("hr.employees.profile.unassigned")}
            label={t("hr.common.position")}
            value={data.assignment.position?.label ?? "—"}
          />
          <ProfileSummaryMetric label={t("hr.common.branch")} value={data.employee.branchLabel ?? "—"} />
          <ProfileSummaryMetric label={t("hr.employees.profile.metric.contracts")} value={String(data.contracts.length)} />
          <ProfileSummaryMetric
            helper={
              data.payrollReadiness.length > 0
                ? t("hr.employees.profile.metric.blockers", { count: data.payrollReadiness.length })
                : t("hr.employees.profile.metric.ready")
            }
            label={t("hr.employees.profile.metric.payrollReadiness")}
            value={data.payrollReadiness.length > 0 ? t("hr.employees.profile.metric.attention") : t("hr.employees.profile.metric.clear")}
          />
        </ProfileSummaryStrip>

        <AdaptiveWorkspaceNav
          activeKey={activeTab}
          favoriteKeys={favoriteTabKeys}
          items={navItems}
          label={t("hr.employees.profile.navLabel")}
          onToggleFavorite={toggleFavoriteTab}
          recentKeys={recentTabKeys}
        />

        <ProfileBody sidebar={sidebar}>
          {activeTab === "overview" ? <HrEmployeeOverviewSections data={data} /> : null}
          {activeTab === "personal" ? <HrEmployeePersonalSection data={data} /> : null}
          {activeTab === "employment" ? <HrEmployeeEmploymentSection data={data} /> : null}

          {activeTab === "assignments" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">{t("hr.employees.profile.assignmentsManaged")}</p>
              <Link className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)} href={`/erp/hr/assignments?employeeId=${data.employee.id}`}>
                {t("hr.employees.profile.openAssignmentTimeline")}
              </Link>
            </article>
          ) : null}

          {activeTab === "timeline" ? (
            <PlatformTimeline events={timelineEvents} title={t("hr.employees.profile.employeeTimeline")} />
          ) : null}

          {activeTab === "audit" ? (
            <PlatformTimeline
              events={timelineEvents.map((event) => ({ ...event, category: "audit" as const }))}
              title={t("hr.employees.profile.auditHistory")}
            />
          ) : null}

          {activeTab === "contracts" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              {data.contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("hr.employees.profile.noContracts")}</p>
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
                {t("hr.employees.profile.openContractsWorkspace")}
              </Link>
            </article>
          ) : null}

          {activeTab === "compensation" ? (
            <HrEmployeeCompensationSection
              compensation={data.compensation}
              employeeId={data.employee.id}
              employeeName={data.employee.fullName}
              financialSummary={data.financialSummary}
            />
          ) : null}

          {activeTab === "attendance-leave" ? (
            <div className="space-y-4">
              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
                <h2 className="font-medium">{t("hr.employees.profile.currentBalances")}</h2>
                <div className="mt-4 space-y-2">
                  {data.leaveRuntime.balances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("hr.employees.profile.noLeaveBalances")}</p>
                  ) : (
                    data.leaveRuntime.balances.map((item) => (
                      <InfoRow
                        key={`${item.leaveType}-balance`}
                        label={item.leaveType}
                        value={t("hr.employees.profile.balanceSummary", {
                          available: item.available,
                          carried: item.carriedForward,
                          consumed: item.consumed,
                          pending: item.pending,
                        })}
                      />
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
                <h2 className="font-medium">{t("hr.employees.profile.lateEarly")}</h2>
                <div className="mt-4 space-y-2">
                  <InfoRow label={t("hr.common.policy")} value={data.lateEarlyRuntime.policyName} />
                  <InfoRow label={t("hr.employees.profile.monthlyLateMin")} value={String(data.lateEarlyRuntime.monthlyLateMinutes)} />
                  <InfoRow label={t("hr.employees.profile.monthlyEarlyMin")} value={String(data.lateEarlyRuntime.monthlyEarlyMinutes)} />
                  <InfoRow label={t("hr.employees.profile.pendingViolations")} value={String(data.lateEarlyRuntime.pendingViolations)} />
                </div>
                <ul className="mt-4 space-y-2">
                  {data.lateEarlyRuntime.violations.length === 0 ? (
                    <li className="text-sm text-muted-foreground">{t("hr.employees.profile.noViolations")}</li>
                  ) : (
                    data.lateEarlyRuntime.violations.slice(0, 10).map((item) => (
                      <li className="border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                        {t("hr.employees.profile.violationLine", {
                          date: item.workDate,
                          early: item.earlyLeaveMinutes,
                          kind: item.violationKind,
                          late: item.lateMinutes,
                          status: item.status,
                        })}
                      </li>
                    ))
                  )}
                </ul>
              </article>

              <Link className={secondaryButtonLinkClassName} href="/erp/hr/late-early">
                {t("hr.employees.profile.openLateEarly")}
              </Link>
              <Link className={secondaryButtonLinkClassName} href={`/erp/hr/attendance-leave?employeeId=${data.employee.id}`}>
                {t("hr.employees.profile.openAttendanceLeave")}
              </Link>
            </div>
          ) : null}

          {activeTab === "skills" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createEmployeeSkillRecordAction} className="grid gap-3 md:grid-cols-3">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="skillId" required>
                  <option value="">{t("hr.employees.profile.selectSkill")}</option>
                  {data.skillOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <DatePicker name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} />
                <Button type="submit" variant="primary">{t("hr.employees.profile.addSkill")}</Button>
              </form>
              <ul className="space-y-2">
                {data.skillRecords.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("hr.employees.profile.noSkills")}</li>
                ) : (
                  data.skillRecords.map((item) => (
                    <li className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                      <span>
                        {t("hr.employees.profile.skillLine", {
                          date: item.effectiveFrom,
                          name: item.skillName,
                          status: item.status,
                        })}
                      </span>
                      <form action={archiveEmployeeSkillRecordAction.bind(null, item.id)}>
                        <Button size="sm" type="submit" variant="secondary">{t("hr.common.archive")}</Button>
                      </form>
                    </li>
                  ))
                )}
              </ul>
            </article>
          ) : null}

          {activeTab === "documents" ? (
            <div className="space-y-4">
              <HrEmployeeDocumentChecklist
                canManageWaivers={data.canManageDocumentWaivers}
                compliance={data.documentCompliance}
                employeeId={data.employee.id}
                onUploadKind={setSelectedUploadType}
                selectedUploadType={selectedUploadType}
              />
              <form action={createHrEmployeeDocumentAction} className="grid gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5" encType="multipart/form-data">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select
                  className={nativeSelectClassName}
                  name="documentType"
                  onChange={(event) => setSelectedUploadType(event.target.value)}
                  required
                  value={selectedUploadType}
                >
                  <option value="">{t("hr.employees.profile.documentType")}</option>
                  {HR_DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{translateHrDocumentType(t, type.value)}</option>
                  ))}
                </select>
                <Input name="fileName" placeholder={t("hr.employees.profile.documentTitlePlaceholder")} />
                <input accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" name="file" type="file" />
                <DatePicker name="expiryDate" placeholder={t("hr.common.endDate")} />
                <Button type="submit" variant="primary">{t("hr.employees.profile.upload")}</Button>
              </form>
              <AttachmentPanel
                attachments={data.documents.map((doc) => ({
                  fileName: doc.fileName,
                  id: doc.id,
                  status: doc.status,
                  uploadedAt: doc.expiresOn ? t("hr.employees.profile.documentExpires", { date: doc.expiresOn }) : undefined,
                }))}
                emptyMessage={t("hr.employees.profile.noDocuments")}
                title={t("hr.employees.profile.employeeDocuments")}
              />
            </div>
          ) : null}

          {activeTab === "custody" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createHrCustodyAssignmentAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="assetType" required>
                  <option value="">{t("hr.employees.profile.assetType")}</option>
                  {HR_CUSTODY_ASSET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{translateHrAssetType(t, type.value)}</option>
                  ))}
                </select>
                <Input name="assetLabel" placeholder={t("hr.employees.profile.assetLabel")} required />
                <DatePicker name="effectiveDate" placeholder={t("hr.employees.profile.assignmentDate")} required />
                <Button type="submit" variant="primary">{t("hr.employees.profile.assign")}</Button>
              </form>
              <ul className="space-y-2">
                {data.custodyItems.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("hr.employees.profile.noCustody")}</li>
                ) : (
                  data.custodyItems.map((item) => (
                    <li className="border-b border-[hsl(var(--border))] py-2 text-sm last:border-b-0" key={item.id}>
                      {t("hr.employees.profile.custodyLine", {
                        date: item.effectiveDate,
                        label: item.assetLabel,
                        status: translateHrStatus(t, item.status),
                        type: translateHrAssetType(t, item.assetType),
                      })}
                    </li>
                  ))
                )}
              </ul>
            </article>
          ) : null}

          {activeTab === "payroll-readiness" ? (
            <article className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <h2 className="font-medium">{t("hr.employees.profile.payrollBlockers")}</h2>
              <div className="mt-4 space-y-2">
                {data.payrollReadiness.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("hr.employees.profile.noPayrollBlockers")}</p>
                ) : (
                  data.payrollReadiness.map((item) => (
                    <p className="text-sm" key={`${item.label}-${item.status}`}>
                      {item.label} — {item.status}
                    </p>
                  ))
                )}
              </div>
              <Link className={cn("mt-4 inline-flex", secondaryButtonLinkClassName)} href="/erp/hr/payroll-readiness">
                {t("hr.employees.profile.openPayrollReadiness")}
              </Link>
            </article>
          ) : null}

          {activeTab === "requests" ? (
            <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
              <form action={createHrRequestAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input name="employeeId" type="hidden" value={data.employee.id} />
                <select className={nativeSelectClassName} name="requestType" required>
                  <option value="">{t("hr.employees.profile.requestType")}</option>
                  {HR_REQUEST_TYPES.map((type) => (
                    <option key={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`} value={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`}>
                      {translateHrRequestTypeLabel(t, type)}
                    </option>
                  ))}
                </select>
                <DatePicker name="effectiveDate" placeholder={t("hr.common.effectiveDate")} required />
                <Input name="notes" placeholder={t("hr.common.notes")} />
                <Button type="submit" variant="primary">{t("hr.employees.profile.createRequest")}</Button>
              </form>
              <ul className="space-y-2">
                {data.pendingActions.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("hr.employees.profile.noPendingRequests")}</li>
                ) : (
                  data.pendingActions.map((item) => (
                    <li className="flex items-center justify-between gap-3 text-sm" key={item.id}>
                      <span>{item.label}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{translateHrStatus(t, item.status)}</span>
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

"use client";

import Link from "next/link";

import { resolveHrPageHelp, translateHrActionType, translateHrAssetType, translateHrDocumentType, translateHrRequestTypeLabel, translateHrStatus } from "@/features/hr/public-api";
import { HR_CUSTODY_ASSET_TYPES, HR_REPORT_CARDS, HR_REQUEST_TYPES } from "@/features/hr/public-api";
import {
  archiveHrEmployeeDocumentAction,
  createHrCustodyAssignmentAction,
  createHrEmployeeDocumentAction,
  createHrRequestAction,
  transitionHrCustodyAction,
  transitionHrRequestAction,
} from "@/features/hr/routes/actions/hr-operational.actions";
import type { HrCustodyRecord, HrDocumentsWorkspaceData, HrRequestRecord } from "@/features/hr/routes/loaders/hr-operational.loader";
import { HR_DOCUMENT_TYPES } from "@/features/hr/public-api";
import type { HrCompanyDocumentComplianceSummary } from "@/features/hr/public-api";
import type { MessageKey } from "@/platform/localization/messages/en";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";
import { HrWorkforceDepartmentFilter, HrWorkforceFilterBar } from "./hr-workforce-filter-bar";

const REPORT_CARD_MESSAGE_KEYS: Record<string, { descriptionKey: MessageKey; labelKey: MessageKey }> = {
  "/erp/hr/assignments": {
    descriptionKey: "hr.reports.card.assignments.description",
    labelKey: "hr.reports.card.assignments",
  },
  "/erp/hr/contracts": {
    descriptionKey: "hr.reports.card.contractExpiry.description",
    labelKey: "hr.reports.card.contractExpiry",
  },
  "/erp/hr/custody": {
    descriptionKey: "hr.reports.card.custody.description",
    labelKey: "hr.reports.card.custody",
  },
  "/erp/hr/documents": {
    descriptionKey: "hr.reports.card.documentExpiry.description",
    labelKey: "hr.reports.card.documentExpiry",
  },
  "/erp/hr/employees": {
    descriptionKey: "hr.reports.card.employeeDirectory.description",
    labelKey: "hr.reports.card.employeeDirectory",
  },
  "/erp/hr/attendance-leave": {
    descriptionKey: "hr.reports.card.leaveBalance.description",
    labelKey: "hr.reports.card.leaveBalance",
  },
  "/erp/hr/organization": {
    descriptionKey: "hr.reports.card.organization.description",
    labelKey: "hr.reports.card.organization",
  },
  "/erp/hr/payroll-readiness": {
    descriptionKey: "hr.reports.card.payrollReadiness.description",
    labelKey: "hr.reports.card.payrollReadiness",
  },
  "/erp/hr/positions-jobs/positions": {
    descriptionKey: "hr.reports.card.vacancy.description",
    labelKey: "hr.reports.card.vacancy",
  },
  "/erp/hr/skills-competencies/skills": {
    descriptionKey: "hr.reports.card.skillsMatrix.description",
    labelKey: "hr.reports.card.skillsMatrix",
  },
};

function ActionButton({ label }: Readonly<{ label: string }>) {
  return (
    <Button size="sm" type="submit" variant="secondary">
      {label}
    </Button>
  );
}

const DOCUMENT_TABS = ["register", "compliance"] as const;

export function HrDocumentsWorkspace({
  compliance,
  data,
  defaultEmployeeId,
  highlightUpload,
  query = {},
}: Readonly<{
  compliance: HrCompanyDocumentComplianceSummary;
  data: HrDocumentsWorkspaceData;
  defaultEmployeeId?: string;
  highlightUpload?: boolean;
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const documentTypes = HR_DOCUMENT_TYPES;
  const activeTab = resolveHrSectionTab(query.tab, DOCUMENT_TABS, "register");
  const href = (tab: string, patch: Record<string, string | undefined> = {}) =>
    buildHrSectionHref("/erp/hr/documents", {
      ...query,
      employeeId: defaultEmployeeId,
      tab,
      upload: highlightUpload ? "1" : query.upload,
      ...patch,
    });

  const navItems = [
    { href: href("register"), key: "register", label: t("hr.documentCompliance.tab.register") },
    { href: href("compliance"), key: "compliance", label: t("hr.documentCompliance.tab.compliance") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.documentCompliance.description")}
      help={resolveHrPageHelp("documents")}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.documentCompliance.kpi.incompleteEmployees"),
          href: href("compliance", { complianceStatus: "incomplete" }),
          label: t("hr.documentCompliance.kpi.incompleteEmployees"),
          value: compliance.incompleteEmployees,
        },
        {
          helper: `${compliance.complianceRate}%`,
          href: href("compliance"),
          label: t("hr.documentCompliance.kpi.complianceRate"),
          value: `${compliance.complianceRate}%`,
        },
        {
          helper: t("hr.documentCompliance.kpi.expiredDocuments"),
          href: href("compliance", { complianceStatus: "incomplete" }),
          label: t("hr.documentCompliance.kpi.expiredDocuments"),
          value: compliance.expiredRequiredDocuments,
        },
      ]}
      title={t("hr.documents.title")}
      workspaceKey="documents"
    >
      {activeTab === "register" ? (
        <div className="space-y-6">
          {defaultEmployeeId ? (
            <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              {t("hr.common.filteredToEmployee")}{" "}
              <a className="underline" href="/erp/hr/documents">
                {t("hr.common.showAll")}
              </a>
            </p>
          ) : null}
          {data.alerts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-medium">{t("hr.documents.expiryAlerts")}</h2>
              {data.alerts.map((alert) => (
                <p
                  className={`rounded-md border px-3 py-2 text-sm ${alert.severity === "error" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10"}`}
                  key={alert.id}
                >
                  {t(alert.labelKey, alert.labelParams)}
                </p>
              ))}
            </section>
          ) : (
            <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{t("hr.documents.noExpiring")}</p>
          )}

          <form
            action={createHrEmployeeDocumentAction}
            className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5 ${highlightUpload ? "border-accent ring-1 ring-accent" : ""}`}
          >
            <EntityLookup value={defaultEmployeeId} label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="documentType" required>
              <option value="">{t("hr.documents.documentType")}</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {translateHrDocumentType(t, type.value)}
                </option>
              ))}
            </select>
            <Input name="fileName" placeholder={t("hr.documents.documentTitlePlaceholder")} />
            <input accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" name="file" type="file" />
            <DatePicker name="expiryDate" placeholder={t("hr.documents.expiryDate")} />
            <Button type="submit" variant="primary">
              {t("hr.documents.register")}
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.document"), key: "file", render: (record) => record.fileName },
              { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.common.type"), key: "type", render: (record) => translateHrDocumentType(t, record.documentType) },
              { header: t("hr.documents.column.expiry"), key: "expiry", render: (record) => record.expiresOn ?? "—" },
              { header: t("hr.common.status"), key: "status", render: (record) => translateHrStatus(t, record.status) },
              {
                header: t("hr.common.preview"),
                key: "preview",
                render: (record) => (record.previewReady ? t("hr.documents.previewReady") : t("hr.common.metadataOnly")),
              },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <form action={archiveHrEmployeeDocumentAction.bind(null, record.id)}>
                    <ActionButton label={t("hr.common.archive")} />
                  </form>
                ),
              },
            ]}
            emptyMessage={t("hr.documents.empty")}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 100 }}
            records={data.records}
          />
        </div>
      ) : null}

      {activeTab === "compliance" ? (
        <div className="space-y-4">
          <HrWorkforceFilterBar
            basePath="/erp/hr/documents"
            query={query}
            resetHref={buildHrSectionHref("/erp/hr/documents", { tab: "compliance" })}
          >
            <HrWorkforceDepartmentFilter defaultValue={query.departmentId} />
            <label className="space-y-1 text-sm">
              <span>{t("hr.documentCompliance.filter.status")}</span>
              <select className={nativeSelectClassName} defaultValue={query.complianceStatus ?? "all"} name="complianceStatus">
                <option value="all">{t("hr.documentCompliance.filter.status.all")}</option>
                <option value="complete">{t("hr.documentCompliance.filter.status.complete")}</option>
                <option value="incomplete">{t("hr.documentCompliance.filter.status.incomplete")}</option>
              </select>
            </label>
          </HrWorkforceFilterBar>

          <EnterpriseDataTable
            columns={[
              { header: t("hr.documentCompliance.column.employee"), key: "employee", render: (record) => record.employeeLabel },
              { header: t("hr.documentCompliance.column.contractType"), key: "contractType", render: (record) => record.contractTypeLabel },
              {
                header: t("hr.documentCompliance.column.complete"),
                key: "complete",
                render: (record) => `${record.completeCount}/${record.totalCount}`,
              },
              { header: t("hr.documentCompliance.column.missing"), key: "missing", render: (record) => record.missingCount },
              { header: t("hr.documentCompliance.column.expired"), key: "expired", render: (record) => record.expiredCount },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <Link className={secondaryButtonLinkClassName} href={`/erp/hr/employees/${record.employeeId}?tab=documents`}>
                    {t("hr.documentCompliance.action.openProfile")}
                  </Link>
                ),
              },
            ]}
            emptyMessage={t("hr.documentCompliance.empty")}
            getRowId={(record) => record.employeeId}
            pagination={{ mode: "page", page: 1, pageSize: compliance.rows.length || 1, totalRows: compliance.rows.length }}
            records={compliance.rows}
          />
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

export function HrRequestsWorkspace({
  records,
  defaultEmployeeId,
  highlightCreate,
}: Readonly<{ records: readonly HrRequestRecord[]; defaultEmployeeId?: string; highlightCreate?: boolean }>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.requests.description")} help={resolveHrPageHelp("requests")} title={t("hr.requests.title")} />
      <div className="space-y-6">
        {defaultEmployeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {t("hr.common.filteredToEmployee")}{" "}
            <a className="underline" href="/erp/hr/requests">
              {t("hr.common.showAll")}
            </a>
          </p>
        ) : null}
        <form
          action={createHrRequestAction}
          className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}
        >
          <EntityLookup value={defaultEmployeeId} label={t("hr.common.requester")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="requestType" required>
            <option value="">{t("hr.requests.requestType")}</option>
            {HR_REQUEST_TYPES.map((type) => (
              <option key={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`} value={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`}>
                {translateHrRequestTypeLabel(t, type)}
              </option>
            ))}
          </select>
          <DatePicker name="effectiveDate" placeholder={t("hr.common.effectiveDate")} required />
          <Input className="md:col-span-2" name="notes" placeholder={t("hr.common.notes")} />
          <Button type="submit" variant="primary">
            {t("hr.requests.create")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.requests.column.request"), key: "request", render: (record) => record.requestLabel },
            { header: t("hr.requests.column.number"), key: "number", render: (record) => record.documentNumber },
            { header: t("hr.common.requester"), key: "employee", render: (record) => record.employeeLabel },
            { header: t("hr.common.type"), key: "type", render: (record) => translateHrActionType(t, record.actionType) },
            { header: t("hr.common.status"), key: "status", render: (record) => translateHrStatus(t, record.status) },
            { header: t("hr.requests.column.created"), key: "created", render: (record) => record.createdAt.slice(0, 10) },
            {
              header: t("hr.common.actions"),
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  <form action={transitionHrRequestAction.bind(null, record.id, "submit")}>
                    <ActionButton label={t("hr.common.submit")} />
                  </form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "approve")}>
                    <ActionButton label={t("hr.common.approve")} />
                  </form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "reject")}>
                    <ActionButton label={t("hr.common.reject")} />
                  </form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "return")}>
                    <ActionButton label={t("hr.common.return")} />
                  </form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "cancel")}>
                    <ActionButton label={t("hr.common.cancel")} />
                  </form>
                </div>
              ),
            },
          ]}
          emptyMessage={t("hr.requests.empty")}
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 100 }}
          records={records}
        />
      </div>
    </PageContainer>
  );
}

export function HrCustodyWorkspace({
  records,
  defaultEmployeeId,
  highlightCreate,
}: Readonly<{ records: readonly HrCustodyRecord[]; defaultEmployeeId?: string; highlightCreate?: boolean }>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.custody.description")} help={resolveHrPageHelp("custody")} title={t("hr.custody.title")} />
      <div className="space-y-6">
        {defaultEmployeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {t("hr.common.filteredToEmployee")}{" "}
            <a className="underline" href="/erp/hr/custody">
              {t("hr.common.showAll")}
            </a>
          </p>
        ) : null}
        <form
          action={createHrCustodyAssignmentAction}
          className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-6 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}
        >
          <EntityLookup value={defaultEmployeeId} label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="assetType" required>
            <option value="">{t("hr.custody.assetType")}</option>
            {HR_CUSTODY_ASSET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {translateHrAssetType(t, type.value)}
              </option>
            ))}
          </select>
          <Input name="assetLabel" placeholder={t("hr.custody.assetLabel")} required />
          <DatePicker name="effectiveDate" placeholder={t("hr.custody.assignmentDate")} required />
          <Input name="notes" placeholder={t("hr.common.notes")} />
          <Button type="submit" variant="primary">
            {t("hr.custody.assign")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.custody.column.asset"), key: "asset", render: (record) => record.assetLabel },
            { header: t("hr.common.type"), key: "type", render: (record) => translateHrAssetType(t, record.assetType) },
            { header: t("hr.common.employee"), key: "employee", render: (record) => record.employeeLabel },
            { header: t("hr.custody.column.assigned"), key: "date", render: (record) => record.effectiveDate },
            { header: t("hr.common.condition"), key: "condition", render: (record) => translateHrStatus(t, record.condition) },
            { header: t("hr.common.status"), key: "status", render: (record) => translateHrStatus(t, record.status) },
            { header: t("hr.common.notes"), key: "notes", render: (record) => record.notes ?? "—" },
            {
              header: t("hr.common.actions"),
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  <form action={transitionHrCustodyAction.bind(null, record.id, "return")}>
                    <ActionButton label={t("hr.common.return")} />
                  </form>
                  <form action={transitionHrCustodyAction.bind(null, record.id, "damaged")}>
                    <input name="reason" type="hidden" value="Damaged in operations" />
                    <ActionButton label={t("hr.common.damaged")} />
                  </form>
                  <form action={transitionHrCustodyAction.bind(null, record.id, "lost")}>
                    <input name="reason" type="hidden" value="Lost in operations" />
                    <ActionButton label={t("hr.common.lost")} />
                  </form>
                </div>
              ),
            },
          ]}
          emptyMessage={t("hr.custody.empty")}
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 100 }}
          records={records}
        />
      </div>
    </PageContainer>
  );
}

export function HrReportsLauncher() {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.reports.launcher.description")} help={resolveHrPageHelp("reports")} title={t("hr.reports.launcher.title")} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HR_REPORT_CARDS.map((card) => {
          const messageKeys = REPORT_CARD_MESSAGE_KEYS[card.href];
          const label = messageKeys ? t(messageKeys.labelKey) : card.label;
          const description = messageKeys ? t(messageKeys.descriptionKey) : card.description;
          return (
            <a className="rounded-lg border bg-[hsl(var(--surface))] p-5 transition hover:border-accent" href={card.href} key={card.href}>
              <h2 className="font-medium">{label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </a>
          );
        })}
      </section>
    </PageContainer>
  );
}

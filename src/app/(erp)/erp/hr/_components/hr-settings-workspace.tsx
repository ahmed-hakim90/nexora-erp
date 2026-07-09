"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  activateLeavePolicyAction,
  archiveLeavePolicyAction,
  archiveLeaveTypeAction,
  createLeavePolicyAction,
  createLeaveTypeAction,
  updateLeavePolicyAction,
  updateLeaveTypeAction,
} from "@/features/hr/routes/actions/hr-leave.actions";
import {
  archivePayrollCalendarAction,
  archivePayrollGroupAction,
  archivePayrollPeriodAction,
  createPayrollCalendarAction,
  createPayrollGroupAction,
  createPayrollPeriodAction,
  updatePayrollCalendarAction,
  updatePayrollGroupAction,
  updatePayrollPeriodAction,
} from "@/features/hr/routes/actions/hr-payroll.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { runHrExpiryNotificationScanAndRedirectAction } from "@/features/hr/routes/actions/hr-operational.actions";
import {
  Button,
  DatePicker,
  EnterpriseDataTable,
  FieldGroup,
  FormGrid,
  Input,
  nativeSelectClassName,
  RecordFormDialog,
  RecordFormSection,
  secondaryButtonLinkClassName,
  useRecordFormModal,
  useTranslations,
} from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";
import {
  HrContractTypesSettingsPanel,
  type HrSettingsContractTypeArticleRecord,
  type HrSettingsContractTypeRecord,
  type HrSettingsContractTypeVersionRecord,
} from "./hr-contract-types-settings";
import { HrDocumentSetsSettingsPanel, type HrSettingsDocumentSetRecord } from "./hr-document-sets-settings";

export type HrSettingsLeaveTypeRecord = {
  code: string;
  id: string;
  impactsPayroll: boolean;
  name: string;
  paid: boolean;
  paidLabel: string;
  requiresApproval: boolean;
  status: string;
  statusRaw: string;
};

export type HrSettingsLeaveTypeOption = {
  id: string;
  name: string;
};

export type HrSettingsLeavePolicyRecord = {
  annualEntitlement: number;
  carryForward: string;
  carryForwardAllowed: boolean;
  entitlementUnit: string;
  id: string;
  leaveType: string;
  leaveTypeId: string;
  rawStatus: string;
  status: string;
};

export type HrSettingsPayrollGroupRecord = {
  code: string;
  id: string;
  name: string;
  payrollCalendarId: string;
  payrollCalendarName: string;
  payrollPolicyVersionId: string;
  status: string;
  statusRaw: string;
};

export type HrSettingsPayrollPeriodRecord = {
  code: string;
  endDate: string;
  id: string;
  name: string;
  paymentDate: string;
  payrollCalendarId: string;
  payrollCalendarName: string;
  startDate: string;
  status: string;
  statusRaw: string;
};

export type HrSettingsPayrollCalendarRecord = {
  code: string;
  effectiveFrom: string;
  frequency: string;
  id: string;
  name: string;
  status: string;
  statusRaw: string;
};

export type HrSettingsPolicyVersionOption = {
  id: string;
  label: string;
};

const SETTINGS_TABS = ["notifications", "leave-types", "leave-policies", "document-sets", "contract-types", "payroll"] as const;
const SETTINGS_BASE = "/erp/hr/settings";

function settingsHref(query: Record<string, string | undefined>, patch: Record<string, string | null | undefined>) {
  const next: Record<string, string | undefined> = { ...query };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") delete next[key];
    else next[key] = value;
  }
  return buildHrSectionHref(SETTINGS_BASE, next);
}

function LeaveTypeFormDialog({
  closeHref,
  mode,
  record,
}: Readonly<{
  closeHref: string;
  mode: "create" | "edit";
  record?: HrSettingsLeaveTypeRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("leaveTypeId", record.id);
        await updateLeaveTypeAction(formData);
      } else {
        await createLeaveTypeAction(formData);
      }
      router.push(closeHref);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(t("hr.settings.confirm.archiveLeaveType"))) return;
    startTransition(async () => {
      await archiveLeaveTypeAction(record.id);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              {t("hr.common.archive")}
            </Button>
          ) : null}
          <Button disabled={isPending} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.common.save")}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      title={mode === "edit" ? t("hr.settings.modal.editLeaveType") : t("hr.settings.modal.createLeaveType")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.code")}>
              <Input defaultValue={record?.code ?? ""} name="code" placeholder={t("hr.settings.modal.leaveTypeCodeExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.name")}>
              <Input defaultValue={record?.name ?? ""} name="name" placeholder={t("hr.settings.modal.leaveTypeNameExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.status")}>
              <select className={nativeSelectClassName} defaultValue={record?.statusRaw ?? "active"} name="status" required>
                <option value="draft">{t("hr.common.status.draft")}</option>
                <option value="active">{t("hr.common.status.active")}</option>
                <option value="inactive">{t("hr.common.status.inactive")}</option>
              </select>
            </FieldGroup>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input defaultChecked={record?.paid ?? true} name="paid" type="checkbox" value="on" />
              {t("hr.common.paid")}
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input defaultChecked={record?.requiresApproval ?? true} name="requiresApproval" type="checkbox" value="on" />
              {t("hr.common.requiresApproval")}
            </label>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input defaultChecked={record?.impactsPayroll ?? true} name="impactsPayroll" type="checkbox" value="on" />
              {t("hr.common.impactsPayroll")}
            </label>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

function LeavePolicyEditDialog({
  closeHref,
  record,
}: Readonly<{
  closeHref: string;
  record: HrSettingsLeavePolicyRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("policyId", record.id);
      await updateLeavePolicyAction(formData);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <Button disabled={isPending} form={formId} type="submit" variant="primary">
          {isPending ? t("hr.common.saving") : t("hr.common.save")}
        </Button>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={record.leaveType}
      title={t("hr.settings.modal.editLeavePolicy")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.settings.annualEntitlement")}>
              <Input defaultValue={String(record.annualEntitlement)} min="0" name="annualEntitlement" required step="0.5" type="number" />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.unit")}>
              <select className={nativeSelectClassName} defaultValue={record.entitlementUnit} name="entitlementUnit">
                <option value="days">{t("hr.settings.days")}</option>
                <option value="hours">{t("hr.settings.hoursUnit")}</option>
              </select>
            </FieldGroup>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input defaultChecked={record.carryForwardAllowed} name="carryForwardAllowed" type="checkbox" value="on" />
              {t("hr.settings.allowCarryForward")}
            </label>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

function PayrollCalendarFormDialog({
  closeHref,
  mode,
  record,
}: Readonly<{
  closeHref: string;
  mode: "create" | "edit";
  record?: HrSettingsPayrollCalendarRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("calendarId", record.id);
        await updatePayrollCalendarAction(formData);
      } else {
        await createPayrollCalendarAction(formData);
      }
      router.push(closeHref);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(t("hr.settings.confirm.archiveCalendar"))) return;
    startTransition(async () => {
      await archivePayrollCalendarAction(record.id);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              {t("hr.common.archive")}
            </Button>
          ) : null}
          <Button disabled={isPending} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.common.save")}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      title={mode === "edit" ? t("hr.settings.modal.editPayrollCalendar") : t("hr.settings.modal.createPayrollCalendar")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.code")}>
              <Input defaultValue={record?.code ?? ""} name="code" placeholder={t("hr.settings.modal.calendarCodeExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.name")}>
              <Input defaultValue={record?.name ?? ""} name="name" placeholder={t("hr.settings.modal.calendarNameExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.frequency")}>
              <select className={nativeSelectClassName} defaultValue={record?.frequency ?? "monthly"} name="frequency" required>
                <option value="monthly">{t("hr.settings.freq.monthly")}</option>
                <option value="semi_monthly">{t("hr.settings.freq.semiMonthly")}</option>
                <option value="biweekly">{t("hr.settings.freq.biweekly")}</option>
                <option value="weekly">{t("hr.settings.freq.weekly")}</option>
                <option value="daily">{t("hr.settings.freq.daily")}</option>
                <option value="custom">{t("hr.settings.freq.custom")}</option>
              </select>
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.effectiveFrom")}>
              <DatePicker defaultValue={record?.effectiveFrom} name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.status")}>
              <select className={nativeSelectClassName} defaultValue={record?.statusRaw ?? "active"} name="status" required>
                <option value="draft">{t("hr.common.status.draft")}</option>
                <option value="active">{t("hr.common.status.active")}</option>
                <option value="inactive">{t("hr.common.status.inactive")}</option>
              </select>
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

function PayrollGroupFormDialog({
  calendars,
  closeHref,
  mode,
  policyVersions,
  record,
}: Readonly<{
  calendars: readonly HrSettingsPayrollCalendarRecord[];
  closeHref: string;
  mode: "create" | "edit";
  policyVersions: readonly HrSettingsPolicyVersionOption[];
  record?: HrSettingsPayrollGroupRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("groupId", record.id);
        await updatePayrollGroupAction(formData);
      } else {
        await createPayrollGroupAction(formData);
      }
      router.push(closeHref);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(t("hr.settings.confirm.archiveGroup"))) return;
    startTransition(async () => {
      await archivePayrollGroupAction(record.id);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              {t("hr.common.archive")}
            </Button>
          ) : null}
          <Button disabled={isPending || calendars.length === 0 || policyVersions.length === 0} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.common.save")}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      subtitle={
        policyVersions.length === 0
          ? t("hr.settings.modal.groupSubtitlePolicy")
          : t("hr.settings.modal.groupSubtitleDefault")
      }
      title={mode === "edit" ? t("hr.settings.modal.editPayrollGroup") : t("hr.settings.modal.createPayrollGroup")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.code")}>
              <Input defaultValue={record?.code ?? ""} name="code" placeholder={t("hr.settings.modal.groupCodeExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.name")}>
              <Input defaultValue={record?.name ?? ""} name="name" placeholder={t("hr.settings.modal.groupNameExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.calendar")}>
              <select className={nativeSelectClassName} defaultValue={record?.payrollCalendarId ?? ""} name="payrollCalendarId" required>
                <option value="">{t("hr.common.selectCalendar")}</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.payrollPolicyVersion")}>
              <select
                className={nativeSelectClassName}
                defaultValue={record?.payrollPolicyVersionId ?? ""}
                name="payrollPolicyVersionId"
                required
              >
                <option value="">{t("hr.common.selectPolicyVersion")}</option>
                {policyVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.label}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.status")}>
              <select className={nativeSelectClassName} defaultValue={record?.statusRaw ?? "active"} name="status" required>
                <option value="draft">{t("hr.common.status.draft")}</option>
                <option value="active">{t("hr.common.status.active")}</option>
                <option value="inactive">{t("hr.common.status.inactive")}</option>
              </select>
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

function PayrollPeriodFormDialog({
  calendars,
  closeHref,
  mode,
  record,
}: Readonly<{
  calendars: readonly HrSettingsPayrollCalendarRecord[];
  closeHref: string;
  mode: "create" | "edit";
  record?: HrSettingsPayrollPeriodRecord;
}>) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { formId, handleOpenChange, isDirty, markDirty, open } = useRecordFormModal({ autoOpen: true, closeHref });

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "edit" && record) {
        formData.set("periodId", record.id);
        await updatePayrollPeriodAction(formData);
      } else {
        await createPayrollPeriodAction(formData);
      }
      router.push(closeHref);
    });
  }

  async function handleArchive() {
    if (!record) return;
    if (!window.confirm(t("hr.settings.confirm.archivePeriod"))) return;
    startTransition(async () => {
      await archivePayrollPeriodAction(record.id);
      router.push(closeHref);
    });
  }

  return (
    <RecordFormDialog
      actions={
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
            <Button disabled={isPending} onClick={() => void handleArchive()} type="button" variant="secondary">
              {t("hr.common.archive")}
            </Button>
          ) : null}
          <Button disabled={isPending || calendars.length === 0} form={formId} type="submit" variant="primary">
            {isPending ? t("hr.common.saving") : t("hr.common.save")}
          </Button>
        </div>
      }
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      title={mode === "edit" ? t("hr.settings.modal.editPayrollPeriod") : t("hr.settings.modal.createPayrollPeriod")}
    >
      <RecordFormSection>
        <form action={handleSubmit} className="space-y-4" id={formId} onInput={markDirty}>
          <FormGrid>
            <FieldGroup isRequired label={t("hr.common.periodCode")}>
              <Input defaultValue={record?.code ?? ""} name="periodCode" placeholder={t("hr.settings.modal.periodCodeExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.periodName")}>
              <Input defaultValue={record?.name ?? ""} name="periodName" placeholder={t("hr.settings.modal.periodNameExample")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.calendar")}>
              <select className={nativeSelectClassName} defaultValue={record?.payrollCalendarId ?? ""} name="payrollCalendarId" required>
                <option value="">{t("hr.common.selectCalendar")}</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.startDate")}>
              <DatePicker defaultValue={record?.startDate} name="startDate" placeholder={t("hr.common.startDate")} required />
            </FieldGroup>
            <FieldGroup isRequired label={t("hr.common.endDate")}>
              <DatePicker defaultValue={record?.endDate} name="endDate" placeholder={t("hr.common.endDate")} required />
            </FieldGroup>
            <FieldGroup label={t("hr.common.paymentDate")}>
              <DatePicker defaultValue={record?.paymentDate} name="paymentDate" placeholder={t("hr.common.paymentDateDefault")} />
            </FieldGroup>
          </FormGrid>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

export function HrSettingsWorkspace({
  activeLeaveTypes,
  articleRecords,
  calendarRecords,
  contractTypeRecords,
  documentSetRecords,
  groupRecords,
  leavePolicyRecords,
  leaveTypeRecords,
  periodRecords,
  policyVersionOptions,
  query = {},
  scanContracts,
  scanDocuments,
  scanProbation,
  scanTotal,
  versionRecords,
}: Readonly<{
  activeLeaveTypes: readonly HrSettingsLeaveTypeOption[];
  articleRecords: readonly HrSettingsContractTypeArticleRecord[];
  calendarRecords: readonly HrSettingsPayrollCalendarRecord[];
  contractTypeRecords: readonly HrSettingsContractTypeRecord[];
  documentSetRecords: readonly HrSettingsDocumentSetRecord[];
  groupRecords: readonly HrSettingsPayrollGroupRecord[];
  leavePolicyRecords: readonly HrSettingsLeavePolicyRecord[];
  leaveTypeRecords: readonly HrSettingsLeaveTypeRecord[];
  periodRecords: readonly HrSettingsPayrollPeriodRecord[];
  policyVersionOptions: readonly HrSettingsPolicyVersionOption[];
  query?: Record<string, string | undefined>;
  scanContracts?: string;
  scanDocuments?: string;
  scanProbation?: string;
  scanTotal: number | null;
  versionRecords: readonly HrSettingsContractTypeVersionRecord[];
}>) {
  const t = useTranslations();
  const activeTab = resolveHrSectionTab(query.tab, SETTINGS_TABS, "leave-types");
  const baseQuery = {
    tab: activeTab,
    scanContracts,
    scanDocuments,
    scanProbation,
    scanTotal: scanTotal != null ? String(scanTotal) : undefined,
  };
  const href = (tab: string) => buildHrSectionHref(SETTINGS_BASE, { ...baseQuery, tab });
  const closeModalHref = settingsHref(query, {
    create: null,
    contractTypeId: null,
    edit: null,
    editCalendar: null,
    editGroup: null,
    editPeriod: null,
    editPolicy: null,
    createCalendar: null,
    createGroup: null,
    createPeriod: null,
    versionArticles: null,
    versionReadOnly: null,
  });

  const createLeaveTypeOpen = query.create === "1" && activeTab === "leave-types";
  const editLeaveType = leaveTypeRecords.find((row) => row.id === query.edit);
  const createContractTypeOpen = query.create === "1" && activeTab === "contract-types";
  const editContractType = contractTypeRecords.find((row) => row.id === query.edit);
  const createDocumentSetOpen = query.create === "1" && activeTab === "document-sets";
  const editDocumentSet = documentSetRecords.find((row) => row.id === query.edit);
  const editVersionArticles = query.versionArticles
    ? { readOnly: query.versionReadOnly === "1", versionId: query.versionArticles }
    : undefined;
  const editPolicy = leavePolicyRecords.find((row) => row.id === query.editPolicy);
  const createCalendarOpen = query.createCalendar === "1" && activeTab === "payroll";
  const editCalendar = calendarRecords.find((row) => row.id === query.editCalendar);
  const createGroupOpen = query.createGroup === "1" && activeTab === "payroll";
  const editGroup = groupRecords.find((row) => row.id === query.editGroup);
  const createPeriodOpen = query.createPeriod === "1" && activeTab === "payroll";
  const editPeriod = periodRecords.find((row) => row.id === query.editPeriod);

  const navItems = [
    { href: href("notifications"), key: "notifications", label: t("hr.settings.tab.notifications") },
    { href: href("leave-types"), key: "leave-types", label: t("hr.settings.tab.leaveTypes") },
    { href: href("leave-policies"), key: "leave-policies", label: t("hr.settings.tab.leavePolicies") },
    { href: href("document-sets"), key: "document-sets", label: t("hr.settings.tab.documentSets") },
    { href: href("contract-types"), key: "contract-types", label: t("hr.settings.tab.contractTypes") },
    { href: href("payroll"), key: "payroll", label: t("hr.settings.tab.payroll") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.settings.description")}
      help={resolveHrPageHelp("settings")}
      navItems={navItems}
      title={t("hr.settings.title")}
      workspaceKey="settings"
    >
      {scanTotal !== null && Number.isFinite(scanTotal) ? (
        <p className="mb-4 rounded-md border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/5 px-3 py-2 text-sm">
          {t("hr.settings.expiryScanBanner", {
            contracts: scanContracts ?? "0",
            documents: scanDocuments ?? "0",
            probation: scanProbation ?? "0",
            total: scanTotal,
          })}
        </p>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("hr.settings.notificationsTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("hr.settings.notificationsDescription")}
              </p>
            </div>
            <form action={runHrExpiryNotificationScanAndRedirectAction}>
              <Button type="submit" variant="secondary">
                {t("hr.settings.runExpiryScan")}
              </Button>
            </form>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {navItems.filter((item) => item.key !== "notifications").map((item) => (
              <Link className={secondaryButtonLinkClassName} href={item.href} key={item.key}>
                {t("hr.common.openLabel", { label: item.label })}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "leave-types" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("hr.settings.leaveTypesSectionTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("hr.settings.leaveTypesSectionDescription")}</p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm"
              href={settingsHref(query, { tab: "leave-types", create: "1", edit: null })}
            >
              {t("hr.settings.createLeaveType")}
            </Link>
          </div>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.code"), key: "code", render: (record) => record.code },
              { header: t("hr.common.name"), key: "name", render: (record) => record.name },
              { header: t("hr.common.paid"), key: "paid", render: (record) => record.paidLabel },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <Link className="text-sm underline" href={settingsHref(query, { tab: "leave-types", edit: record.id, create: null })}>
                    {t("hr.common.edit")}
                  </Link>
                ),
              },
            ]}
            emptyMessage={t("hr.settings.emptyLeaveTypes")}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={leaveTypeRecords}
          />
          {createLeaveTypeOpen ? <LeaveTypeFormDialog closeHref={closeModalHref} mode="create" /> : null}
          {editLeaveType ? <LeaveTypeFormDialog closeHref={closeModalHref} mode="edit" record={editLeaveType} /> : null}
        </section>
      ) : null}

      {activeTab === "leave-policies" ? (
        <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <div>
            <h2 className="text-lg font-semibold">{t("hr.settings.leavePoliciesTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("hr.settings.leavePoliciesDescription")}
            </p>
          </div>

          <form action={createLeavePolicyAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5">
            <select className={nativeSelectClassName} name="leaveTypeId" required>
              <option value="">{t("hr.settings.leaveTypeSelect")}</option>
              {activeLeaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <Input defaultValue="21" min="0" name="annualEntitlement" placeholder={t("hr.settings.annualEntitlement")} required step="0.5" type="number" />
            <select className={nativeSelectClassName} defaultValue="days" name="entitlementUnit">
              <option value="days">{t("hr.settings.days")}</option>
              <option value="hours">{t("hr.settings.hoursUnit")}</option>
            </select>
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input name="carryForwardAllowed" type="checkbox" value="on" />
              {t("hr.settings.allowCarryForward")}
            </label>
            <Button disabled={activeLeaveTypes.length === 0} type="submit" variant="primary">
              {t("hr.settings.createPolicy")}
            </Button>
          </form>
          {activeLeaveTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("hr.settings.createLeaveTypeFirst")}{" "}
              <Link className="underline" href={href("leave-types")}>
                {t("hr.settings.openLeaveTypes")}
              </Link>
            </p>
          ) : null}

          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.leaveType"), key: "leaveType", render: (record) => record.leaveType },
              { header: t("hr.common.entitlement"), key: "entitlement", render: (record) => `${record.annualEntitlement} ${record.entitlementUnit}` },
              { header: t("hr.common.carryForward"), key: "carryForward", render: (record) => record.carryForward },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <div className="flex flex-wrap gap-1">
                    {record.rawStatus !== "archived" ? (
                      <Link
                        className="inline-flex h-8 items-center px-2 text-sm underline"
                        href={settingsHref(query, { tab: "leave-policies", editPolicy: record.id })}
                      >
                        {t("hr.common.edit")}
                      </Link>
                    ) : null}
                    {["draft", "inactive"].includes(record.rawStatus) ? (
                      <form action={activateLeavePolicyAction.bind(null, record.id)}>
                        <Button size="sm" type="submit" variant="primary">
                          {t("hr.common.activate")}
                        </Button>
                      </form>
                    ) : null}
                    {record.rawStatus !== "archived" ? (
                      <form action={archiveLeavePolicyAction.bind(null, record.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.archive")}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyMessage={t("hr.settings.emptyLeavePolicies")}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={leavePolicyRecords}
          />
          {editPolicy ? <LeavePolicyEditDialog closeHref={closeModalHref} record={editPolicy} /> : null}
        </section>
      ) : null}

      {activeTab === "document-sets" ? (
        <HrDocumentSetsSettingsPanel
          closeHref={closeModalHref}
          createOpen={createDocumentSetOpen}
          editRecord={editDocumentSet}
          records={documentSetRecords}
          settingsHref={(patch) => settingsHref(query, patch)}
        />
      ) : null}

      {activeTab === "contract-types" ? (
        <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
          <HrContractTypesSettingsPanel
            articleRecords={articleRecords}
            closeModalHref={closeModalHref}
            contractTypeRecords={contractTypeRecords}
            createContractTypeOpen={createContractTypeOpen}
            editContractType={editContractType}
            editVersionArticles={editVersionArticles}
            query={query}
            settingsHref={(patch) => settingsHref(query, patch)}
            versionRecords={versionRecords}
          />
        </section>
      ) : null}

      {activeTab === "payroll" ? (
        <section className="space-y-6 rounded-lg border bg-[hsl(var(--surface))] p-5">
          <div>
            <h2 className="text-lg font-semibold">{t("hr.settings.payrollSetupTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("hr.settings.payrollSetupDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className={secondaryButtonLinkClassName} href={settingsHref(query, { tab: "payroll", createCalendar: "1" })}>
              {t("hr.settings.createCalendar")}
            </Link>
            <Link className={secondaryButtonLinkClassName} href={settingsHref(query, { tab: "payroll", createGroup: "1" })}>
              {t("hr.settings.createGroup")}
            </Link>
            <Link className={secondaryButtonLinkClassName} href={settingsHref(query, { tab: "payroll", createPeriod: "1" })}>
              {t("hr.settings.createPeriod")}
            </Link>
          </div>

          {policyVersionOptions.length === 0 ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              {t("hr.settings.noPayrollPolicyVersion")}
            </p>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.code"), key: "code", render: (record) => record.code },
                { header: t("hr.common.name"), key: "name", render: (record) => record.name },
                { header: t("hr.common.frequency"), key: "frequency", render: (record) => record.frequency },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) => (
                    <Link className="text-sm underline" href={settingsHref(query, { tab: "payroll", editCalendar: record.id })}>
                      {t("hr.common.edit")}
                    </Link>
                  ),
                },
              ]}
              emptyMessage={t("hr.settings.emptyCalendars")}
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 20 }}
              records={calendarRecords}
            />
            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.code"), key: "code", render: (record) => record.code },
                { header: t("hr.common.name"), key: "name", render: (record) => record.name },
                { header: t("hr.common.calendar"), key: "calendar", render: (record) => record.payrollCalendarName },
                { header: t("hr.common.status"), key: "status", render: (record) => record.status },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (record) => (
                    <Link className="text-sm underline" href={settingsHref(query, { tab: "payroll", editGroup: record.id })}>
                      {t("hr.common.edit")}
                    </Link>
                  ),
                },
              ]}
              emptyMessage={t("hr.settings.emptyGroups")}
              getRowId={(record) => record.id}
              pagination={{ mode: "cursor", pageSize: 20 }}
              records={groupRecords}
            />
          </div>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.period"), key: "name", render: (record) => record.name },
              { header: t("hr.common.code"), key: "code", render: (record) => record.code },
              { header: t("hr.common.calendar"), key: "calendar", render: (record) => record.payrollCalendarName },
              { header: t("hr.common.from"), key: "from", render: (record) => record.startDate },
              { header: t("hr.common.to"), key: "to", render: (record) => record.endDate },
              { header: t("hr.common.status"), key: "status", render: (record) => record.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (record) => (
                  <Link className="text-sm underline" href={settingsHref(query, { tab: "payroll", editPeriod: record.id })}>
                    {t("hr.common.edit")}
                  </Link>
                ),
              },
            ]}
            emptyMessage={t("hr.settings.emptyPeriods")}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={periodRecords}
          />

          {createCalendarOpen ? <PayrollCalendarFormDialog closeHref={closeModalHref} mode="create" /> : null}
          {editCalendar ? <PayrollCalendarFormDialog closeHref={closeModalHref} mode="edit" record={editCalendar} /> : null}
          {createGroupOpen ? (
            <PayrollGroupFormDialog
              calendars={calendarRecords}
              closeHref={closeModalHref}
              mode="create"
              policyVersions={policyVersionOptions}
            />
          ) : null}
          {editGroup ? (
            <PayrollGroupFormDialog
              calendars={calendarRecords}
              closeHref={closeModalHref}
              mode="edit"
              policyVersions={policyVersionOptions}
              record={editGroup}
            />
          ) : null}
          {createPeriodOpen ? (
            <PayrollPeriodFormDialog calendars={calendarRecords} closeHref={closeModalHref} mode="create" />
          ) : null}
          {editPeriod ? (
            <PayrollPeriodFormDialog calendars={calendarRecords} closeHref={closeModalHref} mode="edit" record={editPeriod} />
          ) : null}
        </section>
      ) : null}
    </HrSectionWorkspace>
  );
}

"use client";

import { assignEmployeeShiftAction, createShiftDefinitionAction } from "@/features/hr/routes/actions/hr-shift.actions";
import { HR_SHIFT_KINDS, resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePickerField, EnterpriseDataTable, EntityLookup, nativeSelectClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrShiftDefinitionRecord = {
  code: string;
  createdAt: string;
  id: string;
  kind: string;
  name: string;
  status: string;
};

export type HrShiftScheduleRecord = {
  effectiveFrom: string;
  employee: string;
  id: string;
  status: string;
};

const SHIFT_TABS = ["definitions", "schedules"] as const;
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function HrShiftsWorkspace({
  query = {},
  scheduleRecords,
  shiftRecords,
}: Readonly<{
  query?: Record<string, string | undefined>;
  scheduleRecords: readonly HrShiftScheduleRecord[];
  shiftRecords: readonly HrShiftDefinitionRecord[];
}>) {
  const t = useTranslations();
  const activeTab = resolveHrSectionTab(query.tab, SHIFT_TABS, "definitions");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/shifts", { tab });

  const navItems = [
    { href: href("definitions"), key: "definitions", label: t("hr.shifts.tab.definitions") },
    { href: href("schedules"), key: "schedules", label: t("hr.shifts.tab.schedules") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.shifts.description")}
      help={resolveHrPageHelp("shifts")}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.shifts.kpi.definitions.helper"),
          href: href("definitions"),
          label: t("hr.shifts.kpi.definitions"),
          value: shiftRecords.length,
        },
        {
          helper: t("hr.shifts.kpi.schedules.helper"),
          href: href("schedules"),
          label: t("hr.shifts.kpi.schedules"),
          value: scheduleRecords.length,
        },
      ]}
      title={t("hr.shifts.title")}
      workspaceKey="shifts"
    >
      {activeTab === "definitions" ? (
        <div className="space-y-6">
          <form action={createShiftDefinitionAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.common.code")}</span>
              <input className={nativeSelectClassName} name="code" placeholder={t("hr.shifts.form.codePlaceholder")} required />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.common.name")}</span>
              <input className={nativeSelectClassName} name="name" placeholder={t("hr.shifts.form.namePlaceholder")} required />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.common.kind")}</span>
              <select className={nativeSelectClassName} defaultValue="morning" name="shiftKind">
                {HR_SHIFT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.shifts.form.start")}</span>
              <input className={nativeSelectClassName} defaultValue="09:00" name="startTime" required type="time" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.shifts.form.end")}</span>
              <input className={nativeSelectClassName} defaultValue="17:00" name="endTime" required type="time" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="crossesMidnight" type="checkbox" />
              {t("hr.shifts.form.crossesMidnight")}
            </label>
            <Button className="xl:col-span-6" type="submit" variant="primary">
              {t("hr.shifts.form.createShift")}
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.code"), key: "code", render: (r) => r.code },
              { header: t("hr.common.name"), key: "name", render: (r) => r.name },
              { header: t("hr.common.kind"), key: "kind", render: (r) => r.kind },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
              { header: t("hr.shifts.column.created"), key: "created", render: (r) => r.createdAt },
            ]}
            emptyMessage={t("hr.shifts.empty.definitions")}
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={shiftRecords}
          />
        </div>
      ) : null}

      {activeTab === "schedules" ? (
        <div className="space-y-6">
          <form action={assignEmployeeShiftAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.shifts.form.shift")}</span>
              <select className={nativeSelectClassName} name="shiftId" required>
                <option value="">{t("hr.shifts.form.selectShift")}</option>
                {shiftRecords.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.code})
                  </option>
                ))}
              </select>
            </label>
            <DatePickerField label={t("hr.common.effectiveFrom")} name="effectiveFrom" required />
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.shifts.form.dayOfWeek")}</span>
              <select className={nativeSelectClassName} defaultValue="1" name="dayOfWeek">
                {DAY_KEYS.map((day, index) => (
                  <option key={day} value={String(index)}>
                    {t(`hr.shifts.day.${day}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t("hr.shifts.form.weekIndex")}</span>
              <input className={nativeSelectClassName} defaultValue="0" name="weekIndex" type="number" />
            </label>
            <Button className="xl:col-span-6" type="submit" variant="secondary">
              {t("hr.shifts.form.assignSchedule")}
            </Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
              { header: t("hr.common.effectiveFrom"), key: "effectiveFrom", render: (r) => r.effectiveFrom },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
            ]}
            emptyMessage={t("hr.shifts.empty.schedules")}
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={scheduleRecords}
          />
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

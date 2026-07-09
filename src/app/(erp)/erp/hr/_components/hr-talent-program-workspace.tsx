"use client";

import {
  addTalentProgramItemAction,
  completeTalentProgramItemAction,
  createTalentProgramAction,
} from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { Button, DatePicker, EnterpriseDataTable, Input, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrTalentProgramTableRecord = {
  code: string;
  employeeId?: string;
  id: string;
  period?: string;
  status: string;
  title: string;
};

export type HrTalentProgramItemTableRecord = {
  due?: string;
  id: string;
  programId?: string;
  rawStatus: string;
  status: string;
  title: string;
};

const TALENT_TABS = ["programs", "items"] as const;

export function HrTalentProgramWorkspace({
  defaultProgramId,
  itemRecords,
  programRecords,
  programType,
  query = {},
}: Readonly<{
  defaultProgramId?: string;
  itemRecords: readonly HrTalentProgramItemTableRecord[];
  programRecords: readonly HrTalentProgramTableRecord[];
  programType: "onboarding" | "training";
  query?: Record<string, string | undefined>;
}>) {
  const t = useTranslations();
  const meta =
    programType === "onboarding"
      ? {
          basePath: "/erp/hr/onboarding",
          description: t("hr.onboarding.description"),
          title: t("hr.onboarding.title"),
          workspaceKey: "onboarding" as const,
        }
      : {
          basePath: "/erp/hr/training",
          description: t("hr.training.description"),
          title: t("hr.training.title"),
          workspaceKey: "training" as const,
        };
  const pendingItems = itemRecords.filter((item) => item.rawStatus === "pending");
  const activeTab = resolveHrSectionTab(query.tab, TALENT_TABS, "programs");
  const href = (tab: string) => buildHrSectionHref(meta.basePath, { tab });

  const navItems =
    programType === "onboarding"
      ? ([
          { href: href("programs"), key: "programs", label: t("hr.talent.tab.programs") },
          { href: href("items"), key: "items", label: t("hr.talent.tab.items") },
        ] as const)
      : ([{ href: href("programs"), key: "programs", label: t("hr.talent.tab.programs") }] as const);

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={meta.description}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.talent.kpi.programs.helper"),
          href: href("programs"),
          label: t("hr.talent.kpi.programs"),
          value: programRecords.length,
        },
        ...(programType === "onboarding"
          ? [
              {
                helper: t("hr.talent.kpi.items.helper"),
                href: href("items"),
                label: t("hr.talent.kpi.items"),
                value: itemRecords.length,
              },
            ]
          : []),
      ]}
      title={meta.title}
      workspaceKey={meta.workspaceKey}
    >
      {activeTab === "programs" ? (
        <div className="space-y-6">
          {programType === "onboarding" ? (
            <form action={createTalentProgramAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-2 xl:grid-cols-4">
              <input name="programType" type="hidden" value={programType} />
              <Input name="code" placeholder={t("hr.talent.form.programCode")} required />
              <Input name="title" placeholder={t("hr.talent.form.programTitle")} required />
              <Input name="employeeId" placeholder={t("hr.talent.form.employeeIdOptional")} />
              <DatePicker name="startsOn" placeholder={t("hr.common.startDate")} />
              <DatePicker name="endsOn" placeholder={t("hr.common.endDate")} />
              <Button type="submit" variant="primary">
                {t("hr.talent.form.createProgram")}
              </Button>
            </form>
          ) : (
            <form action={createTalentProgramAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3">
              <input name="programType" type="hidden" value={programType} />
              <Input name="code" placeholder={t("hr.common.code")} required />
              <Input name="title" placeholder={t("hr.common.name")} required />
              <Button type="submit" variant="primary">
                {t("hr.talent.form.create")}
              </Button>
            </form>
          )}

          <EnterpriseDataTable
            columns={
              programType === "onboarding"
                ? [
                    { header: t("hr.common.code"), key: "code", render: (r) => r.code },
                    { header: t("hr.common.name"), key: "title", render: (r) => r.title },
                    { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                  ]
                : [
                    { header: t("hr.talent.column.program"), key: "title", render: (r) => r.title },
                    { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                  ]
            }
            emptyMessage={t("hr.talent.empty.programs")}
            getRowId={(r) => r.id}
            pagination={{ mode: "page", page: 1, pageSize: programRecords.length || 1, totalRows: programRecords.length }}
            records={programRecords}
          />
        </div>
      ) : null}

      {activeTab === "items" && programType === "onboarding" ? (
        <div className="space-y-6">
          {defaultProgramId ? (
            <form action={addTalentProgramItemAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-2 xl:grid-cols-4">
              <Input defaultValue={defaultProgramId} name="programId" placeholder={t("hr.common.programId")} required />
              <Input name="itemKey" placeholder={t("hr.common.itemKey")} required />
              <Input name="title" placeholder={t("hr.talent.form.taskTitle")} required />
              <DatePicker name="dueDate" placeholder={t("hr.common.dueDate")} />
              <Button type="submit" variant="primary">
                {t("hr.talent.form.addItem")}
              </Button>
            </form>
          ) : null}

          <EnterpriseDataTable
            columns={[
              { header: t("hr.talent.column.item"), key: "title", render: (r) => r.title },
              { header: t("hr.talent.column.due"), key: "due", render: (r) => r.due ?? "—" },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
            ]}
            emptyMessage={t("hr.talent.empty.items")}
            getRowId={(r) => r.id}
            pagination={{ mode: "page", page: 1, pageSize: itemRecords.length || 1, totalRows: itemRecords.length }}
            records={itemRecords}
          />

          <div className="flex flex-wrap gap-2">
            {pendingItems.map((item) => (
              <form action={completeTalentProgramItemAction.bind(null, item.id)} key={item.id}>
                <Button size="sm" type="submit" variant="primary">
                  {t("hr.talent.form.complete", { title: item.title })}
                </Button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

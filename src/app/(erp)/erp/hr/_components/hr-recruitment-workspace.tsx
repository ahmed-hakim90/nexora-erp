"use client";

import Link from "next/link";

import { createHiringRequestAction, createVacancyAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { Button, DatePicker, EnterpriseDataTable, Input, nativeSelectClassName, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrVacancyTableRecord = {
  id: string;
  positionId: string;
  reason: string;
  status: string;
};

export type HrHiringRequestTableRecord = {
  date: string;
  id: string;
  justification: string;
  positionId: string;
  status: string;
};

const RECRUITMENT_TABS = ["vacancies", "hiring"] as const;

export function HrRecruitmentWorkspace({
  hiringRecords,
  query = {},
  vacancyRecords,
}: Readonly<{
  hiringRecords: readonly HrHiringRequestTableRecord[];
  query?: Record<string, string | undefined>;
  vacancyRecords: readonly HrVacancyTableRecord[];
}>) {
  const t = useTranslations();
  const optional = (label: string) => `${label} ${t("hr.common.optional")}`;
  const activeTab = resolveHrSectionTab(query.tab, RECRUITMENT_TABS, "vacancies");
  const href = (tab: string) => buildHrSectionHref("/erp/hr/recruitment", { tab });

  const navItems = [
    { href: href("vacancies"), key: "vacancies", label: t("hr.recruitment.tab.vacancies") },
    { href: href("hiring"), key: "hiring", label: t("hr.recruitment.tab.hiring") },
  ] as const;

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.recruitment.description")}
      headerActions={
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/onboarding">
            {t("hr.recruitment.link.onboarding")}
          </Link>
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/training">
            {t("hr.recruitment.link.training")}
          </Link>
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/performance">
            {t("hr.recruitment.link.performance")}
          </Link>
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/succession">
            {t("hr.recruitment.link.succession")}
          </Link>
        </div>
      }
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.recruitment.kpi.vacancies.helper"),
          href: href("vacancies"),
          label: t("hr.recruitment.kpi.vacancies"),
          value: vacancyRecords.length,
        },
        {
          helper: t("hr.recruitment.kpi.hiring.helper"),
          href: href("hiring"),
          label: t("hr.recruitment.kpi.hiring"),
          value: hiringRecords.length,
        },
      ]}
      title={t("hr.recruitment.title")}
      workspaceKey="recruitment"
    >
      {activeTab === "vacancies" ? (
        <div className="space-y-6">
          <form action={createVacancyAction} className="space-y-3 rounded-lg border bg-[hsl(var(--surface))] p-4">
            <p className="font-medium">{t("hr.recruitment.form.openVacancy")}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="positionId" placeholder={t("hr.common.positionId")} required />
              <Input name="jobId" placeholder={t("hr.common.jobId")} required />
              <Input name="departmentId" placeholder={t("hr.common.departmentId")} required />
              <select className={nativeSelectClassName} defaultValue="new_position" name="vacancyReason">
                <option value="new_position">{t("hr.recruitment.form.reason.newPosition")}</option>
                <option value="replacement">{t("hr.recruitment.form.reason.replacement")}</option>
                <option value="expansion">{t("hr.recruitment.form.reason.expansion")}</option>
              </select>
            </div>
            <Button type="submit" variant="primary">
              {t("hr.recruitment.form.createVacancy")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.position"), key: "pos", render: (r) => r.positionId },
              { header: t("hr.common.reason"), key: "reason", render: (r) => r.reason },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
            ]}
            emptyMessage={t("hr.recruitment.form.emptyVacancies")}
            getRowId={(r) => r.id}
            pagination={{ mode: "page", page: 1, pageSize: vacancyRecords.length || 1, totalRows: vacancyRecords.length }}
            records={vacancyRecords}
          />
        </div>
      ) : null}

      {activeTab === "hiring" ? (
        <div className="space-y-6">
          <form action={createHiringRequestAction} className="space-y-3 rounded-lg border bg-[hsl(var(--surface))] p-4">
            <p className="font-medium">{t("hr.recruitment.form.hiringRequest")}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input name="positionId" placeholder={t("hr.common.positionId")} required />
              <DatePicker name="requiredDate" placeholder={t("hr.common.requiredDate")} required />
              <Input name="vacancyId" placeholder={optional(t("hr.common.vacancyId"))} />
              <Input name="justification" placeholder={t("hr.common.justification")} required />
            </div>
            <Button type="submit" variant="primary">
              {t("hr.recruitment.form.submitRequest")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.position"), key: "pos", render: (r) => r.positionId },
              { header: t("hr.recruitment.form.column.required"), key: "date", render: (r) => r.date },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
            ]}
            emptyMessage={t("hr.recruitment.form.emptyHiring")}
            getRowId={(r) => r.id}
            pagination={{ mode: "page", page: 1, pageSize: hiringRecords.length || 1, totalRows: hiringRecords.length }}
            records={hiringRecords}
          />
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

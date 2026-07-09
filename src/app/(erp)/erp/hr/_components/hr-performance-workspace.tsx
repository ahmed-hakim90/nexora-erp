"use client";

import { createTalentProgramAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

export type HrPerformanceTableRecord = {
  code: string;
  employeeId: string;
  id: string;
  status: string;
  title: string;
};

export function HrPerformanceWorkspace({ records }: Readonly<{ records: readonly HrPerformanceTableRecord[] }>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.performance.description")} title={t("hr.performance.title")} />
      <form action={createTalentProgramAction} className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-4">
        <input name="programType" type="hidden" value="performance" />
        <Input name="code" placeholder={t("hr.performance.form.cycleCode")} required />
        <Input name="title" placeholder={t("hr.performance.form.cycleTitle")} required />
        <Input name="employeeId" placeholder={t("hr.common.employeeId")} />
        <Button type="submit" variant="primary">
          {t("hr.performance.form.create")}
        </Button>
      </form>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.code"), key: "code", render: (r) => r.code },
          { header: t("hr.common.name"), key: "title", render: (r) => r.title },
          { header: t("hr.common.employee"), key: "emp", render: (r) => r.employeeId },
          { header: t("hr.common.status"), key: "status", render: (r) => r.status },
        ]}
        emptyMessage={t("hr.performance.empty")}
        getRowId={(r) => r.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }}
        records={records}
      />
    </PageContainer>
  );
}

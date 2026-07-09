"use client";

import { createTalentProgramAction } from "@/features/hr/routes/actions/hr-talent-runtime.actions";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

export type HrSuccessionTableRecord = {
  code: string;
  id: string;
  readiness: string;
  status: string;
  title: string;
};

export function HrSuccessionWorkspace({ records }: Readonly<{ records: readonly HrSuccessionTableRecord[] }>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={t("hr.succession.description")} title={t("hr.succession.title")} />
      <form action={createTalentProgramAction} className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <input name="programType" type="hidden" value="succession" />
        <Input name="code" placeholder={t("hr.succession.form.planCode")} required />
        <Input name="title" placeholder={t("hr.succession.form.planTitle")} required />
        <Button type="submit" variant="primary">
          {t("hr.succession.form.create")}
        </Button>
      </form>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.common.code"), key: "code", render: (r) => r.code },
          { header: t("hr.common.plan"), key: "title", render: (r) => r.title },
          { header: t("hr.common.readiness"), key: "ready", render: (r) => r.readiness },
          { header: t("hr.common.status"), key: "status", render: (r) => r.status },
        ]}
        emptyMessage={t("hr.succession.empty")}
        getRowId={(r) => r.id}
        pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }}
        records={records}
      />
    </PageContainer>
  );
}

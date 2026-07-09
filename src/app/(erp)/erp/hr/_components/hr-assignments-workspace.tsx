"use client";

import Link from "next/link";

import { createHrAssignmentAction, endHrAssignmentAction, updateHrAssignmentAction } from "@/features/hr/routes/actions/hr-employees.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, Input, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

import { HrAssignmentCreateForm } from "./hr-assignment-form";

export type HrAssignmentTableRecord = {
  effectiveFrom: string;
  effectiveTo: string;
  id: string;
  priority: string;
  rawStatus: string;
  reason: string;
  scope: string;
  status: string;
  type: string;
};

export function HrAssignmentsWorkspace({
  editRecord,
  employeeId,
  employmentProfileId,
  preset,
  records,
  showCreate,
  today,
}: Readonly<{
  editRecord?: HrAssignmentTableRecord;
  employeeId?: string;
  employmentProfileId?: string;
  preset?: string;
  records: readonly HrAssignmentTableRecord[];
  showCreate: boolean;
  today: string;
}>) {
  const t = useTranslations();
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.assignments.description")}
        help={resolveHrPageHelp("assignments")}
        title={t("hr.assignments.title")}
      >
        {employeeId ? (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
            href={`/erp/hr/assignments?employeeId=${employeeId}&create=1`}
          >
            {t("hr.assignments.create")}
          </Link>
        ) : null}
      </PageHeader>
      <div className="space-y-6">
        <EnterpriseDataTable
          columns={[
            { header: t("hr.common.type"), key: "type", render: (record) => record.type },
            { header: t("hr.common.scope"), key: "scope", render: (record) => record.scope },
            { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            { header: t("hr.common.effectiveFrom"), key: "from", render: (record) => record.effectiveFrom },
            { header: t("hr.common.effectiveTo"), key: "to", render: (record) => record.effectiveTo },
            { header: t("hr.common.priority"), key: "priority", render: (record) => record.priority },
            { header: t("hr.common.reason"), key: "reason", render: (record) => record.reason || "—" },
            {
              header: t("hr.common.actions"),
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  <a className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/erp/hr/assignments?edit=${record.id}${employeeId ? `&employeeId=${employeeId}` : ""}`}>
                    {t("hr.common.edit")}
                  </a>
                  {["active", "planned"].includes(record.rawStatus) ? (
                    <form action={endHrAssignmentAction}>
                      <input name="assignmentId" type="hidden" value={record.id} />
                      <input name="effectiveTo" type="hidden" value={today} />
                      <Button size="sm" type="submit" variant="secondary">
                        {t("hr.common.end")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyMessage={t("hr.assignments.empty")}
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
        />

        {editRecord ? (
          <form action={updateHrAssignmentAction} className="grid gap-3 rounded-lg border border-accent p-4 md:grid-cols-3 xl:grid-cols-5">
            <input name="assignmentId" type="hidden" value={editRecord.id} />
            <DatePicker defaultValue={editRecord.effectiveFrom} name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
            <DatePicker defaultValue={editRecord.effectiveTo || undefined} name="effectiveTo" placeholder={t("hr.common.effectiveTo")} />
            <Input defaultValue={editRecord.priority} min="1" name="priority" type="number" />
            <Input defaultValue={editRecord.reason} name="reason" placeholder={t("hr.common.reason")} />
            <Button type="submit" variant="primary">
              {t("hr.assignments.save")}
            </Button>
          </form>
        ) : null}

        {showCreate && employeeId ? (
          <HrAssignmentCreateForm action={createHrAssignmentAction} employeeId={employeeId} employmentProfileId={employmentProfileId} preset={preset} />
        ) : null}
      </div>
    </PageContainer>
  );
}

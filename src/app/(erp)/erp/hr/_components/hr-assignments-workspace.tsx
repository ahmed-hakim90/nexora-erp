"use client";

import Link from "next/link";

import { endHrAssignmentAction } from "@/features/hr/routes/actions/hr-employees.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, PageContainer, PageHeader, primaryButtonLinkClassName, useTranslations } from "@/shared/ui";

import { HrAssignmentCreateFormDialog, HrAssignmentEditFormDialog } from "./hr-assignment-form-dialogs";

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

function buildAssignmentsHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined> = {}) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/assignments?${query}` : "/erp/hr/assignments";
}

export function HrAssignmentsWorkspace({
  editRecord,
  employeeId,
  employmentProfileId,
  preset,
  query,
  records,
  showCreate,
  today,
}: Readonly<{
  editRecord?: HrAssignmentTableRecord;
  employeeId?: string;
  employmentProfileId?: string;
  preset?: string;
  query: Record<string, string | undefined>;
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
          <Link className={primaryButtonLinkClassName} href={buildAssignmentsHref(query, { create: "1", employeeId })}>
            {t("hr.assignments.create")}
          </Link>
        ) : null}
      </PageHeader>

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
                <a
                  className="inline-flex h-8 items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
                  href={buildAssignmentsHref(query, { edit: record.id })}
                >
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

      {showCreate && employeeId ? (
        <HrAssignmentCreateFormDialog
          employeeId={employeeId}
          employmentProfileId={employmentProfileId}
          preset={preset}
          query={query}
        />
      ) : null}
      {editRecord ? <HrAssignmentEditFormDialog assignment={editRecord} query={query} /> : null}
    </PageContainer>
  );
}

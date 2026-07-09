"use client";

import { useState, useTransition } from "react";

import { createHrContractAction, transitionHrContractAction } from "@/features/hr/routes/actions/hr-operational.actions";
import { previewHrContractAction } from "@/features/hr/routes/actions/hr-contract-type.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  DatePicker,
  Dialog,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  PageContainer,
  PageHeader,
  useTranslations,
} from "@/shared/ui";

export type HrContractTableRecord = {
  contractNumber: string;
  contractType: string;
  employee: string;
  employeeId: string;
  endsOn: string;
  expiringSoon: boolean;
  id: string;
  rawStatus: string;
  startsOn: string;
  status: string;
};

function ContractActionButton({ label }: Readonly<{ label: string }>) {
  return (
    <button className="rounded-md border px-2 py-1 text-xs" type="submit">
      {label}
    </button>
  );
}

export function HrContractsWorkspace({
  defaultEmployeeId,
  expiringCount,
  highlightCreate,
  records,
  renewEndsOn,
  today,
}: Readonly<{
  defaultEmployeeId?: string;
  expiringCount: number;
  highlightCreate?: boolean;
  records: readonly HrContractTableRecord[];
  renewEndsOn: string;
  today: string;
}>) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? "");
  const [contractTypeVersionId, setContractTypeVersionId] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [selectedTypeMeta, setSelectedTypeMeta] = useState<{ requiresEndDate?: boolean; versionNo?: number } | null>(null);

  function handleContractTypeChange(value: string, option?: { metadata?: Record<string, unknown> }) {
    setContractTypeVersionId(value);
    const metadata = option?.metadata as { requiresEndDate?: boolean; versionNo?: number } | undefined;
    setSelectedTypeMeta(metadata ?? null);
  }

  function runPreview() {
    if (!employeeId || !contractTypeVersionId || !startsOn) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("contractTypeVersionId", contractTypeVersionId);
      formData.set("startsOn", startsOn);
      if (endsOn) formData.set("endsOn", endsOn);
      const result = await previewHrContractAction(formData);
      setPreviewHtml(result.html);
    });
  }

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.contracts.description")}
        help={resolveHrPageHelp("contracts")}
        title={t("hr.contracts.title")}
      />
      <div className="space-y-4">
        {expiringCount > 0 ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {t("hr.contracts.expiring", { count: expiringCount })}
          </p>
        ) : (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{t("hr.contracts.noExpiryAlerts")}</p>
        )}

        <form
          action={createHrContractAction}
          className={`grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-7 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}
        >
          <EntityLookup
            label={t("hr.common.employee")}
            name="employeeId"
            onValueChange={(value) => setEmployeeId(value ?? "")}
            providerKey="hr.employees.lookup"
            required
            value={employeeId}
          />
          <Input name="contractNumber" placeholder={t("hr.common.contractNumber")} required />
          <EntityLookup
            label={t("hr.common.contractType")}
            name="contractTypeVersionId"
            onValueChange={handleContractTypeChange}
            providerKey="hr.contract-types.lookup"
            required
            value={contractTypeVersionId}
          />
          <DatePicker
            name="startsOn"
            onValueChange={(value) => setStartsOn(value ?? "")}
            placeholder={t("hr.common.startDate")}
            required
            value={startsOn}
          />
          <DatePicker
            name="endsOn"
            onValueChange={(value) => setEndsOn(value ?? "")}
            placeholder={
              selectedTypeMeta?.requiresEndDate ? t("hr.contracts.endDateRequired") : t("hr.contracts.endDateOptional")
            }
            required={selectedTypeMeta?.requiresEndDate}
            value={endsOn}
          />
          <div className="flex flex-col gap-2">
            {selectedTypeMeta?.versionNo ? (
              <p className="text-xs text-muted-foreground">
                {t("hr.contracts.activeTemplate", { version: selectedTypeMeta.versionNo })}
              </p>
            ) : null}
            <Button
              disabled={isPending || !employeeId || !contractTypeVersionId || !startsOn}
              onClick={runPreview}
              type="button"
              variant="secondary"
            >
              {t("hr.common.preview")}
            </Button>
          </div>
          <Button type="submit" variant="primary">
            {t("hr.contracts.create")}
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: t("hr.contracts.column.contract"), key: "number", render: (record) => record.contractNumber },
            { header: t("hr.common.employee"), key: "employee", render: (record) => record.employee },
            { header: t("hr.common.type"), key: "type", render: (record) => record.contractType },
            { header: t("hr.common.status"), key: "status", render: (record) => record.status },
            { header: t("hr.common.startDate"), key: "start", render: (record) => record.startsOn },
            { header: t("hr.common.endDate"), key: "end", render: (record) => record.endsOn },
            {
              header: t("hr.common.actions"),
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  {record.rawStatus === "active" ? (
                    <>
                      <form action={transitionHrContractAction.bind(null, record.id, "renew")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="endsOn" type="hidden" value={renewEndsOn} />
                        <ContractActionButton label={t("hr.common.renew")} />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "amend")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <ContractActionButton label={t("hr.common.amend")} />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "suspend")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="reason" type="hidden" value="Suspended from HR contracts workspace" />
                        <ContractActionButton label={t("hr.common.suspend")} />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "terminate")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="reason" type="hidden" value="Terminated from HR contracts workspace" />
                        <ContractActionButton label={t("hr.common.terminate")} />
                      </form>
                    </>
                  ) : null}
                  {record.rawStatus === "suspended" ? (
                    <form action={transitionHrContractAction.bind(null, record.id, "resume")}>
                      <input name="effectiveDate" type="hidden" value={today} />
                      <input name="reason" type="hidden" value="Resumed from HR contracts workspace" />
                      <ContractActionButton label={t("hr.common.resume")} />
                    </form>
                  ) : null}
                  {record.rawStatus !== "active" && record.rawStatus !== "suspended" ? (
                    <span className="text-xs text-muted-foreground">{t("hr.common.noActions")}</span>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyMessage={t("hr.contracts.empty")}
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(record) => [
            { href: `/erp/hr/employees/${record.employeeId}?tab=contracts`, key: "view", label: t("hr.common.viewProfile") },
          ]}
        />
      </div>

      <Dialog onOpenChange={(open) => !open && setPreviewHtml(null)} open={previewHtml !== null} title={t("hr.contracts.previewTitle")}>
        {previewHtml ? <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : null}
      </Dialog>
    </PageContainer>
  );
}

"use client";

import Link from "next/link";
import { useTransition } from "react";

import type { HrCompensationIssuanceDocumentKind } from "@/features/hr/public-api";
import { compensationIssuanceBatchPath } from "@/features/hr/public-api";
import { approveCompensationIssuanceBatchAction } from "@/features/hr/routes/actions/hr-compensation-issuance.actions";
import type { HrCompensationIssuanceBatchListItem } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { platformFeedback } from "@/platform/feedback/public-api";
import { Button, EnterpriseDataTable, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

export function HrCompensationIssuanceBatchTable({
  batches,
  documentKind,
}: Readonly<{
  batches: readonly HrCompensationIssuanceBatchListItem[];
  documentKind: HrCompensationIssuanceDocumentKind;
}>) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  function handleApproveBatch(batchId: string) {
    startTransition(async () => {
      try {
        await approveCompensationIssuanceBatchAction(batchId, documentKind);
        platformFeedback.success(t("hr.compensationIssuance.batch.approve"));
      } catch (error) {
        platformFeedback.error(error instanceof Error ? error.message : "Could not approve batch.");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{t("hr.bonuses.batchesTitle")}</h2>
      <EnterpriseDataTable
        columns={[
          { header: t("hr.compensationIssuance.batch.code"), key: "code", render: (batch) => batch.batchCode },
          { header: t("hr.common.type"), key: "type", render: (batch) => batch.documentSubtype },
          { header: t("hr.common.amount"), key: "amount", render: (batch) => batch.totalAmount.toLocaleString() },
          { header: t("hr.common.employee"), key: "count", render: (batch) => batch.employeeCount },
          { header: t("hr.compensationIssuance.batch.status"), key: "status", render: (batch) => batch.status },
          {
            header: t("hr.common.actions"),
            key: "actions",
            render: (batch) => (
              <div className="flex flex-wrap gap-1">
                <Link className={secondaryButtonLinkClassName} href={compensationIssuanceBatchPath(batch.id)}>
                  {t("hr.compensationIssuance.batch.view")}
                </Link>
                {batch.status === "submitted" ? (
                  <Button disabled={isPending} onClick={() => handleApproveBatch(batch.id)} size="sm" type="button" variant="primary">
                    {t("hr.compensationIssuance.batch.approve")}
                  </Button>
                ) : null}
                {batch.status === "processing" ? (
                  <span className="text-xs text-muted-foreground">{t("hr.compensationIssuance.batch.processing")}</span>
                ) : null}
                {batch.status === "failed" ? (
                  <span className="text-xs text-destructive">{t("hr.compensationIssuance.batch.failed")}</span>
                ) : null}
              </div>
            ),
          },
        ]}
        emptyMessage={t("hr.bonuses.batchesEmpty")}
        getRowId={(batch) => batch.id}
        pagination={{ mode: "cursor", pageSize: 10 }}
        records={batches}
      />
    </section>
  );
}

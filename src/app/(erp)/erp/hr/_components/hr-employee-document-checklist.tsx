"use client";

import Link from "next/link";

import type { HrEmployeeDocumentCompliance } from "@/features/hr/application/utils/hr-document-compliance.evaluate";
import { translateHrRequiredDocumentKind } from "@/features/hr/application/constants/hr-document-kind.registry";
import {
  grantHrDocumentComplianceWaiverAction,
  revokeHrDocumentComplianceWaiverAction,
} from "@/features/hr/routes/actions/hr-document-compliance-waiver.actions";
import { Button, DatePicker, Input, secondaryButtonLinkClassName, useTranslations } from "@/shared/ui";

function complianceStatusKey(status: string) {
  return `hr.documentCompliance.status.${status}` as const;
}

function resolutionMessageKey(resolution: HrEmployeeDocumentCompliance["resolution"]) {
  if (resolution === "no_active_contract") return "hr.documentCompliance.resolution.noActiveContract" as const;
  if (resolution === "no_document_set") return "hr.documentCompliance.resolution.noDocumentSet" as const;
  return "hr.documentCompliance.resolution.noRequirements" as const;
}

export function HrEmployeeDocumentChecklist({
  canManageWaivers = false,
  compliance,
  employeeId,
  onUploadKind,
  selectedUploadType,
}: Readonly<{
  canManageWaivers?: boolean;
  compliance: HrEmployeeDocumentCompliance;
  employeeId: string;
  onUploadKind?: (uploadType: string) => void;
  selectedUploadType?: string;
}>) {
  const t = useTranslations();

  if (compliance.resolution !== "resolved") {
    return (
      <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        {t(resolutionMessageKey(compliance.resolution))}
      </article>
    );
  }

  return (
    <article className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("hr.documentCompliance.title")}</h2>
          {compliance.contractTypeLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("hr.documentCompliance.contractTypeContext", { contractType: compliance.contractTypeLabel })}
            </p>
          ) : null}
          {compliance.documentSetLabel ? (
            <p className="text-sm text-muted-foreground">
              {t("hr.documentCompliance.documentSetContext", { documentSet: compliance.documentSetLabel })}
            </p>
          ) : null}
        </div>
        <p className="rounded-md border px-3 py-1 text-sm font-medium">
          {t("hr.documentCompliance.summary.complete", {
            complete: compliance.summary.complete,
            total: compliance.summary.total,
          })}
        </p>
      </div>

      <ul className="space-y-2">
        {compliance.items.map((item) => {
          const isSelected = selectedUploadType === item.uploadType;
          const statusLabel = t(complianceStatusKey(item.status));
          const needsAction = item.status === "missing" || item.status === "expired" || item.status === "registered_only";
          return (
            <li
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${isSelected ? "border-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]" : "border-[hsl(var(--border))]"}`}
              key={item.kind}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{translateHrRequiredDocumentKind(t, item.kind)}</p>
                <p className="text-muted-foreground">
                  {statusLabel}
                  {item.waiverReason ? ` · ${item.waiverReason}` : ""}
                  {item.fileName ? ` · ${item.fileName}` : ""}
                  {item.expiresOn ? ` · ${item.expiresOn}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {needsAction ? (
                  onUploadKind && item.uploadType ? (
                    <Button onClick={() => onUploadKind(item.uploadType!)} size="sm" type="button" variant="secondary">
                      {item.status === "missing" ? t("hr.documentCompliance.action.upload") : t("hr.documentCompliance.action.replace")}
                    </Button>
                  ) : (
                    <Link
                      className={secondaryButtonLinkClassName}
                      href={`/erp/hr/employees/${employeeId}?tab=documents&uploadKind=${item.uploadType ?? item.kind}`}
                    >
                      {t("hr.documentCompliance.action.upload")}
                    </Link>
                  )
                ) : null}
                {canManageWaivers && needsAction ? (
                  <form action={grantHrDocumentComplianceWaiverAction} className="flex flex-wrap items-center gap-2">
                    <input name="documentKind" type="hidden" value={item.kind} />
                    <input name="employeeId" type="hidden" value={employeeId} />
                    <Input className="min-w-[12rem]" name="reason" placeholder={t("hr.documentCompliance.waiver.reasonPlaceholder")} required />
                    <DatePicker name="effectiveTo" placeholder={t("hr.documentCompliance.waiver.effectiveTo")} />
                    <Button size="sm" type="submit" variant="secondary">
                      {t("hr.documentCompliance.action.waive")}
                    </Button>
                  </form>
                ) : null}
                {canManageWaivers && item.status === "waived" && item.waiverId ? (
                  <form action={revokeHrDocumentComplianceWaiverAction}>
                    <input name="waiverId" type="hidden" value={item.waiverId} />
                    <Button size="sm" type="submit" variant="secondary">
                      {t("hr.documentCompliance.action.revokeWaiver")}
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

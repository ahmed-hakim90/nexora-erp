import Link from "next/link";

import { compensationIssuanceListPath } from "@/features/hr/public-api";
import {
  approveCompensationIssuanceBatchAction,
  rejectCompensationIssuanceBatchAction,
} from "@/features/hr/routes/actions/hr-compensation-issuance.actions";
import { mapCompensationIssuanceBatchRow } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { Button, EnterpriseDataTable, Input, PageContainer, PageHeader, secondaryButtonLinkClassName } from "@/shared/ui";

import { HrShell } from "../../../_components/hr-shell";

export default async function HrCompensationBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data: batchRow }, { data: lineRows }] = await Promise.all([
    supabase
      .from("hr_compensation_issuance_batches")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("hr_compensation_issuance_batch_lines")
      .select("id, employee_id, position_label, amount, percentage, line_status, target_document_number, skip_reason")
      .eq("batch_id", id)
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: true }),
  ]);

  if (!batchRow) {
    return (
      <HrShell activeKey="bonuses">
        <PageContainer>
          <PageHeader title="Batch not found" />
          <Link className={secondaryButtonLinkClassName} href="/erp/hr/bonuses">
            Back
          </Link>
        </PageContainer>
      </HrShell>
    );
  }

  const batch = mapCompensationIssuanceBatchRow(batchRow as Record<string, unknown>);
  const shellKey = batch.documentKind === "incentive" ? "incentives" : batch.documentKind === "penalty" ? "penalties" : "bonuses";
  const employeeIds = [...new Set((lineRows ?? []).map((row) => String(row.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const employee of employees ?? []) {
      employeeMap.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
    }
  }

  const lines = (lineRows ?? []).map((row) => ({
    amount: row.amount === null ? null : Number(row.amount),
    documentNumber: row.target_document_number ? String(row.target_document_number) : "—",
    employeeId: String(row.employee_id),
    employeeLabel: employeeMap.get(String(row.employee_id)) ?? String(row.employee_id),
    id: String(row.id),
    lineStatus: String(row.line_status),
    percentage: row.percentage === null ? null : Number(row.percentage),
    positionLabel: row.position_label ? String(row.position_label) : "—",
    skipReason: row.skip_reason ? String(row.skip_reason) : null,
  }));

  const processingError = batchRow.processing_error ? String(batchRow.processing_error) : null;

  return (
    <HrShell activeKey={shellKey}>
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description={`${batch.documentSubtype} · ${batch.employeeCount} employees · ${batch.totalAmount.toLocaleString()} SAR · ${batch.status}`}
          title={batch.batchCode}
        />

        {batch.status === "processing" ? (
          <p className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
            Batch is processing in the background. Refresh this page to see updated status.
          </p>
        ) : null}
        {batch.status === "failed" && processingError ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{processingError}</p>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <Link className={secondaryButtonLinkClassName} href={compensationIssuanceListPath(batch.documentKind)}>
            Back to list
          </Link>
          {batch.status === "submitted" ? (
            <>
              <form action={approveCompensationIssuanceBatchAction.bind(null, batch.id, batch.documentKind)}>
                <Button type="submit" variant="primary">
                  Approve batch
                </Button>
              </form>
              <form action={rejectCompensationIssuanceBatchAction} className="flex flex-wrap items-center gap-2">
                <input name="batchId" type="hidden" value={batch.id} />
                <input name="documentKind" type="hidden" value={batch.documentKind} />
                <Input className="w-64" name="reason" placeholder="Rejection reason" required />
                <Button type="submit" variant="secondary">
                  Reject batch
                </Button>
              </form>
            </>
          ) : null}
        </div>

        <EnterpriseDataTable
          columns={[
            { header: "Employee", key: "emp", render: (line) => line.employeeLabel },
            { header: "Position", key: "pos", render: (line) => line.positionLabel },
            { header: "Amount", key: "amount", render: (line) => (line.amount ? line.amount.toLocaleString() : "—") },
            { header: "Percentage", key: "pct", render: (line) => (line.percentage !== null ? `${line.percentage}%` : "—") },
            { header: "Document", key: "doc", render: (line) => line.documentNumber },
            { header: "Status", key: "status", render: (line) => line.lineStatus },
            { header: "Note", key: "note", render: (line) => line.skipReason ?? "—" },
          ]}
          emptyMessage="No lines in this batch."
          getRowId={(line) => line.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={lines}
        />
      </PageContainer>
    </HrShell>
  );
}

import type { HrCompensationIssuanceDocumentKind } from "../../application/constants/hr-compensation-issuance.constants";

export type HrCompensationIssuanceBatchListItem = Readonly<{
  batchCode: string;
  createdAt: string;
  documentKind: HrCompensationIssuanceDocumentKind;
  documentSubtype: string;
  employeeCount: number;
  id: string;
  status: string;
  totalAmount: number;
}>;

export function mapCompensationIssuanceBatchRow(row: Record<string, unknown>): HrCompensationIssuanceBatchListItem {
  return {
    batchCode: String(row.batch_code),
    createdAt: String(row.created_at),
    documentKind: String(row.document_kind) as HrCompensationIssuanceDocumentKind,
    documentSubtype: String(row.document_subtype),
    employeeCount: Number(row.employee_count ?? 0),
    id: String(row.id),
    status: String(row.status),
    totalAmount: Number(row.total_amount ?? 0),
  };
}

export async function loadCompensationIssuanceBatches(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  input: Readonly<{ companyId: string; documentKind: HrCompensationIssuanceDocumentKind; tenantId: string }>,
): Promise<readonly HrCompensationIssuanceBatchListItem[]> {
  const { data } = await supabase
    .from("hr_compensation_issuance_batches")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("company_id", input.companyId)
    .eq("document_kind", input.documentKind)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => mapCompensationIssuanceBatchRow(row as Record<string, unknown>));
}

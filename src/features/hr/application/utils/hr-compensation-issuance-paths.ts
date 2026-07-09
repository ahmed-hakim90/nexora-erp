import type { HrCompensationIssuanceDocumentKind } from "../constants/hr-compensation-issuance.constants";

const LIST_PATHS: Record<HrCompensationIssuanceDocumentKind, string> = {
  bonus: "/erp/hr/bonuses",
  incentive: "/erp/hr/incentives",
  penalty: "/erp/hr/penalties",
};

export function compensationIssuanceListPath(documentKind: HrCompensationIssuanceDocumentKind): string {
  return LIST_PATHS[documentKind];
}

export function compensationIssuanceBatchPath(batchId: string): string {
  return `/erp/hr/compensation/batches/${batchId}`;
}

export function buildCompensationIssuanceCloseHref(
  documentKind: HrCompensationIssuanceDocumentKind,
  query: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "batch" || !value) continue;
    next.set(key, value);
  }
  const queryString = next.toString();
  const base = compensationIssuanceListPath(documentKind);
  return queryString ? `${base}?${queryString}` : base;
}

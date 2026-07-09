import { defineAuditAction } from "@/platform/audit/public-api";
import { defineJob } from "@/platform/background-jobs/public-api";

export const HR_COMPENSATION_ISSUANCE_DOCUMENT_KINDS = ["bonus", "incentive", "penalty"] as const;
export type HrCompensationIssuanceDocumentKind = (typeof HR_COMPENSATION_ISSUANCE_DOCUMENT_KINDS)[number];

export const HR_COMPENSATION_ISSUANCE_SELECTION_MODES = [
  "manual",
  "by_position",
  "by_department",
  "by_branch",
  "all_active",
  "import",
  "combined",
] as const;
export type HrCompensationIssuanceSelectionMode = (typeof HR_COMPENSATION_ISSUANCE_SELECTION_MODES)[number];

export const HR_COMPENSATION_ISSUANCE_AMOUNT_MODES = ["fixed", "by_position", "per_employee"] as const;
export type HrCompensationIssuanceAmountMode = (typeof HR_COMPENSATION_ISSUANCE_AMOUNT_MODES)[number];

export const HR_COMPENSATION_ISSUANCE_BATCH_STATUSES = [
  "draft",
  "preview_ready",
  "processing",
  "submitted",
  "approved",
  "partially_approved",
  "rejected",
  "failed",
] as const;
export type HrCompensationIssuanceBatchStatus = (typeof HR_COMPENSATION_ISSUANCE_BATCH_STATUSES)[number];

export const HR_COMPENSATION_ISSUANCE_LINE_STATUSES = ["pending", "created", "skipped", "error"] as const;
export type HrCompensationIssuanceLineStatus = (typeof HR_COMPENSATION_ISSUANCE_LINE_STATUSES)[number];

export const HR_COMPENSATION_ISSUANCE_MAX_LINES = 2000;
export const HR_COMPENSATION_ISSUANCE_SYNC_THRESHOLD = 50;
export const HR_COMPENSATION_ISSUANCE_CHUNK_SIZE = 50;

export const HR_COMPENSATION_ISSUANCE_BATCH_CODE_PREFIX: Record<HrCompensationIssuanceDocumentKind, string> = {
  bonus: "BON-BATCH",
  incentive: "INC-BATCH",
  penalty: "PEN-BATCH",
};

export const HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS = {
  batchApproved: defineAuditAction("hr.compensation.batch.approved"),
  batchCreated: defineAuditAction("hr.compensation.batch.created"),
  batchFailed: defineAuditAction("hr.compensation.batch.failed"),
  batchPreviewBuilt: defineAuditAction("hr.compensation.batch.preview-built"),
  batchRejected: defineAuditAction("hr.compensation.batch.rejected"),
  batchSubmitted: defineAuditAction("hr.compensation.batch.submitted"),
} as const;

export const HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB = defineJob({
  key: "hr.compensation-issuance-materialize",
  maxRetries: 2,
  priority: "high",
  queueKey: "hr-compensation-issuance",
  retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 3, strategy: "fixed", timeoutSeconds: 3600 },
  timeoutSeconds: 3600,
});

export const HR_COMPENSATION_ISSUANCE_TABLES = [
  "hr_compensation_issuance_batches",
  "hr_compensation_issuance_batch_lines",
] as const;

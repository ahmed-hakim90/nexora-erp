import type { HrCompensationIssuanceDocumentKind } from "../constants/hr-compensation-issuance.constants";
import type {
  HrCompensationIssuanceAmountConfig,
  HrCompensationIssuanceLineOverride,
  HrCompensationIssuancePreviewLine,
  HrCompensationIssuanceRecipientPreview,
} from "../schemas/hr-compensation-issuance-batch.schema";
import type { HrCompensationIssuanceAmountMode } from "../constants/hr-compensation-issuance.constants";

export function nextCompensationIssuanceBatchCode(prefix: string): string {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString().slice(-8);
  return `${prefix}-${year}-${suffix}`;
}

export function roundIssuanceAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

type AmountResolution = Readonly<{
  amount: number | null;
  percentage: number | null;
  skipReason: string | null;
}>;

export function resolveIssuanceLineAmount(input: Readonly<{
  amountConfig: HrCompensationIssuanceAmountConfig;
  amountMode: HrCompensationIssuanceAmountMode;
  documentKind: HrCompensationIssuanceDocumentKind;
  override?: HrCompensationIssuanceLineOverride;
  recipient: Pick<HrCompensationIssuanceRecipientPreview, "employeeId" | "positionId">;
}>): AmountResolution {
  if (input.override?.amount !== undefined) {
    if (input.documentKind !== "incentive" && input.override.amount <= 0) {
      return { amount: null, percentage: null, skipReason: "Amount must be greater than zero." };
    }
    return {
      amount: input.override.amount > 0 ? roundIssuanceAmount(input.override.amount) : null,
      percentage: input.override.percentage ?? null,
      skipReason: null,
    };
  }

  if (input.override?.percentage !== undefined && input.documentKind === "incentive") {
    return { amount: null, percentage: input.override.percentage, skipReason: null };
  }

  if (input.amountMode === "fixed") {
    const amount = input.amountConfig.amount;
    if (amount === undefined || amount <= 0) {
      return { amount: null, percentage: null, skipReason: "Fixed amount is not configured." };
    }
    return { amount: roundIssuanceAmount(amount), percentage: null, skipReason: null };
  }

  if (input.amountMode === "by_position") {
    const positionId = input.recipient.positionId;
    if (!positionId) {
      const fallback = input.amountConfig.defaultAmount;
      if (fallback === undefined) {
        return { amount: null, percentage: null, skipReason: "Employee has no active position assignment." };
      }
      return { amount: roundIssuanceAmount(fallback), percentage: null, skipReason: null };
    }
    const mapped = input.amountConfig.byPosition?.[positionId];
    if (mapped !== undefined) {
      return { amount: roundIssuanceAmount(mapped), percentage: null, skipReason: null };
    }
    if (input.amountConfig.defaultAmount !== undefined) {
      return { amount: roundIssuanceAmount(input.amountConfig.defaultAmount), percentage: null, skipReason: null };
    }
    return { amount: null, percentage: null, skipReason: "No amount configured for employee position." };
  }

  return { amount: null, percentage: null, skipReason: "Per-employee amount not provided." };
}

export function buildIssuancePreviewLines(input: Readonly<{
  amountConfig: HrCompensationIssuanceAmountConfig;
  amountMode: HrCompensationIssuanceAmountMode;
  documentKind: HrCompensationIssuanceDocumentKind;
  lineOverrides?: readonly HrCompensationIssuanceLineOverride[];
  recipients: readonly HrCompensationIssuanceRecipientPreview[];
}>): { lines: HrCompensationIssuancePreviewLine[]; totalAmount: number; warnings: string[] } {
  const overrideMap = new Map((input.lineOverrides ?? []).map((line) => [line.employeeId, line]));
  const warnings: string[] = [];
  let totalAmount = 0;

  const lines = input.recipients.map((recipient) => {
    const resolution = resolveIssuanceLineAmount({
      amountConfig: input.amountConfig,
      amountMode: input.amountMode,
      documentKind: input.documentKind,
      override: overrideMap.get(recipient.employeeId),
      recipient,
    });

    const hasValue =
      input.documentKind === "incentive"
        ? (resolution.amount !== null && resolution.amount > 0) || resolution.percentage !== null
        : input.documentKind === "penalty"
          ? resolution.amount === null || resolution.amount >= 0
          : resolution.amount !== null && resolution.amount > 0;

    if (!hasValue || resolution.skipReason) {
      return {
        amount: resolution.amount,
        employeeId: recipient.employeeId,
        employeeLabel: recipient.employeeLabel,
        lineStatus: "skipped" as const,
        percentage: resolution.percentage,
        positionId: recipient.positionId,
        positionLabel: recipient.positionLabel,
        skipReason: resolution.skipReason ?? "Amount could not be resolved.",
      };
    }

    if (resolution.amount !== null) {
      totalAmount += resolution.amount;
    }

    return {
      amount: resolution.amount,
      employeeId: recipient.employeeId,
      employeeLabel: recipient.employeeLabel,
      lineStatus: "pending" as const,
      percentage: resolution.percentage,
      positionId: recipient.positionId,
      positionLabel: recipient.positionLabel,
      skipReason: null,
    };
  });

  const skippedCount = lines.filter((line) => line.lineStatus === "skipped").length;
  if (skippedCount > 0) {
    warnings.push(`${skippedCount} employee(s) will be skipped due to missing amount or assignment data.`);
  }

  return { lines, totalAmount: roundIssuanceAmount(totalAmount), warnings };
}

export function validateIssuanceDocumentSubtype(
  documentKind: HrCompensationIssuanceDocumentKind,
  documentSubtype: string,
  allowedValues: readonly string[],
): boolean {
  return allowedValues.includes(documentSubtype);
}

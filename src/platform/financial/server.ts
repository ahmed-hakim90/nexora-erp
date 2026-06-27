import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  AccountingPeriod,
  CurrencyDefinition,
  FinancialNumberingSequence,
  GeneratedFinancialDocumentNumber,
  Money,
  PostingLifecycleState,
  TaxCalculationMode,
  TaxLine,
  TaxRate,
} from "./public-api";
import { POSTING_LIFECYCLE_TRANSITIONS } from "./public-api";

function assertCurrencyCode(currencyCode: string): string {
  const normalized = currencyCode.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Currency codes must use ISO-style three-letter uppercase codes.",
    });
  }

  return normalized;
}

function roundMoney(amount: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function assertAccountingPeriodOpen(period: AccountingPeriod): void {
  if (period.status === "open") {
    return;
  }

  throw new ApplicationError({
    code: "BUSINESS_RULE_VIOLATION",
    message:
      period.status === "locked"
        ? "Locked accounting periods cannot accept financial activity."
        : "Closed accounting periods cannot accept normal financial activity.",
  });
}

export function formatMoney(money: Money, currency: CurrencyDefinition): string {
  const currencyCode = assertCurrencyCode(money.currencyCode);

  if (currencyCode !== assertCurrencyCode(currency.code)) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Money currency must match the currency definition.",
    });
  }

  const formattedAmount = roundMoney(money.amount, currency.precision).toFixed(
    currency.precision,
  );

  return `${currency.symbol ?? currencyCode} ${formattedAmount}`;
}

export function calculateTaxLines(params: {
  amount: number;
  rates: readonly TaxRate[];
  calculationMode: TaxCalculationMode;
  precision?: number;
}): readonly TaxLine[] {
  const precision = params.precision ?? 2;

  if (params.amount < 0) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Tax calculation amount cannot be negative.",
    });
  }

  return params.rates.map((rate) => {
    if (rate.rate < 0 || rate.rate > 1) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Tax rates must be expressed as a decimal between 0 and 1.",
      });
    }

    const taxableAmount =
      params.calculationMode === "inclusive"
        ? params.amount / (1 + rate.rate)
        : params.amount;
    const taxAmount =
      params.calculationMode === "inclusive"
        ? params.amount - taxableAmount
        : taxableAmount * rate.rate;

    return {
      calculationMode: params.calculationMode,
      taxableAmount: roundMoney(taxableAmount, precision),
      taxAmount: roundMoney(taxAmount, precision),
      taxKey: rate.taxKey,
    };
  });
}

export function previewFinancialDocumentNumber(
  sequence: FinancialNumberingSequence,
): GeneratedFinancialDocumentNumber {
  if (sequence.padding < 1 || sequence.nextValue < 1) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Numbering sequence padding and next value must be positive.",
    });
  }

  const value = String(sequence.nextValue).padStart(sequence.padding, "0");
  const tokens = {
    branch: sequence.scope.branchId ?? "",
    company: sequence.scope.companyId ?? "",
    fiscalYear: sequence.scope.fiscalYear ?? "",
    module: sequence.scope.moduleKey,
    sequence: sequence.key,
  };
  const prefix = renderNumberTemplate(sequence.prefixTemplate ?? "", tokens);
  const suffix = renderNumberTemplate(sequence.suffixTemplate ?? "", tokens);

  return {
    sequenceKey: sequence.key,
    sequenceValue: sequence.nextValue,
    value: `${prefix}${value}${suffix}`,
  };
}

export function assertPostingLifecycleTransition(params: {
  from: PostingLifecycleState;
  to: PostingLifecycleState;
}): void {
  const allowed = POSTING_LIFECYCLE_TRANSITIONS.some(
    (transition) => transition.from === params.from && transition.to === params.to,
  );

  if (!allowed) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Posting lifecycle transition is not allowed.",
    });
  }
}

function renderNumberTemplate(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (_match, token: string) => {
    return tokens[token] ?? "";
  });
}


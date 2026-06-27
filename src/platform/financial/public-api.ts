import type { PermissionKey } from "@/platform/permissions/public-api";

export {
  FINANCIAL_PLATFORM_PERMISSION_LIST,
  FINANCIAL_PLATFORM_PERMISSIONS,
} from "./permissions";
export type { FinancialPlatformPermission } from "./permissions";

export type AccountingPeriodStatus = "open" | "closed" | "locked";
export type PostingLifecycleState =
  | "draft"
  | "submitted"
  | "approved"
  | "posted"
  | "cancelled"
  | "reversed";

export type TaxCalculationMode = "inclusive" | "exclusive";
export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "failed"
  | "refunded"
  | "cancelled";
export type PaymentChannel =
  | "cash"
  | "bank"
  | "card"
  | "wallet"
  | "cheque"
  | "online"
  | "external";
export type FinancialDimensionType =
  | "company"
  | "branch"
  | "department"
  | "cost-center"
  | "project"
  | "warehouse"
  | "employee"
  | "vehicle"
  | "customer"
  | "supplier";

export type FiscalYear = Readonly<{
  id?: string;
  tenantId: string;
  companyId?: string | null;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AccountingPeriodStatus;
}>;

export type AccountingPeriod = Readonly<{
  id?: string;
  tenantId: string;
  fiscalYearId?: string | null;
  companyId?: string | null;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AccountingPeriodStatus;
}>;

export type CurrencyDefinition = Readonly<{
  code: string;
  name: string;
  symbol?: string;
  precision: number;
  roundingIncrement?: number;
  isBaseCurrency?: boolean;
}>;

export type ExchangeRate = Readonly<{
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveAt: string;
  source?: string | null;
}>;

export type Money = Readonly<{
  amount: number;
  currencyCode: string;
}>;

export type TaxDefinition = Readonly<{
  key: string;
  tenantId: string;
  label: string;
  calculationMode: TaxCalculationMode;
  isRecoverable?: boolean;
  isWithholding?: boolean;
}>;

export type TaxRate = Readonly<{
  taxKey: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}>;

export type TaxGroup = Readonly<{
  key: string;
  tenantId: string;
  label: string;
  taxKeys: readonly string[];
}>;

export type TaxLine = Readonly<{
  taxKey: string;
  taxableAmount: number;
  taxAmount: number;
  calculationMode: TaxCalculationMode;
}>;

export type PaymentMethod = Readonly<{
  key: string;
  tenantId: string;
  label: string;
  channel: PaymentChannel;
  requiresReference?: boolean;
}>;

export type PaymentTerms = Readonly<{
  key: string;
  tenantId: string;
  label: string;
  dueDays: number;
  discountDays?: number;
  discountPercent?: number;
}>;

export type FinancialNumberingScope = Readonly<{
  tenantId: string;
  moduleKey: string;
  documentType: string;
  companyId?: string | null;
  branchId?: string | null;
  fiscalYear?: string | null;
}>;

export type FinancialNumberingSequence = Readonly<{
  key: string;
  scope: FinancialNumberingScope;
  prefixTemplate?: string;
  suffixTemplate?: string;
  padding: number;
  nextValue: number;
  allowGaps?: boolean;
}>;

export type GeneratedFinancialDocumentNumber = Readonly<{
  value: string;
  sequenceKey: string;
  sequenceValue: number;
}>;

export type FinancialDimension = Readonly<{
  type: FinancialDimensionType;
  id: string;
  code?: string;
  label?: string;
}>;

export type FinancialDimensionSet = Partial<
  Readonly<Record<FinancialDimensionType, FinancialDimension>>
>;

export type FinancialEvent = Readonly<{
  idempotencyKey: string;
  tenantId: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  eventKey: string;
  lifecycleState: PostingLifecycleState;
  occurredAt: string;
  amount?: Money | null;
  dimensions?: FinancialDimensionSet;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PostingLifecycleTransition = Readonly<{
  from: PostingLifecycleState;
  to: PostingLifecycleState;
  requiredPermission?: PermissionKey;
  requiresAudit?: boolean;
}>;

export const POSTING_LIFECYCLE_TRANSITIONS = [
  { from: "draft", to: "submitted" },
  { from: "submitted", to: "approved" },
  { from: "approved", to: "posted" },
  { from: "draft", to: "cancelled" },
  { from: "submitted", to: "cancelled" },
  { from: "approved", to: "cancelled" },
  { from: "posted", to: "reversed" },
] as const satisfies readonly PostingLifecycleTransition[];

export function defineFiscalYear<TFiscalYear extends FiscalYear>(
  fiscalYear: TFiscalYear,
): TFiscalYear {
  return fiscalYear;
}

export function defineAccountingPeriod<TPeriod extends AccountingPeriod>(
  period: TPeriod,
): TPeriod {
  return period;
}

export function defineCurrency<TCurrency extends CurrencyDefinition>(
  currency: TCurrency,
): TCurrency {
  return currency;
}

export function defineTaxDefinition<TTax extends TaxDefinition>(tax: TTax): TTax {
  return tax;
}

export function defineTaxGroup<TGroup extends TaxGroup>(group: TGroup): TGroup {
  return group;
}

export function definePaymentMethod<TMethod extends PaymentMethod>(
  method: TMethod,
): TMethod {
  return method;
}

export function definePaymentTerms<TTerms extends PaymentTerms>(
  terms: TTerms,
): TTerms {
  return terms;
}

export function defineFinancialEvent<TEvent extends FinancialEvent>(event: TEvent): TEvent {
  return event;
}

export function defineFinancialNumberingSequence<TSequence extends FinancialNumberingSequence>(
  sequence: TSequence,
): TSequence {
  return sequence;
}

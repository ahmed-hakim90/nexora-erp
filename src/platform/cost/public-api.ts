export type CostMethod = "standard" | "weighted_average" | "fifo" | "specific_identification";

export type CostPolicy = Readonly<{
  key: string;
  tenantId: string;
  companyId?: string | null;
  method: CostMethod;
  currencyCode: string;
  allowNegativeCostLayers: boolean;
  closedPeriodPolicy: "block" | "adjustment_only";
}>;

export type CostEvent = Readonly<{
  idempotencyKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  productId?: string | null;
  quantity?: number | null;
  amount?: number | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}>;

export type CostLayer = Readonly<{
  id: string;
  productId: string;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  currencyCode: string;
}>;

export type CostCalculationRequest = Readonly<{
  policy: CostPolicy;
  event: CostEvent;
  availableLayers?: readonly CostLayer[];
}>;

export type CostCalculationResult = Readonly<{
  eventIdempotencyKey: string;
  unitCost: number;
  totalCost: number;
  currencyCode: string;
  consumedLayers: readonly CostLayer[];
  generatedLayers: readonly CostLayer[];
}>;

export type CostSnapshot = Readonly<{
  asOf: string;
  productId: string;
  quantity: number;
  totalCost: number;
  currencyCode: string;
}>;

export function defineCostPolicy<TPolicy extends CostPolicy>(policy: TPolicy): TPolicy {
  return policy;
}

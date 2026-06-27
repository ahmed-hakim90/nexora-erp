import "server-only";

import { ApplicationError } from "@/core/errors";

import type { CostCalculationRequest, CostCalculationResult } from "./public-api";

export function calculateCost(request: CostCalculationRequest): CostCalculationResult {
  const quantity = request.event.quantity ?? 0;
  const amount = request.event.amount ?? 0;

  if (!request.event.idempotencyKey) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Cost events require an idempotency key.",
    });
  }

  if (quantity < 0 && request.policy.closedPeriodPolicy === "block") {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Negative cost events require an adjustment policy.",
    });
  }

  const unitCost = quantity !== 0 ? amount / quantity : 0;

  return {
    consumedLayers: [],
    currencyCode: request.policy.currencyCode,
    eventIdempotencyKey: request.event.idempotencyKey,
    generatedLayers: [],
    totalCost: amount,
    unitCost,
  };
}

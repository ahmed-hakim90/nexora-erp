/**
 * MFG-02: resolve production standard by product × line × shift priority.
 */

import { PRODUCTION_STANDARD_RESOLUTION_PRIORITY } from "./rules/manufacturing-foundation.rules";

export type ProductionStandardCandidate = Readonly<{
  id: string;
  productId: string;
  productionLineId: string;
  shiftId: string | null;
  dailyTargetQty: number;
  standardCrewSize: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}>;

export type ProductionStandardResolveQuery = Readonly<{
  productId: string;
  productionLineId: string;
  shiftId?: string | null;
  asOf?: string;
}>;

function isEffective(standard: ProductionStandardCandidate, asOf: string) {
  if (!standard.isActive) return false;
  if (standard.effectiveFrom && standard.effectiveFrom > asOf) return false;
  if (standard.effectiveTo && standard.effectiveTo < asOf) return false;
  return true;
}

function shiftKey(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolution order matches PRODUCTION_STANDARD_RESOLUTION_PRIORITY:
 * 1. product + line + shift
 * 2. product + line (no shift)
 * 3. placeholder — no silent product-only invent; returns null if nothing matches
 */
export function resolveProductionStandard(
  candidates: readonly ProductionStandardCandidate[],
  query: ProductionStandardResolveQuery,
): ProductionStandardCandidate | null {
  const asOf = query.asOf ?? new Date().toISOString().slice(0, 10);
  const productId = String(query.productId).trim();
  const productionLineId = String(query.productionLineId).trim();
  const requestedShift = shiftKey(query.shiftId);

  const pool = candidates
    .filter((row) => row.productId === productId && row.productionLineId === productionLineId)
    .filter((row) => isEffective(row, asOf))
    .sort((left, right) => String(right.effectiveFrom).localeCompare(String(left.effectiveFrom)));

  void PRODUCTION_STANDARD_RESOLUTION_PRIORITY;

  if (requestedShift) {
    const withShift = pool.find((row) => shiftKey(row.shiftId) === requestedShift);
    if (withShift) return withShift;
  }

  const withoutShift = pool.find((row) => shiftKey(row.shiftId) == null);
  if (withoutShift) return withoutShift;

  return null;
}

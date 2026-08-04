/**
 * MFG-02: pure BOM explosion — finished quantity → component requirements.
 * Does not post inventory. Scrap expands theoretical consumption only.
 */

export type BomExplosionLineInput = Readonly<{
  lineId: string;
  lineNumber: number;
  componentProductId: string;
  quantity: number;
  uomId: string;
  scrapPercent: number;
  status: string;
}>;

export type BomExplosionRequirement = Readonly<{
  lineId: string;
  lineNumber: number;
  componentProductId: string;
  uomId: string;
  quantityPerFinished: number;
  scrapPercent: number;
  requiredQuantity: number;
}>;

export type BomExplosionResult = Readonly<{
  finishedQuantity: number;
  lineCount: number;
  requirements: readonly BomExplosionRequirement[];
}>;

const EXPLODABLE_LINE_STATUSES = new Set(["draft", "active"]);

function roundQty(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function isExplodableBomLineStatus(status: string) {
  return EXPLODABLE_LINE_STATUSES.has(String(status).trim().toLowerCase());
}

/**
 * required = finishedQty × line.quantity × (1 + scrapPercent / 100)
 */
export function explodeBomLines(finishedQuantity: number, lines: readonly BomExplosionLineInput[]): BomExplosionResult {
  if (!Number.isFinite(finishedQuantity) || finishedQuantity <= 0) {
    throw new Error("Finished quantity must be greater than zero.");
  }

  const requirements = lines
    .filter((line) => isExplodableBomLineStatus(line.status))
    .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0)
    .map((line) => {
      const scrapPercent = Number.isFinite(line.scrapPercent) ? Math.max(0, Math.min(100, line.scrapPercent)) : 0;
      const quantityPerFinished = roundQty(line.quantity * (1 + scrapPercent / 100));
      return {
        componentProductId: line.componentProductId,
        lineId: line.lineId,
        lineNumber: line.lineNumber,
        quantityPerFinished,
        requiredQuantity: roundQty(finishedQuantity * quantityPerFinished),
        scrapPercent,
        uomId: line.uomId,
      } satisfies BomExplosionRequirement;
    })
    .sort((left, right) => left.lineNumber - right.lineNumber);

  return {
    finishedQuantity,
    lineCount: requirements.length,
    requirements,
  };
}

/** Active BOM header is the approved planning version for MFG-02. */
export function isApprovedBomStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "active" || normalized === "released";
}

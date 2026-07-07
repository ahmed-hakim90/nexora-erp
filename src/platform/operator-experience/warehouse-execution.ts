import {
  createOxOperatorError,
  createOxWizardState,
  defineOxScannerContract,
  defineOxWizard,
  isRawIdentifier,
  normalizeOxScanValue,
  type OxOperatorError,
  type OxScanTarget,
  type OxScannerContract,
  type OxWizardState,
} from "./public-api";

export type WarehouseTransactionType = "goods_receipt" | "goods_issue" | "warehouse_transfer" | "cycle_count";

export type WarehouseFlowKey = "goods-receipt" | "goods-issue" | "warehouse-transfer" | "cycle-count";
export type WarehouseScanStepKey =
  | "document"
  | "source"
  | "source-location"
  | "product"
  | "quantity"
  | "location"
  | "destination"
  | "tracking"
  | "counted"
  | "variance"
  | "review";

export type WarehouseScanEntityType =
  | "document"
  | "product"
  | "location"
  | "warehouse"
  | "lot"
  | "serial";

export type WarehouseScanHistoryEntry = Readonly<{
  id: string;
  at: string;
  stepKey: WarehouseScanStepKey;
  scanTarget: OxScanTarget;
  scannedValue: string;
  resolvedLabel: string;
  outcome: "accepted" | "duplicate-merged" | "rejected";
}>;

export type WarehouseExecutionLine = Readonly<{
  key: string;
  productId: string;
  productLabel: string;
  unitId: string;
  quantity: number;
  sourceWarehouseId?: string | null;
  sourceLocationId?: string | null;
  sourceLocationLabel?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  destinationLocationLabel?: string | null;
  lotKey?: string | null;
  serialKey?: string | null;
  expectedQuantity?: number | null;
  countedQuantity?: number | null;
  variance?: number | null;
}>;

export type WarehouseExecutionDraft = Readonly<{
  flowKey: WarehouseFlowKey;
  branchId: string;
  title: string;
  transactionDate: string;
  documentId?: string | null;
  documentLabel?: string | null;
  sourceWarehouseId?: string | null;
  sourceWarehouseLabel?: string | null;
  sourceLocationId?: string | null;
  sourceLocationLabel?: string | null;
  destinationWarehouseId?: string | null;
  destinationWarehouseLabel?: string | null;
  destinationLocationId?: string | null;
  destinationLocationLabel?: string | null;
  activeStepKey: WarehouseScanStepKey;
  completedStepKeys: readonly string[];
  lines: readonly WarehouseExecutionLine[];
  scanHistory: readonly WarehouseScanHistoryEntry[];
  currentProductId?: string | null;
  currentProductLabel?: string | null;
  currentUnitId?: string | null;
  currentQuantity: number;
  currentLotKey?: string | null;
  currentSerialKey?: string | null;
  currentExpectedQuantity?: number | null;
  currentCountedQuantity?: number | null;
  updatedAt: string;
}>;

export type WarehouseCatalogProduct = Readonly<{
  id: string;
  label: string;
  sku: string;
  barcode?: string | null;
  unitId: string;
  hasLotTracking: boolean;
  hasSerialTracking: boolean;
}>;

export type WarehouseExecutionCatalog = Readonly<{
  products: readonly WarehouseCatalogProduct[];
  locations: readonly { id: string; label: string; locationKey: string; warehouseId?: string | null }[];
  warehouses: readonly { id: string; label: string; warehouseKey: string }[];
  lots: readonly { id: string; label: string; lotKey: string; productId: string }[];
  serials: readonly { id: string; label: string; serialKey: string; productId: string }[];
  documents: readonly { id: string; label: string; documentKey: string }[];
}>;

export type WarehouseFlowStep = Readonly<{
  key: WarehouseScanStepKey;
  label: string;
  description: string;
  scanTarget?: OxScanTarget;
  allowManualFallback: boolean;
  canSaveDraft: boolean;
}>;

export type WarehouseFlowDefinition = Readonly<{
  key: WarehouseFlowKey;
  transactionType: WarehouseTransactionType;
  label: string;
  description: string;
  steps: readonly WarehouseFlowStep[];
}>;

export const OX_WAREHOUSE_SCANNER_CONTRACTS = [
  defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "warehouse.scan-product",
    label: "Scan product",
    lookupProviderKey: "inventory.products.lookup",
    normalize: "uppercase-trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "product",
  }),
  defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "warehouse.scan-location",
    label: "Scan location",
    lookupProviderKey: "inventory.locations.lookup",
    normalize: "uppercase-trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "warehouse-location",
  }),
  defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "warehouse.scan-lot",
    label: "Scan lot",
    lookupProviderKey: "inventory.lots.lookup",
    normalize: "uppercase-trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "lot",
  }),
  defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "warehouse.scan-serial",
    label: "Scan serial",
    lookupProviderKey: "inventory.serials.lookup",
    normalize: "uppercase-trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "serial",
  }),
  defineOxScannerContract({
    inputPriority: "scanner-first",
    key: "warehouse.scan-transfer-document",
    label: "Scan transfer document",
    lookupProviderKey: "inventory.transactions.lookup",
    normalize: "trim",
    supportedSymbologies: ["barcode", "qr", "keyboard-wedge"],
    target: "transfer-document",
  }),
] as const satisfies readonly OxScannerContract[];

export const WAREHOUSE_EXECUTION_FLOWS: Record<WarehouseFlowKey, WarehouseFlowDefinition> = {
  "cycle-count": {
    description: "Scan location and product, enter counted quantity, and review variance.",
    key: "cycle-count",
    label: "Cycle Count",
    steps: [
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the bin or shelf location to count.", key: "location", label: "Scan location", scanTarget: "warehouse-location" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the product barcode or SKU.", key: "product", label: "Scan product", scanTarget: "product" },
      { allowManualFallback: true, canSaveDraft: true, description: "Enter the counted quantity.", key: "counted", label: "Counted quantity" },
      { allowManualFallback: false, canSaveDraft: true, description: "Review expected quantity and variance.", key: "variance", label: "Variance" },
      { allowManualFallback: false, canSaveDraft: true, description: "Review count lines before saving.", key: "review", label: "Review" },
    ],
    transactionType: "cycle_count",
  },
  "goods-issue": {
    description: "Scan source location, product, quantity, and optional lot/serial before issuing stock.",
    key: "goods-issue",
    label: "Goods Issue",
    steps: [
      { allowManualFallback: true, canSaveDraft: true, description: "Scan an issue document or reference.", key: "document", label: "Scan document", scanTarget: "transfer-document" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the source bin or shelf.", key: "source-location", label: "Scan source location", scanTarget: "warehouse-location" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the product barcode or SKU.", key: "product", label: "Scan product", scanTarget: "product" },
      { allowManualFallback: true, canSaveDraft: true, description: "Confirm issue quantity.", key: "quantity", label: "Confirm quantity" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan lot or serial when product tracking requires it.", key: "tracking", label: "Lot / serial", scanTarget: "lot" },
      { allowManualFallback: false, canSaveDraft: true, description: "Review issue lines before submit.", key: "review", label: "Review" },
    ],
    transactionType: "goods_issue",
  },
  "goods-receipt": {
    description: "Scan receipt document, product, quantity, location, and optional lot/serial.",
    key: "goods-receipt",
    label: "Goods Receipt",
    steps: [
      { allowManualFallback: true, canSaveDraft: true, description: "Scan purchase order or receipt document.", key: "document", label: "Scan document", scanTarget: "transfer-document" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the product barcode or SKU.", key: "product", label: "Scan product", scanTarget: "product" },
      { allowManualFallback: true, canSaveDraft: true, description: "Confirm received quantity.", key: "quantity", label: "Confirm quantity" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan destination bin or shelf.", key: "location", label: "Scan location", scanTarget: "warehouse-location" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan lot or serial when product tracking requires it.", key: "tracking", label: "Lot / serial", scanTarget: "lot" },
      { allowManualFallback: false, canSaveDraft: true, description: "Review receipt lines before submit.", key: "review", label: "Review" },
    ],
    transactionType: "goods_receipt",
  },
  "warehouse-transfer": {
    description: "Select source, scan product and quantity, then scan destination location.",
    key: "warehouse-transfer",
    label: "Warehouse Transfer",
    steps: [
      { allowManualFallback: true, canSaveDraft: true, description: "Scan or choose source warehouse and location.", key: "source", label: "Source location", scanTarget: "warehouse-location" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan the product barcode or SKU.", key: "product", label: "Scan product", scanTarget: "product" },
      { allowManualFallback: true, canSaveDraft: true, description: "Confirm transfer quantity.", key: "quantity", label: "Confirm quantity" },
      { allowManualFallback: true, canSaveDraft: true, description: "Scan destination bin or shelf.", key: "destination", label: "Destination location", scanTarget: "warehouse-location" },
      { allowManualFallback: false, canSaveDraft: true, description: "Review transfer lines before submit.", key: "review", label: "Review" },
    ],
    transactionType: "warehouse_transfer",
  },
};

const WAREHOUSE_WIZARDS = {
  "cycle-count": defineOxWizard({
    key: "warehouse.cycle-count",
    label: WAREHOUSE_EXECUTION_FLOWS["cycle-count"].label,
    reviewBeforeSubmit: true,
    supportsDraft: true,
    supportsResume: true,
    taskKey: "cycle-count",
    steps: WAREHOUSE_EXECUTION_FLOWS["cycle-count"].steps.map((step) => ({
      canSaveDraft: step.canSaveDraft,
      description: step.description,
      key: step.key,
      label: step.label,
      requiredFieldNames: [],
      validationScope: "step" as const,
    })),
  }),
  "goods-issue": defineOxWizard({
    key: "warehouse.goods-issue",
    label: WAREHOUSE_EXECUTION_FLOWS["goods-issue"].label,
    reviewBeforeSubmit: true,
    supportsDraft: true,
    supportsResume: true,
    taskKey: "goods-issue",
    steps: WAREHOUSE_EXECUTION_FLOWS["goods-issue"].steps.map((step) => ({
      canSaveDraft: step.canSaveDraft,
      description: step.description,
      key: step.key,
      label: step.label,
      requiredFieldNames: [],
      validationScope: "step" as const,
    })),
  }),
  "goods-receipt": defineOxWizard({
    key: "warehouse.goods-receipt",
    label: WAREHOUSE_EXECUTION_FLOWS["goods-receipt"].label,
    reviewBeforeSubmit: true,
    supportsDraft: true,
    supportsResume: true,
    taskKey: "goods-receipt",
    steps: WAREHOUSE_EXECUTION_FLOWS["goods-receipt"].steps.map((step) => ({
      canSaveDraft: step.canSaveDraft,
      description: step.description,
      key: step.key,
      label: step.label,
      requiredFieldNames: [],
      validationScope: "step" as const,
    })),
  }),
  "warehouse-transfer": defineOxWizard({
    key: "warehouse.warehouse-transfer",
    label: WAREHOUSE_EXECUTION_FLOWS["warehouse-transfer"].label,
    reviewBeforeSubmit: true,
    supportsDraft: true,
    supportsResume: true,
    taskKey: "warehouse-transfer",
    steps: WAREHOUSE_EXECUTION_FLOWS["warehouse-transfer"].steps.map((step) => ({
      canSaveDraft: step.canSaveDraft,
      description: step.description,
      key: step.key,
      label: step.label,
      requiredFieldNames: [],
      validationScope: "step" as const,
    })),
  }),
} satisfies Record<WarehouseFlowKey, ReturnType<typeof defineOxWizard>>;

export function warehouseFlowForTransactionSlug(slug: string): WarehouseFlowDefinition | null {
  return WAREHOUSE_EXECUTION_FLOWS[slug as WarehouseFlowKey] ?? null;
}

export function warehouseDraftStorageKey(flowKey: WarehouseFlowKey, branchId: string) {
  return `nexora.warehouse-draft.${flowKey}.${branchId}`;
}

export function createWarehouseExecutionDraft(input: Readonly<{
  flowKey: WarehouseFlowKey;
  branchId: string;
  title?: string;
  transactionDate?: string;
}>): WarehouseExecutionDraft {
  const flow = WAREHOUSE_EXECUTION_FLOWS[input.flowKey];
  return {
    activeStepKey: flow.steps[0]?.key ?? "review",
    branchId: input.branchId,
    completedStepKeys: [],
    currentQuantity: 1,
    flowKey: input.flowKey,
    lines: [],
    scanHistory: [],
    title: input.title ?? flow.label,
    transactionDate: input.transactionDate ?? new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

export function warehouseWizardState(draft: WarehouseExecutionDraft): OxWizardState {
  return createOxWizardState(WAREHOUSE_WIZARDS[draft.flowKey], draft.completedStepKeys, draft.activeStepKey);
}

function normalizeCode(value: string, mode: "uppercase-trim" | "trim" = "uppercase-trim") {
  return normalizeOxScanValue(value, mode);
}

function productIndex(catalog: WarehouseExecutionCatalog) {
  const bySku = new Map<string, WarehouseCatalogProduct>();
  const byBarcode = new Map<string, WarehouseCatalogProduct>();
  const byId = new Map<string, WarehouseCatalogProduct>();
  for (const product of catalog.products) {
    byId.set(product.id, product);
    bySku.set(normalizeCode(product.sku), product);
    if (product.barcode) byBarcode.set(normalizeCode(product.barcode), product);
  }
  return { byBarcode, byId, bySku };
}

export function resolveWarehouseScan(
  target: OxScanTarget,
  rawValue: string,
  catalog: WarehouseExecutionCatalog,
): Readonly<{ entityType: WarehouseScanEntityType; id: string; label: string; metadata?: Record<string, unknown> }> | OxOperatorError {
  const value = rawValue.trim();
  if (!value) {
    return createOxOperatorError({
      code: "SCAN_EMPTY",
      fieldLabel: "Scan",
      fix: "Scan a valid barcode or enter a business code, then press Enter.",
      problem: "No scan value was detected.",
      reason: "The scanner sent an empty value.",
    });
  }
  if (isRawIdentifier(value)) {
    return createOxOperatorError({
      code: "SCAN_RAW_ID_REJECTED",
      fieldLabel: "Scan",
      fix: "Scan the printed barcode or search by SKU, location code, or document number.",
      problem: "Raw system identifiers cannot be scanned.",
      reason: "Manual UUID entry is blocked in operator workflows.",
    });
  }

  const normalized = normalizeCode(value, target === "transfer-document" ? "trim" : "uppercase-trim");
  const products = productIndex(catalog);

  if (target === "product") {
    const product = products.bySku.get(normalized) ?? products.byBarcode.get(normalized) ?? catalog.products.find((item) => normalizeCode(item.label).includes(normalized));
    if (!product) {
      return createOxOperatorError({
        code: "PRODUCT_NOT_FOUND",
        fieldLabel: "Product",
        fix: "Scan the product barcode, type the SKU, or use manual product search.",
        problem: "Product was not recognized.",
        reason: `No product matches "${value}".`,
      });
    }
    return { entityType: "product", id: product.id, label: product.label, metadata: { unitId: product.unitId, hasLotTracking: product.hasLotTracking, hasSerialTracking: product.hasSerialTracking } };
  }

  if (target === "warehouse-location") {
    const location = catalog.locations.find((item) => normalizeCode(item.locationKey) === normalized || normalizeCode(item.label).includes(normalized));
    if (!location) {
      return createOxOperatorError({
        code: "LOCATION_NOT_FOUND",
        fieldLabel: "Location",
        fix: "Scan the location label or choose the location manually.",
        problem: "Location was not recognized.",
        reason: `No location matches "${value}".`,
      });
    }
    return { entityType: "location", id: location.id, label: location.label, metadata: { warehouseId: location.warehouseId } };
  }

  if (target === "lot") {
    const lot = catalog.lots.find((item) => normalizeCode(item.lotKey) === normalized);
    if (!lot) {
      return createOxOperatorError({
        code: "LOT_NOT_FOUND",
        fieldLabel: "Lot",
        fix: "Scan the lot label or enter the lot code manually if permitted.",
        problem: "Lot was not recognized.",
        reason: `No lot matches "${value}".`,
      });
    }
    return { entityType: "lot", id: lot.id, label: lot.label, metadata: { productId: lot.productId, lotKey: lot.lotKey } };
  }

  if (target === "serial") {
    const serial = catalog.serials.find((item) => normalizeCode(item.serialKey) === normalized);
    if (!serial) {
      return createOxOperatorError({
        code: "SERIAL_NOT_FOUND",
        fieldLabel: "Serial",
        fix: "Scan the serial label or enter the serial number manually if permitted.",
        problem: "Serial was not recognized.",
        reason: `No serial matches "${value}".`,
      });
    }
    return { entityType: "serial", id: serial.id, label: serial.label, metadata: { productId: serial.productId, serialKey: serial.serialKey } };
  }

  if (target === "transfer-document") {
    const document = catalog.documents.find((item) => normalizeCode(item.documentKey, "trim") === normalizeCode(value, "trim") || item.label.toLowerCase().includes(value.toLowerCase()));
    if (!document) {
      return createOxOperatorError({
        code: "DOCUMENT_NOT_FOUND",
        fieldLabel: "Document",
        fix: "Scan the document barcode or select the purchase order manually.",
        problem: "Document was not recognized.",
        reason: `No receipt document matches "${value}".`,
      });
    }
    return { entityType: "document", id: document.id, label: document.label, metadata: { documentKey: document.documentKey } };
  }

  return createOxOperatorError({
    code: "SCAN_TARGET_UNSUPPORTED",
    fieldLabel: "Scan",
    fix: "Use the scanner for the current step only.",
    problem: "This scan type is not supported on the current step.",
    reason: `Target "${target}" is not configured.`,
  });
}

function lineIdentity(draft: WarehouseExecutionDraft, line: WarehouseExecutionLine) {
  return [
    line.productId,
    line.sourceLocationId ?? draft.sourceLocationId ?? "",
    line.destinationLocationId ?? draft.destinationLocationId ?? "",
    line.lotKey ?? draft.currentLotKey ?? "",
    line.serialKey ?? draft.currentSerialKey ?? "",
  ].join("|");
}

export function mergeDuplicateWarehouseLine(
  draft: WarehouseExecutionDraft,
  candidate: WarehouseExecutionLine,
): Readonly<{ draft: WarehouseExecutionDraft; merged: boolean; lineKey: string }> {
  const candidateIdentity = lineIdentity(draft, candidate);
  const existingIndex = draft.lines.findIndex((line) => lineIdentity(draft, line) === candidateIdentity);
  if (existingIndex === -1) {
    return { draft: { ...draft, lines: [...draft.lines, candidate], updatedAt: new Date().toISOString() }, lineKey: candidate.key, merged: false };
  }
  const existing = draft.lines[existingIndex];
  const nextLine = { ...existing, quantity: existing.quantity + candidate.quantity };
  const lines = [...draft.lines];
  lines[existingIndex] = nextLine;
  return { draft: { ...draft, lines, updatedAt: new Date().toISOString() }, lineKey: nextLine.key, merged: true };
}

export function appendScanHistory(
  draft: WarehouseExecutionDraft,
  entry: Omit<WarehouseScanHistoryEntry, "id" | "at">,
): WarehouseExecutionDraft {
  const historyEntry: WarehouseScanHistoryEntry = {
    ...entry,
    at: new Date().toISOString(),
    id: `${entry.stepKey}:${entry.scannedValue}:${draft.scanHistory.length + 1}`,
  };
  return {
    ...draft,
    scanHistory: [historyEntry, ...draft.scanHistory].slice(0, 12),
    updatedAt: new Date().toISOString(),
  };
}

export function advanceWarehouseStep(draft: WarehouseExecutionDraft): WarehouseExecutionDraft {
  const flow = WAREHOUSE_EXECUTION_FLOWS[draft.flowKey];
  const completed = new Set(draft.completedStepKeys);
  completed.add(draft.activeStepKey);
  const nextStep = flow.steps.find((step) => !completed.has(step.key)) ?? flow.steps.at(-1);
  return {
    ...draft,
    activeStepKey: nextStep?.key ?? "review",
    completedStepKeys: [...completed],
    updatedAt: new Date().toISOString(),
  };
}

export function warehouseLineFromDraft(draft: WarehouseExecutionDraft): WarehouseExecutionLine | null {
  if (!draft.currentProductId || !draft.currentUnitId) return null;
  const productLabel = draft.currentProductLabel ?? "Product";
  const key = `${draft.currentProductId}:${draft.sourceLocationId ?? ""}:${draft.destinationLocationId ?? ""}:${draft.currentLotKey ?? ""}:${draft.currentSerialKey ?? ""}:${Date.now()}`;
  const base = {
    key,
    productId: draft.currentProductId,
    productLabel,
    quantity: draft.currentQuantity,
    unitId: draft.currentUnitId,
    lotKey: draft.currentLotKey ?? null,
    serialKey: draft.currentSerialKey ?? null,
  };

  if (draft.flowKey === "goods-receipt") {
    return {
      ...base,
      destinationLocationId: draft.destinationLocationId ?? null,
      destinationLocationLabel: draft.destinationLocationLabel ?? null,
      destinationWarehouseId: draft.destinationWarehouseId ?? null,
    };
  }
  if (draft.flowKey === "goods-issue") {
    return {
      ...base,
      sourceLocationId: draft.sourceLocationId ?? null,
      sourceLocationLabel: draft.sourceLocationLabel ?? null,
      sourceWarehouseId: draft.sourceWarehouseId ?? null,
    };
  }
  if (draft.flowKey === "warehouse-transfer") {
    return {
      ...base,
      destinationLocationId: draft.destinationLocationId ?? null,
      destinationLocationLabel: draft.destinationLocationLabel ?? null,
      destinationWarehouseId: draft.destinationWarehouseId ?? null,
      sourceLocationId: draft.sourceLocationId ?? null,
      sourceLocationLabel: draft.sourceLocationLabel ?? null,
      sourceWarehouseId: draft.sourceWarehouseId ?? null,
    };
  }
  return {
    ...base,
    countedQuantity: draft.currentCountedQuantity ?? draft.currentQuantity,
    destinationLocationId: draft.destinationLocationId ?? null,
    destinationLocationLabel: draft.destinationLocationLabel ?? null,
    expectedQuantity: draft.currentExpectedQuantity ?? null,
    variance: (draft.currentCountedQuantity ?? draft.currentQuantity) - (draft.currentExpectedQuantity ?? 0),
  };
}

export function serializeWarehouseDraft(draft: WarehouseExecutionDraft): string {
  return JSON.stringify(draft);
}

export function parseWarehouseDraft(raw: string): WarehouseExecutionDraft | null {
  try {
    const parsed = JSON.parse(raw) as WarehouseExecutionDraft;
    if (!parsed.flowKey || !parsed.branchId) return null;
    return parsed;
  } catch {
    return null;
  }
}

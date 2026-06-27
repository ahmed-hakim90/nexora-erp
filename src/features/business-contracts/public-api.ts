import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveTenantRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  createInventoryFoundationService,
  createInventoryTransactionServices,
  INVENTORY_PERMISSIONS,
  type InventoryTransactionDetail,
  type StockLedgerDirection,
  type StockMovementTypeKey,
} from "@/features/inventory/public-api";
import { createPurchasingService, type PurchaseDocumentDetail, type PurchaseStatus } from "@/features/purchasing/public-api";
import { createProductService } from "@/features/products/public-api";
import {
  createBusinessDocumentServices,
  type BusinessDocumentRecord,
  type DocumentApprovalStatus,
} from "@/features/business-documents/public-api";

export type InventoryAvailabilityKeyDTO = Readonly<{
  productId: string;
  warehouseId: string;
  locationId: string;
  unitId: string;
  lotId?: string | null;
  serialId?: string | null;
}>;

export type StockAvailabilitySnapshotDTO = InventoryAvailabilityKeyDTO & Readonly<{
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  asOf: string;
}>;

export type StockAvailabilityCheckDTO = StockAvailabilitySnapshotDTO & Readonly<{
  requestedQuantity: number;
  isAvailable: boolean;
}>;

export type StockReservationCheckDTO = StockAvailabilityCheckDTO & Readonly<{
  canReserve: boolean;
  reservationPostingSupported: false;
}>;

export type InventoryReservationDTO = InventoryAvailabilityKeyDTO & Readonly<{
  reservationId: string;
  status: "draft" | "not_supported" | "released" | "cancelled";
  quantity: number;
  isPersisted: false;
  message: string | null;
}>;

export type InventoryPostingLineDTO = Readonly<{
  movementTypeKey: StockMovementTypeKey;
  productId: string;
  warehouseId: string;
  locationId: string;
  lotId?: string | null;
  serialId?: string | null;
  unitId: string;
  quantity: number;
  direction: StockLedgerDirection;
  unitCost?: number;
  totalCost?: number;
  metadata?: Record<string, unknown>;
}>;

export type InventoryPostingStatusDTO = Readonly<{
  inventoryTransactionId: string;
  status: string;
  isPosted: boolean;
  isReversed: boolean;
  postingBatchId: string | null;
  reversalPostingBatchId: string | null;
}>;

export type PurchaseOrderReceivingStatusDTO = Readonly<{
  purchaseOrderId: string;
  status: PurchaseStatus;
  isOpenForReceiving: boolean;
  isFullyReceived: boolean;
  lines: readonly OpenPurchaseOrderLineDTO[];
}>;

export type OpenPurchaseOrderLineDTO = Readonly<{
  purchaseOrderLineId: string;
  productId: string;
  unitId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  openQuantity: number;
  unitPrice: number;
}>;

export type ReceivePurchaseOrderLinesInputDTO = Readonly<{
  purchaseOrderId: string;
  destinationWarehouseId: string;
  destinationLocationId: string;
  idempotencyKey: string;
  documentDate?: string | null;
  title?: string;
  lines: readonly {
    purchaseOrderLineId: string;
    quantity: number;
  }[];
}>;

export type PurchaseReceiptDTO = Readonly<{
  receiptId: string;
  purchaseOrderId: string;
  status: PurchaseStatus;
  inventoryTransactionId: string | null;
  lines: readonly {
    receiptLineId: string;
    purchaseOrderLineId: string | null;
    productId: string;
    unitId: string;
    quantity: number;
  }[];
}>;

export type ProductForBusinessUseDTO = Readonly<{
  productId: string;
  sku: string | null;
  nameAr: string | null;
  nameEn: string | null;
  productType: string | null;
  baseUnitId: string | null;
  defaultPurchaseUnitId: string | null;
  defaultSalesUnitId: string | null;
  isActive: boolean;
  isStockable: boolean;
  isPurchasable: boolean;
  isSellable: boolean;
  isManufacturable: boolean;
}>;

export type ProductCapabilityValidationDTO = Readonly<{
  productId: string;
  capability: "stockable" | "purchasable" | "sellable" | "manufacturable";
  isValid: boolean;
  message: string | null;
}>;

export type BusinessDocumentShellInputDTO = Readonly<{
  branchId?: string | null;
  documentTypeKey: string;
  title: string;
  status?: string;
  workflowStatus?: string | null;
  approvalStatus?: DocumentApprovalStatus;
  ownerUserId?: string | null;
  sourceModule?: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  fiscalYear?: string | null;
  metadata?: Record<string, unknown>;
  issuedAt?: string | null;
}>;

export type BusinessDocumentStatusDTO = Readonly<{
  documentId: string;
  documentNumber: string;
  documentTypeKey: string;
  status: string;
  workflowStatus: string | null;
  approvalStatus: DocumentApprovalStatus;
  sourceModule: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  version: number;
}>;

export type TransitionBusinessDocumentInputDTO = Readonly<{
  documentId: string;
  status: string;
  workflowStatus?: string | null;
  approvalStatus?: DocumentApprovalStatus;
  metadata?: Record<string, unknown>;
}>;

export type AttachDocumentReferenceInputDTO = Readonly<{
  documentId: string;
  referenceType: string;
  referenceId: string;
  referenceRole: string;
  metadata?: Record<string, unknown>;
}>;

export type DocumentReferenceAttachmentDTO = Readonly<{
  documentId: string;
  referenceId: string;
}>;

export async function getStockAvailabilitySnapshot(input: InventoryAvailabilityKeyDTO): Promise<StockAvailabilitySnapshotDTO> {
  await assertTenantContext();
  const inventory = await createInventoryFoundationService();
  const balances = await inventory.listStockBalances({ pageSize: 100, search: input.productId });
  const balance = balances.records.find((record) => stockKeyMatches(record, input));

  return {
    ...input,
    lotId: input.lotId ?? null,
    quantityAvailable: balance?.quantityAvailable ?? 0,
    quantityOnHand: balance?.quantityOnHand ?? 0,
    quantityReserved: balance?.quantityReserved ?? 0,
    serialId: input.serialId ?? null,
    asOf: balance?.lastMovementAt ?? new Date().toISOString(),
  };
}

export async function checkAvailableStock(input: InventoryAvailabilityKeyDTO & { quantity: number }): Promise<StockAvailabilityCheckDTO> {
  assertPositiveQuantity(input.quantity, "Available stock check quantity must be positive.");
  const snapshot = await getStockAvailabilitySnapshot(input);

  return {
    ...snapshot,
    requestedQuantity: input.quantity,
    isAvailable: snapshot.quantityAvailable >= input.quantity,
  };
}

export async function checkCanReserveStock(input: InventoryAvailabilityKeyDTO & { quantity: number }): Promise<StockReservationCheckDTO> {
  const availability = await checkAvailableStock(input);

  return {
    ...availability,
    canReserve: availability.isAvailable,
    reservationPostingSupported: false,
  };
}

export async function createReservationDraft(
  input: InventoryAvailabilityKeyDTO & { quantity: number; idempotencyKey?: string | null },
): Promise<InventoryReservationDTO> {
  const availability = await checkCanReserveStock(input);
  if (!availability.canReserve) {
    throw new ApplicationError({ code: "BUSINESS_RULE_VIOLATION", message: "Requested stock is not available for reservation." });
  }

  return {
    ...input,
    lotId: input.lotId ?? null,
    serialId: input.serialId ?? null,
    reservationId: input.idempotencyKey?.trim() || `reservation-draft:${input.productId}:${input.warehouseId}:${input.locationId}:${input.unitId}`,
    status: "draft",
    quantity: input.quantity,
    isPersisted: false,
    message: "Inventory reservations are exposed as draft-only contracts until persisted reservations are supported.",
  };
}

export async function confirmReservation(input: { reservationId: string }): Promise<InventoryReservationDTO> {
  const context = await assertTenantContext();
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.stockPost });
  return unsupportedReservation(input.reservationId);
}

export async function releaseReservation(input: { reservationId: string }): Promise<InventoryReservationDTO> {
  const context = await assertTenantContext();
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.stockReverse });
  return { ...unsupportedReservation(input.reservationId), status: "released" };
}

export async function cancelReservation(input: { reservationId: string }): Promise<InventoryReservationDTO> {
  const context = await assertTenantContext();
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.stockPost });
  return { ...unsupportedReservation(input.reservationId), status: "cancelled" };
}

export async function postInventoryTransaction(input: { inventoryTransactionId: string; idempotencyKey: string }): Promise<InventoryPostingStatusDTO> {
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.post(input.inventoryTransactionId, { idempotencyKey: input.idempotencyKey });
  return getPostingStatus({ inventoryTransactionId: input.inventoryTransactionId });
}

export async function reverseInventoryPosting(input: { inventoryTransactionId: string; idempotencyKey: string }): Promise<InventoryPostingStatusDTO> {
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.reverse(input.inventoryTransactionId, { idempotencyKey: input.idempotencyKey });
  return getPostingStatus({ inventoryTransactionId: input.inventoryTransactionId });
}

export async function getPostingStatus(input: { inventoryTransactionId: string }): Promise<InventoryPostingStatusDTO> {
  const { transactionService } = await createInventoryTransactionServices();
  return toPostingStatus(await transactionService.read(input.inventoryTransactionId));
}

export async function getPurchaseOrderReceivingStatus(input: { purchaseOrderId: string }): Promise<PurchaseOrderReceivingStatusDTO> {
  const purchasing = await createPurchasingService();
  const detail = await purchasing.read("order", input.purchaseOrderId);
  const lines = toOpenPurchaseOrderLines(detail);

  return {
    purchaseOrderId: detail.document.id,
    status: detail.document.status,
    isOpenForReceiving: ["confirmed", "partially_received"].includes(detail.document.status),
    isFullyReceived: lines.every((line) => line.openQuantity <= 0),
    lines,
  };
}

export async function getOpenPurchaseOrderLines(input: { purchaseOrderId: string }): Promise<readonly OpenPurchaseOrderLineDTO[]> {
  const status = await getPurchaseOrderReceivingStatus(input);
  return status.lines.filter((line) => line.openQuantity > 0);
}

export async function receivePurchaseOrderLines(input: ReceivePurchaseOrderLinesInputDTO): Promise<PurchaseReceiptDTO> {
  assertIdempotencyKey(input.idempotencyKey, "Purchase receipt posting requires an idempotency key.");
  const purchasing = await createPurchasingService();
  const order = await purchasing.read("order", input.purchaseOrderId);
  if (!order.document.supplierId) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase order must have a supplier before receiving." });
  }

  const openLinesById = new Map(toOpenPurchaseOrderLines(order).map((line) => [line.purchaseOrderLineId, line]));
  const receiptLines = input.lines.map((line) => {
    assertPositiveQuantity(line.quantity, "Purchase receipt line quantity must be positive.");
    const openLine = openLinesById.get(line.purchaseOrderLineId);
    if (!openLine || openLine.openQuantity <= 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt line must reference an open purchase order line." });
    }
    if (line.quantity > openLine.openQuantity) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Purchase receipt quantity cannot exceed open purchase order quantity." });
    }

    return {
      productId: openLine.productId,
      purchaseOrderLineId: openLine.purchaseOrderLineId,
      quantity: line.quantity,
      unitId: openLine.unitId,
      unitPrice: openLine.unitPrice,
    };
  });

  const receipt = await purchasing.create("receipt", {
    branchId: order.document.branchId,
    destinationLocationId: input.destinationLocationId,
    destinationWarehouseId: input.destinationWarehouseId,
    documentDate: input.documentDate,
    lines: receiptLines,
    purchaseOrderId: order.document.id,
    supplierId: order.document.supplierId,
    title: input.title?.trim() || `Receipt for ${order.document.title}`,
  });

  await purchasing.transition("receipt", receipt.document.id, "submitted");
  const postedReceipt = await purchasing.postReceipt(receipt.document.id, { idempotencyKey: input.idempotencyKey });
  return toPurchaseReceiptDTO({ document: postedReceipt, lines: receipt.lines });
}

export async function reversePurchaseReceipt(input: { receiptId: string; idempotencyKey: string }): Promise<PurchaseReceiptDTO> {
  assertIdempotencyKey(input.idempotencyKey, "Purchase receipt reversal requires an idempotency key.");
  const purchasing = await createPurchasingService();
  const reversedReceipt = await purchasing.reverseReceipt(input.receiptId, { idempotencyKey: input.idempotencyKey });
  const detail = await purchasing.read("receipt", input.receiptId);
  return toPurchaseReceiptDTO({ document: reversedReceipt, lines: detail.lines });
}

export async function getProductForBusinessUse(input: { productId: string }): Promise<ProductForBusinessUseDTO> {
  await assertTenantContext();
  const product = await (await createProductService()).read(input.productId);

  return {
    productId: product.id,
    sku: product.sku,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    productType: product.productType,
    baseUnitId: product.unitId,
    defaultPurchaseUnitId: product.defaultPurchaseUnitId,
    defaultSalesUnitId: product.defaultSalesUnitId,
    isActive: product.isActive,
    isStockable: product.isStockable,
    isPurchasable: product.isPurchasable,
    isSellable: product.isSellable,
    isManufacturable: product.isManufacturable,
  };
}

export async function validateProductIsStockable(input: { productId: string }): Promise<ProductCapabilityValidationDTO> {
  return validateProductCapability(input.productId, "stockable");
}

export async function validateProductIsPurchasable(input: { productId: string }): Promise<ProductCapabilityValidationDTO> {
  return validateProductCapability(input.productId, "purchasable");
}

export async function validateProductIsSellable(input: { productId: string }): Promise<ProductCapabilityValidationDTO> {
  return validateProductCapability(input.productId, "sellable");
}

export async function validateProductIsManufacturable(input: { productId: string }): Promise<ProductCapabilityValidationDTO> {
  return validateProductCapability(input.productId, "manufacturable");
}

export async function createBusinessDocumentShell(input: BusinessDocumentShellInputDTO): Promise<BusinessDocumentStatusDTO> {
  const { documentService } = await createBusinessDocumentServices();
  return toDocumentStatus(await documentService.createShell(input));
}

export async function transitionBusinessDocument(input: TransitionBusinessDocumentInputDTO): Promise<BusinessDocumentStatusDTO> {
  const { documentService } = await createBusinessDocumentServices();
  return toDocumentStatus(await documentService.changeStatus(input.documentId, {
    approvalStatus: input.approvalStatus,
    metadata: input.metadata,
    status: input.status,
    workflowStatus: input.workflowStatus,
  }));
}

export async function attachDocumentReference(input: AttachDocumentReferenceInputDTO): Promise<DocumentReferenceAttachmentDTO> {
  const { referenceService } = await createBusinessDocumentServices();
  const reference = await referenceService.addReference(input.documentId, {
    metadata: input.metadata,
    referenceId: input.referenceId,
    referenceRole: input.referenceRole,
    referenceType: input.referenceType,
  });
  return { documentId: input.documentId, referenceId: reference.id };
}

export async function getDocumentStatus(input: { documentId: string }): Promise<BusinessDocumentStatusDTO> {
  const { documentService } = await createBusinessDocumentServices();
  return toDocumentStatus(await documentService.read(input.documentId));
}

async function assertTenantContext() {
  const context = await resolveTenantRequestContext("erp");
  if (!context.tenantId) {
    throw new ApplicationError({ code: "AUTHORIZATION_ERROR", message: "Business contracts require tenant context." });
  }
  return context;
}

function assertPositiveQuantity(quantity: number, message: string): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message });
  }
}

function assertIdempotencyKey(idempotencyKey: string, message: string): void {
  if (!idempotencyKey.trim()) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message });
  }
}

function stockKeyMatches(
  record: {
    productId: string;
    warehouseId: string;
    locationId: string;
    unitId: string;
    lotId: string | null;
    serialId: string | null;
  },
  input: InventoryAvailabilityKeyDTO,
): boolean {
  return (
    record.productId === input.productId &&
    record.warehouseId === input.warehouseId &&
    record.locationId === input.locationId &&
    record.unitId === input.unitId &&
    (record.lotId ?? null) === (input.lotId ?? null) &&
    (record.serialId ?? null) === (input.serialId ?? null)
  );
}

function unsupportedReservation(reservationId: string): InventoryReservationDTO {
  return {
    productId: "",
    warehouseId: "",
    locationId: "",
    unitId: "",
    lotId: null,
    serialId: null,
    reservationId,
    status: "not_supported",
    quantity: 0,
    isPersisted: false,
    message: "Persisted inventory reservations are not supported by the current inventory foundation.",
  };
}

function toPostingStatus(detail: InventoryTransactionDetail): InventoryPostingStatusDTO {
  const posted = detail.postings.find((posting) => posting.postingKind === "post");
  const reversed = detail.postings.find((posting) => posting.postingKind === "reversal");

  return {
    inventoryTransactionId: detail.transaction.id,
    status: detail.transaction.status,
    isPosted: Boolean(posted),
    isReversed: Boolean(reversed),
    postingBatchId: posted?.postingBatchId ?? null,
    reversalPostingBatchId: reversed?.postingBatchId ?? null,
  };
}

function toOpenPurchaseOrderLines(detail: PurchaseDocumentDetail): readonly OpenPurchaseOrderLineDTO[] {
  return detail.lines.map((line) => {
    const receivedQuantity = line.receivedQuantity ?? 0;
    const openQuantity = Math.max(line.quantity - receivedQuantity, 0);

    return {
      purchaseOrderLineId: line.id,
      productId: line.productId,
      unitId: line.unitId,
      orderedQuantity: line.quantity,
      receivedQuantity,
      openQuantity,
      unitPrice: line.unitPrice,
    };
  });
}

function toPurchaseReceiptDTO(detail: PurchaseDocumentDetail): PurchaseReceiptDTO {
  return {
    receiptId: detail.document.id,
    purchaseOrderId: detail.document.purchaseOrderId ?? "",
    status: detail.document.status,
    inventoryTransactionId: detail.document.inventoryTransactionId,
    lines: detail.lines.map((line) => ({
      receiptLineId: line.id,
      purchaseOrderLineId: line.purchaseOrderLineId,
      productId: line.productId,
      unitId: line.unitId,
      quantity: line.quantity,
    })),
  };
}

async function validateProductCapability(
  productId: string,
  capability: ProductCapabilityValidationDTO["capability"],
): Promise<ProductCapabilityValidationDTO> {
  const product = await getProductForBusinessUse({ productId });
  const isCapable = capability === "stockable"
    ? product.isStockable
    : capability === "purchasable"
      ? product.isPurchasable
      : capability === "sellable"
        ? product.isSellable
        : product.isManufacturable;
  const isValid = product.isActive && isCapable;

  return {
    productId,
    capability,
    isValid,
    message: isValid ? null : `Product must be active and ${capability}.`,
  };
}

function toDocumentStatus(document: BusinessDocumentRecord): BusinessDocumentStatusDTO {
  return {
    documentId: document.id,
    documentNumber: document.documentNumber,
    documentTypeKey: document.documentTypeKey,
    status: document.status,
    workflowStatus: document.workflowStatus,
    approvalStatus: document.approvalStatus,
    sourceModule: document.sourceModule,
    sourceEntityType: document.sourceEntityType,
    sourceEntityId: document.sourceEntityId,
    version: document.version,
  };
}

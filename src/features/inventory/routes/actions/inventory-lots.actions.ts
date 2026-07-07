"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { inventoryLotMutationSchema, validateLotAgainstProductPolicy } from "../../application/schemas/inventory-lots.schema";
import type { InventoryLotProductPolicy } from "../../application/types/inventory-lots";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import { LOT_COLUMNS } from "../loaders/inventory-lots.loader";

const basePath = "/erp/inventory/lots";
const lotCodeConfig = { prefix: "LOT", scope: "company" } as const;

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function createParts() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.lotsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

async function loadProductPolicy(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
  productId: string,
): Promise<InventoryLotProductPolicy> {
  const { data, error } = await supabase
    .from("inventory_products")
    .select("name, tracking_mode, lot_supplier_supported, lot_internal_supported, lot_expiry_supported, lot_manufacturing_date_supported, lot_qc_required")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load product lot policy.", cause: error });
  }

  return {
    lotExpirySupported: data.lot_expiry_supported as boolean,
    lotInternalSupported: data.lot_internal_supported as boolean,
    lotManufacturingDateSupported: data.lot_manufacturing_date_supported as boolean,
    lotQcRequired: data.lot_qc_required as boolean,
    lotSupplierSupported: data.lot_supplier_supported as boolean,
    name: data.name as string,
    trackingMode: data.tracking_mode as string,
  };
}

function toPayload(
  input: ReturnType<typeof inventoryLotMutationSchema.parse>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const isArchived = input.status === "archived";

  return {
    barcode: input.barcode.toUpperCase(),
    branch_id: input.branchId ?? context.branchId,
    company_id: context.companyId,
    expiry_date: input.expiryDate ?? null,
    is_active: !isArchived && input.status !== "inactive",
    lifecycle_state: input.lifecycleState,
    lot_number: input.lotNumber,
    manufacturing_date: input.manufacturingDate ?? null,
    notes: input.notes ?? null,
    product_id: input.productId,
    product_variant_id: input.productVariantId ?? null,
    qc_status: input.qcStatus,
    qr_payload: input.qrPayload,
    received_date: input.receivedDate ?? null,
    source_metadata: input.sourceMetadata,
    source_reference_id: input.sourceReferenceId ?? null,
    source_reference_type: input.sourceReferenceType ?? null,
    source_type: input.sourceType,
    status: input.status,
    supplier_lot_number: input.supplierLotNumber ?? null,
    supplier_party_id: input.supplierPartyId ?? null,
    tenant_id: context.tenantId,
    traceability_ready: input.traceabilityReady,
    updated_by: context.userId,
  };
}

export async function createInventoryLotAction(formData: FormData) {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (!rawInput.lotNumber) {
    const code = await generateNextBusinessCode(supabase, {
      column: "lot_number",
      config: lotCodeConfig,
      scope: { companyId: context.companyId, tenantId: context.tenantId },
      table: "inventory_lots",
    });
    setGeneratedBusinessCode(rawInput, "lotNumber", code);
  }
  const parsed = inventoryLotMutationSchema.parse(rawInput);
  const policyIssues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  const policy = await loadProductPolicy(supabase, context, parsed.productId);
  validateLotAgainstProductPolicy(parsed, policy, (message, path) => {
    policyIssues.push({ message, path });
  });
  if (policyIssues.length > 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: policyIssues[0]?.message ?? "Lot policy validation failed." });
  }

  const { data, error } = await supabase
    .from("inventory_lots")
    .insert({ ...toPayload(parsed, context), created_by: context.userId })
    .select("id")
    .single();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create lot.", cause: error });
  }

  revalidatePath(basePath);
  return { id: data.id as string };
}

export async function updateInventoryLotAction(id: string, formData: FormData) {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (!rawInput.lotNumber) {
    const { data, error } = await supabase
      .from("inventory_lots")
      .select("lot_number")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read existing lot number.", cause: error });
    }
    setGeneratedBusinessCode(rawInput, "lotNumber", String(data.lot_number));
  }

  const parsed = inventoryLotMutationSchema.parse(rawInput);
  const policy = await loadProductPolicy(supabase, context, parsed.productId);
  const policyIssues: Array<{ message: string; path: readonly (string | number)[] }> = [];
  validateLotAgainstProductPolicy(parsed, policy, (message, path) => {
    policyIssues.push({ message, path });
  });
  if (policyIssues.length > 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: policyIssues[0]?.message ?? "Lot policy validation failed." });
  }

  const { error } = await supabase
    .from("inventory_lots")
    .update(toPayload(parsed, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update lot.", cause: error });
  }

  revalidatePath(basePath);
}

export async function archiveInventoryLotAction(id: string) {
  const { context, supabase } = await createParts();
  const { error } = await supabase
    .from("inventory_lots")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      lifecycle_state: "archived",
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive lot.", cause: error });
  }

  revalidatePath(basePath);
}

export async function getInventoryLotAction(id: string) {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.lotsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("inventory_lots")
    .select(LOT_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load lot.", cause: error });
  }

  return data;
}

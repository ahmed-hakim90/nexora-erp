"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { inventorySerialMutationSchema, validateSerialAgainstProductPolicy } from "../../application/schemas/inventory-serials.schema";
import type { InventorySerialProductPolicy } from "../../application/types/inventory-serials";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import { SERIAL_COLUMNS } from "../loaders/inventory-serials.loader";

const basePath = "/erp/inventory/serials";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function createParts() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.serialsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

async function loadProductPolicy(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
  productId: string,
): Promise<InventorySerialProductPolicy> {
  const { data, error } = await supabase
    .from("inventory_products")
    .select("name, tracking_mode, serial_source, serial_generation_timing, serial_allow_manual_override, serial_duplicate_validation")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load product serial policy.", cause: error });
  }

  return {
    name: data.name as string,
    serialAllowManualOverride: data.serial_allow_manual_override as boolean,
    serialDuplicateValidation: data.serial_duplicate_validation as boolean,
    serialGenerationTiming: data.serial_generation_timing as string | null,
    serialSource: data.serial_source as string | null,
    trackingMode: data.tracking_mode as string,
  };
}

function toPayload(
  input: ReturnType<typeof inventorySerialMutationSchema.parse>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const isArchived = input.status === "archived";
  return {
    barcode: input.barcode.toUpperCase(),
    branch_id: input.branchId ?? context.branchId,
    company_id: context.companyId,
    first_activation_ready: input.firstActivationReady,
    generation_method: input.generationMethod,
    is_active: !isArchived && input.status !== "inactive",
    lifecycle_state: input.lifecycleState,
    lot_id: input.lotId ?? null,
    notes: input.notes ?? null,
    policy_id: input.policyId ?? null,
    product_id: input.productId,
    product_variant_id: input.productVariantId ?? null,
    qr_payload: input.qrPayload,
    serial_number: input.serialNumber,
    serial_source: input.serialSource,
    serial_status: input.serialStatus,
    service_case_reference: input.serviceCaseReference ?? null,
    service_ready: input.serviceReady,
    sold_document_reference: input.soldDocumentReference ?? null,
    source_metadata: input.sourceMetadata,
    status: input.status,
    tenant_id: context.tenantId,
    traceability_ready: input.traceabilityReady,
    updated_by: context.userId,
    verification_status: input.verificationStatus,
    verification_token_hash: input.verificationTokenHash ?? null,
    warranty_ready: input.warrantyReady,
  };
}

export async function createInventorySerialAction(formData: FormData) {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (!rawInput.serialNumber) {
    const code = await generateNextBusinessCode(supabase, {
      column: "serial_number",
      config: { prefix: "SER", scope: "company" },
      scope: { companyId: context.companyId, tenantId: context.tenantId },
      table: "inventory_serial_numbers",
    });
    setGeneratedBusinessCode(rawInput, "serialNumber", code);
  }
  const parsed = inventorySerialMutationSchema.parse(rawInput);
  const policy = await loadProductPolicy(supabase, context, parsed.productId);
  const issues: string[] = [];
  validateSerialAgainstProductPolicy(parsed, policy, (message) => issues.push(message));
  if (issues.length > 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: issues[0] ?? "Serial policy validation failed." });

  const { data, error } = await supabase.from("inventory_serial_numbers").insert({ ...toPayload(parsed, context), created_by: context.userId }).select("id").single();
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create serial.", cause: error });
  revalidatePath(basePath);
  return { id: data.id as string };
}

export async function updateInventorySerialAction(id: string, formData: FormData) {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (!rawInput.serialNumber) {
    const { data, error } = await supabase.from("inventory_serial_numbers").select("serial_number").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("id", id).is("deleted_at", null).single();
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read existing serial number.", cause: error });
    setGeneratedBusinessCode(rawInput, "serialNumber", String(data.serial_number));
  }
  const parsed = inventorySerialMutationSchema.parse(rawInput);
  const policy = await loadProductPolicy(supabase, context, parsed.productId);
  const issues: string[] = [];
  validateSerialAgainstProductPolicy(parsed, policy, (message) => issues.push(message));
  if (issues.length > 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: issues[0] ?? "Serial policy validation failed." });

  const { error } = await supabase.from("inventory_serial_numbers").update(toPayload(parsed, context)).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("id", id).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update serial.", cause: error });
  revalidatePath(basePath);
}

export async function archiveInventorySerialAction(id: string) {
  const { context, supabase } = await createParts();
  const { error } = await supabase.from("inventory_serial_numbers").update({
    deleted_at: new Date().toISOString(),
    deleted_by: context.userId,
    is_active: false,
    lifecycle_state: "archived",
    serial_status: "archived",
    status: "archived",
    updated_by: context.userId,
  }).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("id", id).is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive serial.", cause: error });
  revalidatePath(basePath);
}

export async function getInventorySerialAction(id: string) {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.serialsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase.from("inventory_serial_numbers").select(SERIAL_COLUMNS).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load serial.", cause: error });
  return data;
}

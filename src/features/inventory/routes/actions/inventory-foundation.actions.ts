"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { getInventoryFoundationEntity, type InventoryFoundationDescriptor } from "../../application/foundation-entities";
import { buildInventoryFoundationMutationSchema } from "../../application/schemas/inventory-foundation.schema";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function fillGeneratedCodes(
  descriptor: InventoryFoundationDescriptor,
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  for (const field of descriptor.fields) {
    if (!field.autoCode) continue;
    const code = await generateNextBusinessCode(supabase, {
      column: field.column,
      config: field.autoCode,
      scope: { companyId: context.companyId, tenantId: context.tenantId },
      table: descriptor.table,
    });
    setGeneratedBusinessCode(input, field.name, code);
  }
}

async function preserveGeneratedCodes(
  descriptor: InventoryFoundationDescriptor,
  id: string,
  input: Record<string, unknown>,
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const autoFields = descriptor.fields.filter((field) => field.autoCode);
  if (autoFields.length === 0 || autoFields.every((field) => typeof input[field.name] === "string" && String(input[field.name]).trim().length > 0)) return;

  const { data, error } = await supabase
    .from(descriptor.table)
    .select(autoFields.map((field) => field.column).join(", "))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not read existing ${descriptor.singular} code.`, cause: error });
  }

  for (const field of autoFields) {
    setGeneratedBusinessCode(input, field.name, String((data as unknown as Record<string, unknown>)[field.column] ?? ""));
  }
}

function toPayload(
  descriptor: InventoryFoundationDescriptor,
  input: Record<string, unknown>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const payload: Record<string, unknown> = {
    company_id: context.companyId,
    tenant_id: context.tenantId,
    updated_by: context.userId,
  };

  for (const field of descriptor.fields) {
    let value = input[field.name];
    if (field.name.endsWith("Key") && typeof value === "string") value = value.toLowerCase();
    if (field.name === "sku" && typeof value === "string") value = value.toUpperCase();
    payload[field.column] = value ?? null;
  }

  if ("status" in payload) {
    payload.is_active = payload.status !== "archived" && payload.status !== "inactive";
  }

  if (descriptor.key === "reorder-rules") {
    payload.creates_demand_document = false;
    payload.trigger_event_name = "InventoryReorderRuleTriggered";
  }

  return payload;
}

async function createParts(resource: string) {
  const descriptor = getInventoryFoundationEntity(resource);
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: descriptor.managePermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, descriptor, supabase };
}

export async function createInventoryFoundationRecordAction(resource: string, formData: FormData) {
  const { context, descriptor, supabase } = await createParts(resource);
  const schema = buildInventoryFoundationMutationSchema(descriptor);
  const rawInput = formDataToObject(formData);
  await fillGeneratedCodes(descriptor, rawInput, supabase, context);
  const input = schema.parse(rawInput) as Record<string, unknown>;
  const { data, error } = await supabase
    .from(descriptor.table)
    .insert({ ...toPayload(descriptor, input, context), created_by: context.userId })
    .select("id")
    .single();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not create ${descriptor.singular}.`, cause: error });
  }

  revalidatePath(descriptor.basePath);
  return { id: data.id as string };
}

export async function updateInventoryFoundationRecordAction(resource: string, id: string, formData: FormData) {
  const { context, descriptor, supabase } = await createParts(resource);
  const schema = buildInventoryFoundationMutationSchema(descriptor);
  const rawInput = formDataToObject(formData);
  await preserveGeneratedCodes(descriptor, id, rawInput, supabase, context);
  const input = schema.parse(rawInput) as Record<string, unknown>;
  const { error } = await supabase
    .from(descriptor.table)
    .update(toPayload(descriptor, input, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not update ${descriptor.singular}.`, cause: error });
  }

  revalidatePath(descriptor.basePath);
  revalidatePath(`${descriptor.basePath}/${id}`);
}

export async function archiveInventoryFoundationRecordAction(resource: string, id: string) {
  const { context, descriptor, supabase } = await createParts(resource);
  const { error } = await supabase
    .from(descriptor.table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not archive ${descriptor.singular}.`, cause: error });
  }

  revalidatePath(descriptor.basePath);
}

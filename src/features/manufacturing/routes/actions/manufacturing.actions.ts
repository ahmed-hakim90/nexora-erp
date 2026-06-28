"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { manufacturingMutationSchema, manufacturingResourceKeySchema } from "../../application/schemas/manufacturing.schema";
import type { ManufacturingResourceDefinition } from "../../application/types";
import { getManufacturingResourceDefinition } from "../../presentation/view-models/page-config";
import { createManufacturingFoundationService } from "../service-factory";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function numberInput(value: unknown) {
  return Number(value ?? 0);
}

async function countActiveLines(table: "manufacturing_bom_lines" | "manufacturing_routing_steps", parentColumn: "bom_id" | "routing_id", id: string) {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId)
    .eq(parentColumn, id)
    .eq("is_active", true)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate manufacturing line requirements.", cause: error });
  return count ?? 0;
}

async function fillGeneratedCodes(definition: ManufacturingResourceDefinition, input: Record<string, unknown>) {
  const fields = definition.formFields.filter((field) => field.autoCode);
  if (fields.length === 0) return;

  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  for (const field of fields) {
    if (!field.autoCode) continue;
    const code = await generateNextBusinessCode(supabase, {
      column: field.name.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
      config: field.autoCode,
      scope: { branchId: context.branchId, companyId: context.companyId, tenantId: context.tenantId },
      table: definition.tableName,
    });
    setGeneratedBusinessCode(input, field.name, code);
  }
}

async function preserveGeneratedCodes(definition: ManufacturingResourceDefinition, id: string, input: Record<string, unknown>) {
  const fields = definition.formFields.filter((field) => field.autoCode);
  if (fields.length === 0 || fields.every((field) => typeof input[field.name] === "string" && String(input[field.name]).trim().length > 0)) return;

  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const columns = fields.map((field) => field.name.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`));
  let request = supabase
    .from(definition.tableName)
    .select(columns.join(", "))
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .is("deleted_at", null);

  if (definition.scope === "company" || definition.scope === "branch") request = request.eq("company_id", context.companyId);
  if (definition.scope === "branch") request = request.eq("branch_id", context.branchId);

  const { data, error } = await request.single();
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not read existing ${definition.singularTitle} code.`, cause: error });

  for (const [index, field] of fields.entries()) {
    setGeneratedBusinessCode(input, field.name, String((data as unknown as Record<string, unknown>)[columns[index]] ?? ""));
  }
}

async function validateManufacturingResourceInput(resourceKey: string, input: Record<string, unknown>, id?: string) {
  const status = String(input.status ?? "");

  if (resourceKey === "boms") {
    if (!input.manufacturingProductId) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "BOM product is required." });
    if (["active", "released"].includes(status)) {
      const lineCount = id ? await countActiveLines("manufacturing_bom_lines", "bom_id", id) : 0;
      if (lineCount < 1) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "BOM needs at least one line before activation." });
    }
  }

  if (resourceKey === "routing-plans") {
    if (!input.manufacturingProductId) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Routing product is required." });
    if (["active", "released"].includes(status)) {
      const stepCount = id ? await countActiveLines("manufacturing_routing_steps", "routing_id", id) : 0;
      if (stepCount < 1) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Routing needs at least one step before activation." });
    }
  }

  if (resourceKey === "manufacturing-orders") {
    if (!input.manufacturingProductId) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Manufacturing order product is required." });
    if (numberInput(input.plannedQuantity) <= 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Manufacturing order planned quantity must be greater than zero." });
  }

  if (resourceKey === "work-orders") {
    if (!input.manufacturingOrderId) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Work order manufacturing order is required." });
    if (numberInput(input.plannedQuantity) <= 0) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Work order planned quantity must be greater than zero." });
  }
}

export async function createManufacturingRecordAction(resourceKey: string, formData: FormData) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);
  const rawInput = formDataToObject(formData);
  await fillGeneratedCodes(definition, rawInput);
  const input = manufacturingMutationSchema.parse(rawInput);
  await validateManufacturingResourceInput(parsedResourceKey, input);
  const service = await createManufacturingFoundationService(parsedResourceKey);
  const record = await service.create(input);

  revalidatePath(definition.basePath);
  redirect(`${definition.basePath}/${record.id}`);
}

export async function updateManufacturingRecordAction(resourceKey: string, id: string, formData: FormData) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);
  const rawInput = formDataToObject(formData);
  await preserveGeneratedCodes(definition, id, rawInput);
  const input = manufacturingMutationSchema.parse(rawInput);
  await validateManufacturingResourceInput(parsedResourceKey, input, id);
  const service = await createManufacturingFoundationService(parsedResourceKey);

  await service.update(id, input);
  revalidatePath(definition.basePath);
  revalidatePath(`${definition.basePath}/${id}`);
  redirect(`${definition.basePath}/${id}`);
}

export async function softDeleteManufacturingRecordAction(resourceKey: string, id: string) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const service = await createManufacturingFoundationService(parsedResourceKey);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);

  await service.softDelete(id);
  revalidatePath(definition.basePath);
}

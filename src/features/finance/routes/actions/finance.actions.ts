"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { getFinanceEntity } from "../../application/entities";
import { buildFinanceMutationSchema } from "../../application/schemas/finance.schema";
import type { FinanceEntityDescriptor } from "../../application/types";
import { createFinanceService } from "../service-factory";

function formDataToObject(formData: FormData): Record<string, unknown> {
  const object: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    object[key] = value;
  }

  return object;
}

async function fillGeneratedCodes(descriptor: FinanceEntityDescriptor, input: Record<string, unknown>) {
  const fields = descriptor.fields.filter((field) => field.autoCode);
  if (fields.length === 0) return;

  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: descriptor.managePermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  for (const field of fields) {
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

async function preserveGeneratedCodes(descriptor: FinanceEntityDescriptor, id: string, input: Record<string, unknown>) {
  const fields = descriptor.fields.filter((field) => field.autoCode);
  if (fields.length === 0 || fields.every((field) => typeof input[field.name] === "string" && String(input[field.name]).trim().length > 0)) return;

  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: descriptor.managePermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  let request = supabase
    .from(descriptor.table)
    .select(fields.map((field) => field.column).join(", "))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (descriptor.fixedFilter) request = request.eq(descriptor.fixedFilter.column, descriptor.fixedFilter.value);

  const { data, error } = await request.single();
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not read existing ${descriptor.singular} code.`, cause: error });

  for (const field of fields) {
    setGeneratedBusinessCode(input, field.name, String((data as unknown as Record<string, unknown>)[field.column] ?? ""));
  }
}

export async function createFinanceRecordAction(entityKey: string, formData: FormData) {
  const descriptor = getFinanceEntity(entityKey);
  const service = await createFinanceService(entityKey);
  const rawInput = formDataToObject(formData);
  await fillGeneratedCodes(descriptor, rawInput);
  const input = buildFinanceMutationSchema(descriptor).parse(rawInput);
  const record = await service.create(input);
  revalidatePath(descriptor.basePath);
  return record;
}

export async function updateFinanceRecordAction(entityKey: string, id: string, formData: FormData) {
  const descriptor = getFinanceEntity(entityKey);
  const service = await createFinanceService(entityKey);
  const rawInput = formDataToObject(formData);
  await preserveGeneratedCodes(descriptor, id, rawInput);
  const input = buildFinanceMutationSchema(descriptor).parse(rawInput);
  const record = await service.update(id, input);
  revalidatePath(descriptor.basePath);
  revalidatePath(`${descriptor.basePath}/${id}`);
  return record;
}

export async function archiveFinanceRecordAction(entityKey: string, id: string) {
  const descriptor = getFinanceEntity(entityKey);
  const service = await createFinanceService(entityKey);
  await service.archive(id);
  revalidatePath(descriptor.basePath);
}

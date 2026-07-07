"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { getHrFoundationEntity, type HrFoundationDescriptor } from "../../application/foundation-entities";
import { buildHrFoundationMutationSchema } from "../../application/schemas/hr-foundation.schema";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function toPayload(descriptor: HrFoundationDescriptor, input: Record<string, unknown>, context: Awaited<ReturnType<typeof resolveBranchRequestContext>>) {
  const payload: Record<string, unknown> = {
    branch_id: context.branchId,
    company_id: context.companyId,
    tenant_id: context.tenantId,
    updated_by: context.userId,
  };

  for (const field of descriptor.fields) {
    let value = input[field.name];
    if (field.name.endsWith("Key") || field.name.endsWith("Code")) {
      if (typeof value === "string") value = value.toLowerCase();
    }
    if (field.type === "checkbox") {
      payload[field.column] = value === true || value === "true" || value === "on";
      continue;
    }
    if (field.type === "number" && (value === "" || value === undefined)) {
      payload[field.column] = null;
      continue;
    }
    if ((field.type === "lookup" || field.column.endsWith("_id")) && (value === "" || value === undefined)) {
      payload[field.column] = null;
      continue;
    }
    payload[field.column] = value ?? null;
  }

  if (descriptor.fixedFilter) payload[descriptor.fixedFilter.column] = descriptor.fixedFilter.value;
  if ("status" in payload) payload.is_active = payload.status !== "archived" && payload.status !== "inactive";
  if (descriptor.key === "positions" && !payload.effective_from) payload.effective_from = new Date().toISOString().slice(0, 10);

  return payload;
}

async function validateOrgUnitParent(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  parentId: string | null | undefined,
  recordId?: string,
) {
  if (!parentId) return;
  if (recordId && parentId === recordId) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "An organization unit cannot be its own parent." });
  }

  const { data, error } = await supabase
    .from("hr_org_units")
    .select("id, company_id, parent_org_unit_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", parentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Parent organization unit was not found." });
  }
  if (String(data.company_id) !== context.companyId) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Parent organization unit belongs to another company." });
  }
}

async function createParts(resource: string) {
  const descriptor = getHrFoundationEntity(resource);
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: descriptor.managePermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, descriptor, supabase };
}

export async function createHrFoundationRecordAction(resource: string, formData: FormData) {
  const { context, descriptor, supabase } = await createParts(resource);
  const schema = buildHrFoundationMutationSchema(descriptor);
  const input = schema.parse(formDataToObject(formData)) as Record<string, unknown>;

  if (descriptor.table === "hr_org_units") {
    await validateOrgUnitParent(supabase, context, input.parentOrgUnitId ? String(input.parentOrgUnitId) : null);
  }
  if (descriptor.key === "positions" && input.departmentId && input.jobId) {
    const { data: job } = await supabase.from("hr_jobs").select("id").eq("id", String(input.jobId)).eq("company_id", context.companyId).maybeSingle();
    if (!job) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Selected job was not found in this company." });
  }

  const { data, error } = await supabase
    .from(descriptor.table)
    .insert({ ...toPayload(descriptor, input, context), created_by: context.userId })
    .select("id")
    .single();

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not create ${descriptor.singular}.`, cause: error });

  revalidatePath(descriptor.basePath);
  return { id: String(data.id) };
}

export async function updateHrFoundationRecordAction(resource: string, id: string, formData: FormData) {
  const { context, descriptor, supabase } = await createParts(resource);
  const schema = buildHrFoundationMutationSchema(descriptor);
  const input = schema.parse(formDataToObject(formData)) as Record<string, unknown>;

  if (descriptor.table === "hr_org_units") {
    await validateOrgUnitParent(supabase, context, input.parentOrgUnitId ? String(input.parentOrgUnitId) : null, id);
  }

  const { error } = await supabase
    .from(descriptor.table)
    .update(toPayload(descriptor, input, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not update ${descriptor.singular}.`, cause: error });

  revalidatePath(descriptor.basePath);
}

export async function archiveHrFoundationRecordAction(resource: string, id: string) {
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

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not archive ${descriptor.singular}.`, cause: error });

  revalidatePath(descriptor.basePath);
}

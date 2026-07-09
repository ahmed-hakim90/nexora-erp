import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveDepartmentEmployeeIds(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  departmentId: string,
): Promise<string[]> {
  const today = todayIsoDate();
  const { data, error } = await supabase
    .from("hr_assignments")
    .select("employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("assignment_type", "department")
    .eq("reference_entity_id", departmentId)
    .eq("assignment_status", "active")
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve department employees.", cause: error });
  }

  return [...new Set((data ?? []).map((row) => String(row.employee_id)))];
}

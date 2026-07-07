import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

export type HrEmployeeUniquenessInput = Readonly<{
  attendanceCode?: string | null;
  employeeId?: string;
  employeeNumber?: string | null;
  nationalId?: string | null;
}>;

export type HrEmployeeValidationIssue = Readonly<{
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}>;

function escapeIlikeExact(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function validateEmployeeUniqueness(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  input: HrEmployeeUniquenessInput,
): Promise<readonly HrEmployeeValidationIssue[]> {
  const issues: HrEmployeeValidationIssue[] = [];
  const employeeNumber = input.employeeNumber?.trim().toUpperCase();
  const nationalId = input.nationalId?.trim();
  const attendanceCode = input.attendanceCode?.trim() ?? null;

  if (employeeNumber) {
    let request = supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("employee_number", employeeNumber)
      .is("deleted_at", null)
      .limit(1);
    if (input.employeeId) request = request.neq("id", input.employeeId);

    const { data } = await request;
    if ((data ?? []).length > 0) {
      issues.push({
        code: "duplicate_employee_code",
        field: "employeeNumber",
        message: "An employee with this employee number already exists.",
        severity: "error",
      });
    }
  }

  if (nationalId) {
    let request = supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("national_id", nationalId)
      .is("deleted_at", null)
      .limit(1);
    if (input.employeeId) request = request.neq("id", input.employeeId);

    const { data } = await request;
    if ((data ?? []).length > 0) {
      issues.push({
        code: "duplicate_national_id",
        field: "nationalId",
        message: "An employee with this national ID already exists in this company.",
        severity: "error",
      });
    }
  }

  if (attendanceCode) {
    let request = supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .ilike("attendance_code", escapeIlikeExact(attendanceCode))
      .is("deleted_at", null)
      .limit(1);
    if (input.employeeId) request = request.neq("id", input.employeeId);

    const { data } = await request;
    if ((data ?? []).length > 0) {
      issues.push({
        code: "duplicate_attendance_code",
        field: "attendanceCode",
        message: "This attendance code is already assigned to another employee.",
        severity: "error",
      });
    }
  }

  return issues;
}

export function assertNoBlockingEmployeeValidationIssues(issues: readonly HrEmployeeValidationIssue[]) {
  const blocking = issues.filter((issue) => issue.severity === "error");
  if (blocking.length === 0) return;
  throw new ApplicationError({
    code: "VALIDATION_ERROR",
    details: { issues: blocking },
    message: blocking.map((issue) => issue.message).join(" "),
  });
}

import { NextResponse } from "next/server";

import {
  matchCompensationIssuanceImportRows,
  parseCompensationIssuanceImportContent,
} from "@/features/hr/application/utils/hr-compensation-issuance-import";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

export async function POST(request: Request) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ errors: ["Import file is required."], rows: [], success: false, warnings: [] }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseCompensationIssuanceImportContent({ buffer, fileName: file.name });
  if (parsed.errors.length > 0) {
    return NextResponse.json({ errors: parsed.errors, rows: [], success: false, warnings: [] }, { status: 400 });
  }

  const employeeNumbers = [...new Set(parsed.rows.map((row) => row.employeeNumber))];
  const { data: employees, error } = await supabase
    .from("hr_employees")
    .select("id, full_name, employee_number")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .in("employee_number", employeeNumbers)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ errors: ["Could not resolve employees for import."], rows: [], success: false, warnings: [] }, { status: 500 });
  }

  const matched = matchCompensationIssuanceImportRows({
    employees: (employees ?? []).map((row) => ({
      employeeNumber: String(row.employee_number),
      fullName: String(row.full_name),
      id: String(row.id),
    })),
    rows: parsed.rows,
  });

  if (matched.errors.length > 0) {
    return NextResponse.json(
      { errors: matched.errors, rows: matched.rows, success: false, warnings: matched.warnings },
      { status: 400 },
    );
  }

  return NextResponse.json({
    errors: [],
    rows: matched.rows,
    success: true,
    warnings: matched.warnings,
  });
}

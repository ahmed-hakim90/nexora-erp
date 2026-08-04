import { NextResponse } from "next/server";

import { buildZktecoCsvImportTemplate } from "@/features/hr/server-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/server-api";

export async function GET() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceImport });
  const csv = buildZktecoCsvImportTemplate();
  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="zkteco-attendance-import-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

import { NextResponse } from "next/server";

import { buildEmployeeImportTemplateCsv } from "@/features/hr/application/services/hr-import.service";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

export async function GET() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });

  const csv = buildEmployeeImportTemplateCsv();
  const fileName = "hr-employees-import-template.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

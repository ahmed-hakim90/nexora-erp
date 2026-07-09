import { NextResponse } from "next/server";

import {
  buildEmployeeImportTemplateCsv,
  buildEmployeeImportTemplateXls,
  type EmployeeImportTemplateLocale,
} from "@/features/hr/application/services/hr-import.service";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

function resolveLocale(raw: string | null): EmployeeImportTemplateLocale {
  return raw?.trim().toLowerCase() === "en" ? "en" : "ar";
}

export async function GET(request: Request) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "xls").trim().toLowerCase();
  const locale = resolveLocale(searchParams.get("lang"));

  if (format === "csv") {
    const csv = buildEmployeeImportTemplateCsv(locale);
    const fileName =
      locale === "ar" ? "hr-employees-import-template-ar.csv" : "hr-employees-import-template.csv";
    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  // Default: Excel 97-2003 (.xls) for broad compatibility with older Office. Arabic headers by default.
  const xls = buildEmployeeImportTemplateXls(locale);
  const fileName =
    locale === "ar" ? "hr-employees-import-template-ar.xls" : "hr-employees-import-template.xls";
  return new NextResponse(new Uint8Array(xls), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.ms-excel",
    },
  });
}

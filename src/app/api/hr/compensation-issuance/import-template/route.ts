import { NextResponse } from "next/server";

import { buildCompensationIssuanceImportTemplateCsv } from "@/features/hr/server-api";
import { HR_PERMISSIONS } from "@/features/hr/server-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

function resolveLocale(raw: string | null): "ar" | "en" {
  return raw?.trim().toLowerCase() === "en" ? "en" : "ar";
}

export async function GET(request: Request) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("lang"));
  const csv = buildCompensationIssuanceImportTemplateCsv(locale);
  const fileName =
    locale === "ar" ? "hr-compensation-issuance-import-template-ar.csv" : "hr-compensation-issuance-import-template.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

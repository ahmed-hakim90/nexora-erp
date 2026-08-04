import { NextResponse } from "next/server";

import {
  HR_PERMISSIONS,
  HR_PRINT_TEMPLATE_KEYS,
} from "@/features/hr/server-api";
import { renderHrPrintDocument } from "@/features/hr/server-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

const SUPPORTED_TEMPLATE_KEYS = new Set<string>([
  HR_PRINT_TEMPLATE_KEYS.employeeProfile,
  HR_PRINT_TEMPLATE_KEYS.contract,
  HR_PRINT_TEMPLATE_KEYS.salaryLetter,
  HR_PRINT_TEMPLATE_KEYS.employeeCertificate,
]);

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ templateKey: string }> }>,
) {
  const { templateKey: rawTemplateKey } = await context.params;
  const templateKey = decodeURIComponent(rawTemplateKey);
  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  }

  if (!SUPPORTED_TEMPLATE_KEYS.has(templateKey)) {
    return NextResponse.json({ error: `Unsupported print template: ${templateKey}` }, { status: 404 });
  }

  const branchContext = await resolveBranchRequestContext("erp");
  const requiredPermission =
    templateKey === HR_PRINT_TEMPLATE_KEYS.salaryLetter
      ? HR_PERMISSIONS.compensationView
      : HR_PERMISSIONS.employeesView;
  await requirePermission({ context: branchContext, permission: requiredPermission });

  const html = await renderHrPrintDocument(templateKey, employeeId, branchContext);

  return new NextResponse(html, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

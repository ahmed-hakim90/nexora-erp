import { NextResponse } from "next/server";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HrPayrollWpsService } from "@/features/hr/application/services/hr-payroll-wps.service";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const requestContext = await resolveBranchRequestContext("erp");
  await requirePermission({ context: requestContext, permission: HR_PERMISSIONS.payrollManage });

  const supabase = createRequestSupabaseClient({ accessToken: requestContext.accessToken });
  const service = new HrPayrollWpsService(supabase, requestContext);
  const { content, rowCount } = await service.generateWpsBankFile(runId);

  return new NextResponse(content, {
    headers: {
      "Content-Disposition": `attachment; filename="wps-payroll-${runId.slice(0, 8)}.txt"`,
      "Content-Type": "text/plain; charset=utf-8",
      "X-WPS-Row-Count": String(rowCount),
    },
  });
}

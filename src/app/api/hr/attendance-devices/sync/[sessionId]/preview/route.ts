import { NextResponse } from "next/server";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/server-api";
import { loadHrAttendanceDevicePreview } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
) {
  const { sessionId } = await context.params;
  const requestContext = await resolveBranchRequestContext("erp");
  await requirePermission({ context: requestContext, permission: HR_PERMISSIONS.devicesView });
  const preview = await loadHrAttendanceDevicePreview(sessionId);
  return NextResponse.json({ preview });
}

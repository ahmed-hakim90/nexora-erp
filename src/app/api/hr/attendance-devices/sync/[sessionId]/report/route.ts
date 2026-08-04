import { NextResponse } from "next/server";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/server-api";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ sessionId: string }> }>,
) {
  const { sessionId } = await context.params;
  const requestContext = await resolveBranchRequestContext("erp");
  await requirePermission({ context: requestContext, permission: HR_PERMISSIONS.attendanceDevicesReportsDownload });
  const supabase = createRequestSupabaseClient({ accessToken: requestContext.accessToken });
  const { data, error } = await supabase
    .from("hr_attendance_device_sync_sessions")
    .select("id, status, import_report, summary, preview_payload, completed_at, hr_attendance_devices(code, name)")
    .eq("id", sessionId)
    .eq("tenant_id", requestContext.tenantId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: "Sync report not found." }, { status: 404 });
  }

  const device = data.hr_attendance_devices as { code?: string; name?: string } | null;
  const report = {
    completedAt: data.completed_at,
    deviceCode: device?.code ?? null,
    deviceName: device?.name ?? null,
    importReport: data.import_report,
    previewPayload: data.preview_payload,
    previewSummary: data.summary,
    sessionId: data.id,
    status: data.status,
  };

  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="attendance-device-sync-${sessionId}.json"`,
      "Content-Type": "application/json",
    },
  });
}

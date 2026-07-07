import { NextResponse } from "next/server";

import {
  loadHrAttendanceDeviceDiagnostics,
  loadHrAttendanceDeviceLogs,
} from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    if (kind === "diagnostics") {
      const diagnostics = await loadHrAttendanceDeviceDiagnostics(deviceId);
      return NextResponse.json({ diagnostics });
    }
    const logs = await loadHrAttendanceDeviceLogs(deviceId);
    return NextResponse.json({ logs });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load device logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

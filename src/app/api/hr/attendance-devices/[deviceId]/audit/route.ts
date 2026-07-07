import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceAuditTrail } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const audit = await loadHrAttendanceDeviceAuditTrail(deviceId);
    return NextResponse.json({ audit });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load audit trail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

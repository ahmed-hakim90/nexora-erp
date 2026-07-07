import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceAnalytics } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const analytics = await loadHrAttendanceDeviceAnalytics(deviceId);
    return NextResponse.json({ analytics });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load device analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

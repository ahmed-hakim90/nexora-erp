import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceRealtime } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const events = await loadHrAttendanceDeviceRealtime(deviceId);
    return NextResponse.json({ events });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load realtime events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

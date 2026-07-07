import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceConnection } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const connection = await loadHrAttendanceDeviceConnection(deviceId);
    return NextResponse.json({ connection });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load connection data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

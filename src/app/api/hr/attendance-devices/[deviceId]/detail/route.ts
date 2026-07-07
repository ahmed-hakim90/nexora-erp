import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceDetail } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const detail = await loadHrAttendanceDeviceDetail(deviceId);
    return NextResponse.json({ detail });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load device detail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

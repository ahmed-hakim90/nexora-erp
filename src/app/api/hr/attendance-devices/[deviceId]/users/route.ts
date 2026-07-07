import { NextResponse } from "next/server";

import { loadHrAttendanceDeviceUsers } from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ deviceId: string }> }>,
) {
  try {
    const { deviceId } = await context.params;
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const users = await loadHrAttendanceDeviceUsers(deviceId, query);
    return NextResponse.json(users);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not load device users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

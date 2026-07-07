import { NextResponse } from "next/server";

import { refreshHrAttendanceLiveSnapshot } from "@/features/hr/routes/loaders/hr-attendance-live.loader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const payload = await refreshHrAttendanceLiveSnapshot(query);
  return NextResponse.json(payload);
}

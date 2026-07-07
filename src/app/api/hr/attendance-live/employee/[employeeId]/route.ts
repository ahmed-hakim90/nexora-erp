import { NextResponse } from "next/server";

import { loadHrAttendanceLiveEmployeeDrawer } from "@/features/hr/routes/loaders/hr-attendance-live.loader";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ employeeId: string }> }>,
) {
  const { employeeId } = await context.params;
  const drawer = await loadHrAttendanceLiveEmployeeDrawer(employeeId);
  return NextResponse.json(drawer);
}

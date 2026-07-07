import { NextResponse } from "next/server";

import { exportHrAttendanceLiveCsv } from "@/features/hr/routes/loaders/hr-attendance-live.loader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const csv = await exportHrAttendanceLiveCsv(query);
  const fileName = `hr-attendance-live-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

import { NextResponse } from "next/server";

import { exportHrAdvancesCsv } from "@/features/hr/routes/loaders/hr-financial.loader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const csv = await exportHrAdvancesCsv({
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  const fileName = `hr-advances-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

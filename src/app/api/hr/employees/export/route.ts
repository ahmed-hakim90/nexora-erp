import { NextResponse } from "next/server";

import { exportHrEmployeesCsv } from "@/features/hr/routes/loaders/hr-employees.loader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = {
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };

  const csv = await exportHrEmployeesCsv(query);
  const fileName = `hr-employees-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

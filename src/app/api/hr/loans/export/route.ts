import { NextResponse } from "next/server";

import { exportHrLoansCsv } from "@/features/hr/routes/loaders/hr-financial.loader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const csv = await exportHrLoansCsv({
    status: url.searchParams.get("status") ?? undefined,
  });
  const fileName = `hr-loans-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

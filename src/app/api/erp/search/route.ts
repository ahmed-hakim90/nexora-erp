import { NextResponse } from "next/server";

import { ApplicationError } from "@/core/errors";
import { searchHrWorkspaceRecords } from "@/features/hr/application/services/hr-workspace-search.service";

function createJsonError(message: string, status = 400) {
  return NextResponse.json({ message, records: [], success: false }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const term = url.searchParams.get("term") ?? "";
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
    const records = await searchHrWorkspaceRecords(term, Number.isFinite(limit) ? limit : 8);
    return NextResponse.json({ records, success: true });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return createJsonError(error.message, error.code === "FORBIDDEN" ? 403 : 500);
    }
    const message = error instanceof Error ? error.message : "Search request failed.";
    return createJsonError(message, 500);
  }
}

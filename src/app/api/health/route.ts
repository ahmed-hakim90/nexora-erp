import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "@/platform/database/server";

export async function GET() {
  const startedAt = Date.now();
  let database = "unknown";

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error } = await supabase.from("tenants").select("id").limit(1);
    database = error ? "degraded" : "ok";
  } catch {
    database = "down";
  }

  const status = database === "down" ? 503 : 200;
  return NextResponse.json(
    {
      checks: {
        database,
      },
      service: "nexora-erp",
      status: database === "down" ? "unhealthy" : "ok",
      uptimeMs: Date.now() - startedAt,
    },
    { status },
  );
}

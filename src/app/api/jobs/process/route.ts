import { NextResponse } from "next/server";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { processQueuedBackgroundJobs } from "@/platform/background-jobs/worker-runtime";
import { HR_PERMISSIONS } from "@/features/hr/server-api";

import { registerHrBackgroundJobHandlers } from "@/features/hr/server-api";

export async function POST() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.manage });

  registerHrBackgroundJobHandlers();
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const result = await processQueuedBackgroundJobs(supabase, { limit: 25 });

  return NextResponse.json({
    ...result,
    processedAt: new Date().toISOString(),
  });
}

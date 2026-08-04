import { NextResponse } from "next/server";

import { ApplicationError } from "@/core/errors";
import { runHrExpiryNotificationScan } from "@/features/hr/server-api";
import { HR_PERMISSIONS } from "@/features/hr/server-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

export async function POST() {
  try {
    const context = await resolveBranchRequestContext("erp");
    await requirePermission({ context, permission: HR_PERMISSIONS.manage });
    const result = await runHrExpiryNotificationScan(context);
    return NextResponse.json({ result, success: true });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          success: false,
        },
        { status: error.code === "AUTHORIZATION_ERROR" ? 403 : error.code === "VALIDATION_ERROR" ? 400 : 500 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Notification scan failed.",
        success: false,
      },
      { status: 500 },
    );
  }
}

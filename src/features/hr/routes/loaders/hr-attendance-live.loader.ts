import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { hrAttendanceLiveListQuerySchema } from "../../application/schemas/hr-attendance-live.schema";
import { HrAttendanceLiveService } from "../../application/services/hr-attendance-live.service";
import type {
  HrAttendanceLiveEmployeeDrawer,
  HrAttendanceLiveRefreshPayload,
  HrAttendanceLiveWorkspaceData,
} from "../../application/types/hr-attendance-live.types";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export async function loadHrAttendanceLiveWorkspace(query: unknown = {}): Promise<HrAttendanceLiveWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceMonitorView });
  const parsed = hrAttendanceLiveListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceLiveService(supabase, context);
  return service.loadWorkspace(parsed);
}

export async function refreshHrAttendanceLiveSnapshot(query: unknown = {}): Promise<HrAttendanceLiveRefreshPayload> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceMonitorView });
  const parsed = hrAttendanceLiveListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceLiveService(supabase, context);
  return service.refreshSnapshot(parsed);
}

export async function loadHrAttendanceLiveEmployeeDrawer(employeeId: string): Promise<HrAttendanceLiveEmployeeDrawer> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceMonitorView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceLiveService(supabase, context);
  return service.loadEmployeeDrawer(employeeId);
}

export async function exportHrAttendanceLiveCsv(query: unknown = {}): Promise<string> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceLiveExport });
  const parsed = hrAttendanceLiveListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceLiveService(supabase, context);
  return service.exportLiveSnapshotCsv(parsed);
}

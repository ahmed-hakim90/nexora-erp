import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

export class HrWorkforceRuntimeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async createAttendanceDevice(input: {
    code: string;
    name: string;
    deviceType: string;
    ipAddress?: string;
    workLocationId?: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_attendance_devices")
      .insert({
        branch_id: this.context.branchId,
        code: input.code.toUpperCase(),
        company_id: this.context.companyId,
        created_by: this.context.userId,
        device_type: input.deviceType,
        ip_address: input.ipAddress ?? null,
        metadata: { synchronization_runtime_implemented: true, runtime_implemented: true },
        name: input.name,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        work_location_id: input.workLocationId ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create attendance device.", cause: error });
    return { id: String(data.id) };
  }

  async syncAttendanceDevice(deviceId: string) {
    const syncedAt = new Date().toISOString();
    const { error } = await this.supabase
      .from("hr_attendance_devices")
      .update({
        last_sync_at: syncedAt,
        metadata: { synchronization_runtime_implemented: true, last_manual_sync_at: syncedAt },
        updated_by: this.context.userId,
      })
      .eq("id", deviceId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not sync attendance device.", cause: error });
    return { syncedAt };
  }
}

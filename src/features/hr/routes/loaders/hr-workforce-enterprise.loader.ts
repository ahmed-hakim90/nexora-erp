import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { listDeviceDriverDescriptors } from "../../application/device-drivers/registry";
import { HrAttendanceDeviceCommandService } from "../../application/services/hr-attendance-device-command.service";
import { HrWorkforceEnterpriseService } from "../../application/services/hr-workforce-enterprise.service";
import type { HrDeviceCommandKey, HrWorkforceAlertKey, HrWorkforceEnterpriseWorkspaceData } from "../../application/types/hr-workforce-enterprise.types";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export async function loadHrWorkforceEnterpriseWorkspace(): Promise<HrWorkforceEnterpriseWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.workforceMonitorView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrWorkforceEnterpriseService(supabase, context);
  const commandService = new HrAttendanceDeviceCommandService(supabase, context);

  const [
    liveMonitor,
    alerts,
    queueMetrics,
    deviceMap,
    capacitySnapshots,
    insights,
    observability,
    replaySessions,
    recalcSessions,
    commandHistory,
  ] = await Promise.all([
    service.loadLiveMonitor(),
    service.loadAlerts(),
    service.loadQueueMetrics(),
    service.buildDeviceMap(),
    service.loadCapacitySnapshots(),
    service.generateAiInsights(),
    service.loadObservability(),
    service.loadReplaySessions(),
    service.loadRecalcSessions(),
    commandService.loadCommandHistory(undefined, 25),
  ]);

  return {
    alerts: alerts.map((alert) => ({ ...alert, alertKey: alert.alertKey as HrWorkforceAlertKey })),
    capacitySnapshots,
    commandHistory: commandHistory.map((command) => ({ ...command, commandKey: command.commandKey as HrDeviceCommandKey })),
    deviceMap,
    insights,
    liveMonitor,
    observability,
    queueMetrics,
    recalcSessions,
    replaySessions,
  };
}

export async function loadHrDeviceDriverRegistry() {
  await resolveBranchRequestContext("erp");
  return listDeviceDriverDescriptors();
}

import {
  createErpShellContext,
  createErpShellModel,
  createErpShellSnapshot,
} from "../erp-shell-model";
import { requirePlatformCapabilityAccess } from "../erp-platform-capability.server";
import { loadHrDashboardWorkspace } from "@/features/hr/routes/loaders/hr-dashboard.loader";
import { EnterpriseHomeWorkspace } from "./home-workspace";
import { loadCurrentWorkspacePreferences } from "@/shared/workspace/preferences.server";

export default async function ErpWorkspaceShellPage() {
  const [{ runtime }, initialPreferences] = await Promise.all([
    requirePlatformCapabilityAccess("search"),
    loadCurrentWorkspacePreferences(),
  ]);
  const snapshot = createErpShellSnapshot(runtime);
  const context = createErpShellContext("/erp", runtime);
  const shellModel = createErpShellModel("/erp", runtime);
  const commands = snapshot.manifests.flatMap((manifest) => manifest.commands);
  const navigation = snapshot.manifests.flatMap((manifest) => manifest.navigation);

  let hrOpsSummary;
  try {
    const hrDashboard = await loadHrDashboardWorkspace();
    hrOpsSummary = {
      openAttendanceExceptionsToday: hrDashboard.metrics.openAttendanceExceptionsToday,
      pendingLateEarlyViolations: hrDashboard.metrics.pendingLateEarlyViolations,
      pendingLeaveApprovals: hrDashboard.metrics.pendingLeaveApprovals,
      pendingOvertimeCandidates: hrDashboard.metrics.pendingOvertimeCandidates,
      payrollReadinessIssues: hrDashboard.metrics.payrollReadinessIssues,
    };
  } catch {
    hrOpsSummary = undefined;
  }

  return (
    <EnterpriseHomeWorkspace
      commands={commands}
      context={{
        branchId: runtime.branchId,
        branchName: runtime.branchName,
        companyId: runtime.companyId,
        companyName: runtime.companyName,
        permissions: [...(context.grantedPermissions ?? new Set())],
        tenantId: context.tenantId,
        userName: runtime.userName,
        workspaceName: "ERP Workspace",
      }}
      hrOpsSummary={hrOpsSummary}
      initialPreferences={initialPreferences}
      navigation={navigation}
      shell={shellModel}
      snapshot={snapshot}
    />
  );
}

import { PLATFORM_FEATURE_FLAGS } from "@/platform/feature-flags/public-api";
import {
  buildAppCapabilityPlatformModel,
  buildHomeWorkspace,
  EMPTY_WORKSPACE_PREFERENCES,
  WORKSPACE_APP_CATALOG,
} from "@/shared/workspace/public-api";

import {
  createErpShellContext,
  createErpShellSnapshot,
  type ErpRuntimeContext,
} from "../../erp-shell-model";
import { GlobalSearchPanel } from "../global-search-panel";

export function ErpGlobalSearchSlot({
  activePath = "/erp",
  runtime,
}: Readonly<{
  activePath?: string;
  runtime: ErpRuntimeContext;
}>) {
  const snapshot = createErpShellSnapshot(runtime);
  const context = createErpShellContext(activePath, runtime);
  const commands = snapshot.manifests.flatMap((manifest) => manifest.commands);
  const navigation = snapshot.manifests.flatMap((manifest) => manifest.navigation);
  const registryContext = {
    branchId: runtime.branchId,
    companyId: runtime.companyId,
    enabledFeatureFlags: new Set([PLATFORM_FEATURE_FLAGS.foundationShell]),
    experience: "erp" as const,
    grantedPermissions: new Set(runtime.permissions),
    tenantId: runtime.tenantId,
  };
  const workspace = buildHomeWorkspace({
    activePath,
    catalog: WORKSPACE_APP_CATALOG,
    context: registryContext,
    preferences: EMPTY_WORKSPACE_PREFERENCES,
    snapshot,
  });
  const capabilityPlatform = buildAppCapabilityPlatformModel(snapshot.manifests);

  return (
    <GlobalSearchPanel
      apps={workspace.allApps}
      autoFocus
      capabilities={[
        ...capabilityPlatform.reports,
        ...capabilityPlatform.prints,
        ...capabilityPlatform.dashboards,
        ...capabilityPlatform.settings,
        ...capabilityPlatform.featureFlags,
        ...capabilityPlatform.notifications,
      ]}
      commands={commands}
      context={{
        branchId: runtime.branchId,
        companyId: runtime.companyId,
        permissions: [...runtime.permissions],
        tenantId: runtime.tenantId,
      }}
      navigation={navigation}
    />
  );
}

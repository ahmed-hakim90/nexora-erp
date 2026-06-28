import {
  createErpShellContext,
  createErpShellModel,
  createErpShellSnapshot,
  resolveErpRuntimeContext,
} from "../erp-shell-model";
import { EnterpriseHomeWorkspace } from "./home-workspace";

export default async function ErpWorkspaceShellPage() {
  const runtime = await resolveErpRuntimeContext();
  const snapshot = createErpShellSnapshot(runtime);
  const context = createErpShellContext("/erp", runtime);
  const shellModel = createErpShellModel("/erp", runtime);
  const commands = snapshot.manifests.flatMap((manifest) => manifest.commands);
  const navigation = snapshot.manifests.flatMap((manifest) => manifest.navigation);

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
      navigation={navigation}
      shell={shellModel}
      snapshot={snapshot}
    />
  );
}

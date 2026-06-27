import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type AppLifecycleState =
  | "available"
  | "installed"
  | "enabled"
  | "suspended"
  | "archived"
  | "upgrading";

export type AppCapabilityType =
  | "route"
  | "navigation"
  | "command"
  | "report"
  | "print"
  | "dashboard"
  | "setting"
  | "workflow"
  | "approval"
  | "search"
  | "connector"
  | "automation";

export type AppDependency = Readonly<{
  appKey: string;
  reason: string;
  isOptional?: boolean;
}>;

export type AppCapability = Readonly<{
  type: AppCapabilityType;
  key: string;
  requiredPermission?: PermissionKey;
  requiredFeatureFlag?: string;
}>;

export type AppManifest = Readonly<{
  key: string;
  name: string;
  version: string;
  category: string;
  experiences: readonly AccessExperience[];
  permissions: readonly PermissionKey[];
  statuses: readonly string[];
  dependencies: readonly AppDependency[];
  capabilities: readonly AppCapability[];
  sensitiveData: "none" | "standard" | "sensitive" | "restricted";
}>;

export type InstalledApp = Readonly<{
  appKey: string;
  tenantId: string;
  state: AppLifecycleState;
  installedVersion: string;
  enabledCompanyIds?: readonly string[];
  enabledBranchIds?: readonly string[];
}>;

export type AppEntitlement = Readonly<{
  appKey: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  state: "enabled" | "disabled" | "suspended";
  validFrom?: string | null;
  validTo?: string | null;
}>;

export function defineAppManifest<TManifest extends AppManifest>(
  manifest: TManifest,
): TManifest {
  return manifest;
}

export function isAppEnabled(app: InstalledApp): boolean {
  return app.state === "enabled";
}

export type ModuleAccessExperience = "erp" | "portal" | "both" | "platform";

export type ModuleDependencyType =
  | "platform"
  | "reference"
  | "workflow"
  | "reporting"
  | "event";

export type ModuleDependency = Readonly<{
  moduleKey: string;
  type: ModuleDependencyType;
  reason: string;
}>;

export type ModuleManifest = Readonly<{
  key: string;
  name: string;
  access: ModuleAccessExperience;
  permissions: readonly string[];
  statuses: readonly string[];
  dependencies: readonly ModuleDependency[];
  navigation: readonly string[];
  reports: readonly string[];
  prints: readonly string[];
  featureFlags: readonly string[];
  sensitiveData: "none" | "standard" | "sensitive" | "restricted";
}>;

export function defineModuleManifest<TManifest extends ModuleManifest>(
  manifest: TManifest,
): TManifest {
  // Manifest files must stay metadata-only. This helper preserves literal types.
  return manifest;
}

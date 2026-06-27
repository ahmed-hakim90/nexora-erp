import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  AppCapability,
  AppEntitlement,
  AppManifest,
  InstalledApp,
} from "./public-api";

export class AppRegistry {
  private readonly manifests = new Map<string, AppManifest>();

  registerApp(manifest: AppManifest): void {
    if (this.manifests.has(manifest.key)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: `App ${manifest.key} is already registered.`,
      });
    }

    this.assertDependenciesKnown(manifest);
    this.manifests.set(manifest.key, manifest);
  }

  listAvailableApps(): readonly AppManifest[] {
    return Array.from(this.manifests.values());
  }

  getAppManifest(appKey: string): AppManifest | null {
    return this.manifests.get(appKey) ?? null;
  }

  getAppCapabilities(appKey: string): readonly AppCapability[] {
    return this.getAppManifest(appKey)?.capabilities ?? [];
  }

  requireAppEntitlement(params: {
    appKey: string;
    entitlement?: AppEntitlement | null;
    installedApp?: InstalledApp | null;
  }): void {
    if (!this.manifests.has(params.appKey)) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: `App ${params.appKey} is not registered.`,
      });
    }

    if (params.installedApp?.state !== "enabled" || params.entitlement?.state !== "enabled") {
      throw new ApplicationError({
        code: "AUTHORIZATION_ERROR",
        message: `App ${params.appKey} is not enabled for the current scope.`,
      });
    }
  }

  private assertDependenciesKnown(manifest: AppManifest): void {
    for (const dependency of manifest.dependencies) {
      if (!dependency.isOptional && dependency.appKey === manifest.key) {
        throw new ApplicationError({
          code: "VALIDATION_ERROR",
          message: `App ${manifest.key} cannot depend on itself.`,
        });
      }
    }
  }
}

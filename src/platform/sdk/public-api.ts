export { defineAppManifest as defineApp } from "@/platform/app-registry/public-api";
export { defineAutomation, defineAiAction } from "@/platform/automation/public-api";
export { defineDashboard, defineDashboardWidget } from "@/platform/dashboard/public-api";
export { defineDocumentLifecycle } from "@/platform/document/public-api";
export { defineMarketplaceListing } from "@/platform/marketplace/public-api";
export { defineNavigationContribution, defineCommand } from "@/platform/navigation/public-api";
export { definePermissionDefinition, definePermissionKey } from "@/platform/permissions/public-api";
export { definePrintTemplate } from "@/platform/printing/public-api";
export { defineReport, defineReportDataset } from "@/platform/reporting/public-api";
export { defineRlsTestScenario, definePerformanceBudget } from "@/platform/testing/public-api";
export { defineExperience } from "@/platform/experience/public-api";

export type PlatformSdkSurface = Readonly<{
  version: string;
  supportsApps: true;
  supportsConnectors: true;
  supportsTestingHarness: true;
}>;

export const PLATFORM_SDK_SURFACE: PlatformSdkSurface = {
  supportsApps: true,
  supportsConnectors: true,
  supportsTestingHarness: true,
  version: "0.1.0",
};

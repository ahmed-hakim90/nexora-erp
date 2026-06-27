import type { AccessExperience } from "@/core/context";

export type ExperienceSurface =
  | "workspace"
  | "portal"
  | "admin"
  | "marketplace"
  | "connector"
  | "api"
  | "mobile"
  | "automation"
  | "ai"
  | "sandbox"
  | "system";

export type ResponsiveLayoutPolicy = Readonly<{
  mobileNavigation: "bottom-bar" | "drawer" | "command-first";
  minTouchTargetPx: number;
  allowWideTablesOnMobile: boolean;
}>;

export type AccessibilityPolicy = Readonly<{
  keyboardNavigationRequired: boolean;
  ariaLabelsRequired: boolean;
  focusVisibleRequired: boolean;
  reducedMotionSupported: boolean;
}>;

export type LookupInteraction = Readonly<{
  entityType: string;
  searchProviderKey: string;
  allowRawIdInput: boolean;
  minSearchLength: number;
}>;

export type UxPattern =
  | "page"
  | "form"
  | "table"
  | "detail"
  | "dashboard"
  | "document"
  | "report"
  | "print-preview"
  | "wizard"
  | "drawer"
  | "dialog"
  | "command"
  | "quick-action";

export type ExperienceDefinition = Readonly<{
  key: AccessExperience;
  label: string;
  surface: ExperienceSurface;
  allowedPatterns: readonly UxPattern[];
  responsivePolicy: ResponsiveLayoutPolicy;
  accessibilityPolicy: AccessibilityPolicy;
}>;

export type ExperienceShell = Readonly<{
  experience: AccessExperience;
  appLauncherEnabled: boolean;
  commandPaletteEnabled: boolean;
  contextualSidebarEnabled: boolean;
  companySwitcherEnabled: boolean;
  branchSwitcherEnabled: boolean;
}>;

export function defineExperience<TDefinition extends ExperienceDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

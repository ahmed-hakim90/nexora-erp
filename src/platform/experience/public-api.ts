import type { AccessExperience } from "@/core/context";
import type { BrandingContext, BrandingScope, CompanyBranding } from "@/platform/branding/public-api";
import type { PlatformFeedbackSeverity, PlatformFeedbackSource } from "@/platform/feedback/public-api";

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

export type ExperienceLayoutType =
  | "enterprise-workspace"
  | "admin-workspace"
  | "portal"
  | "mobile-task-app"
  | "marketplace"
  | "headless-api"
  | "automation-console"
  | "ai-console";

export type ExperienceNavigationStyle =
  | "sidebar-topbar"
  | "topbar"
  | "portal-hub"
  | "bottom-tabs"
  | "command-first"
  | "headless";

export type ExperienceSupportedDevice =
  | "desktop"
  | "tablet"
  | "mobile"
  | "kiosk"
  | "api-client"
  | "service";

export type ExperienceDirection = "ltr" | "rtl";

export type ResponsiveLayoutPolicy = Readonly<{
  mobileNavigation: "bottom-bar" | "drawer" | "command-first";
  minTouchTargetPx: number;
  allowWideTablesOnMobile: boolean;
  mobileFirstForms: boolean;
  responsiveBreakpoints: readonly ("mobile" | "tablet" | "desktop" | "wide")[];
}>;

export type AccessibilityPolicy = Readonly<{
  keyboardNavigationRequired: boolean;
  ariaLabelsRequired: boolean;
  focusVisibleRequired: boolean;
  reducedMotionSupported: boolean;
  screenReaderLabelsRequired: boolean;
  focusManagementRequired: boolean;
  minTouchTargetPx: number;
  supportsRtl: boolean;
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
  | "quick-action"
  | "list-view"
  | "card"
  | "empty-state"
  | "loading-state"
  | "error-state"
  | "confirmation"
  | "feedback"
  | "bulk-actions";

export type ExperienceShellCapabilities = Readonly<{
  topbar: boolean;
  sidebar: boolean;
  appLauncher: boolean;
  breadcrumbs: boolean;
  commandPalette: boolean;
  quickActions: boolean;
  notificationArea: boolean;
  userMenu: boolean;
  companyBranchSwitcher: boolean;
  mobileNavigation: boolean;
}>;

export type ExperienceBrandingSupport = Readonly<{
  enabled: boolean;
  supportedScopes: readonly BrandingScope[];
  logoPlacement: "topbar" | "sidebar" | "portal-header" | "none";
  colorTokens: boolean;
  respectsBrandingContext: boolean;
}>;

export type ExperienceDefinition = Readonly<{
  key: AccessExperience;
  label: string;
  surface: ExperienceSurface;
  layoutType: ExperienceLayoutType;
  navigationStyle: ExperienceNavigationStyle;
  supportedDevices: readonly ExperienceSupportedDevice[];
  defaultDirection: ExperienceDirection;
  allowedPatterns: readonly UxPattern[];
  responsivePolicy: ResponsiveLayoutPolicy;
  accessibilityPolicy: AccessibilityPolicy;
  shellCapabilities: ExperienceShellCapabilities;
  brandingSupport: ExperienceBrandingSupport;
}>;

export type ExperienceShell = Readonly<{
  experience: AccessExperience;
  appLauncherEnabled: boolean;
  commandPaletteEnabled: boolean;
  contextualSidebarEnabled: boolean;
  companySwitcherEnabled: boolean;
  branchSwitcherEnabled: boolean;
}>;

export type ExperienceShellPrimitive =
  | "topbar"
  | "sidebar"
  | "app-launcher"
  | "breadcrumbs"
  | "command-palette"
  | "quick-actions"
  | "notification-area"
  | "user-menu"
  | "company-branch-switcher"
  | "mobile-navigation";

export type ExperienceShellPrimitiveContract = Readonly<{
  primitive: ExperienceShellPrimitive;
  label: string;
  required: boolean;
  navigationAware: boolean;
  brandingAware: boolean;
  feedbackAware: boolean;
  accessibility: Readonly<{
    ariaLabelRequired: boolean;
    keyboardReachable: boolean;
    focusManaged: boolean;
  }>;
  mobileBehavior: "visible" | "collapsed" | "drawer" | "bottom-bar" | "hidden";
}>;

export type ExperienceShellContract = Readonly<{
  experience: AccessExperience;
  layoutType: ExperienceLayoutType;
  navigationStyle: ExperienceNavigationStyle;
  direction: ExperienceDirection;
  capabilities: ExperienceShellCapabilities;
  primitives: readonly ExperienceShellPrimitiveContract[];
  branding: ExperienceBrandingSupport;
  feedback: UxFeedbackIntegrationContract;
}>;

export type UxPatternContract = Readonly<{
  pattern: UxPattern;
  label: string;
  intent: string;
  requiredAccessibility: readonly string[];
  mobilePolicy: "responsive" | "mobile-first" | "desktop-only";
  feedbackPolicy: "platform-feedback" | "inline-state" | "none";
  lookupFirstRequired?: boolean;
}>;

export type LookupPrimitive =
  | "lookup-field"
  | "search-picker"
  | "entity-selector"
  | "recent-entities"
  | "favorite-entities"
  | "async-options";

export type LookupOption = Readonly<{
  id: string;
  entityType: string;
  label: string;
  description?: string;
  isRecent?: boolean;
  isFavorite?: boolean;
  disabled?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type LookupContract = Readonly<{
  primitive: LookupPrimitive;
  entityType: string;
  searchProviderKey: string;
  allowRawIdInput: false;
  minSearchLength: number;
  supportsRecent: boolean;
  supportsFavorites: boolean;
  asyncOptions: AsyncOptionsContract;
}>;

export type AsyncOptionsContract = Readonly<{
  debounceMs: number;
  minSearchLength: number;
  pageSize: number;
  emptyStateMessage: string;
  loadingStateMessage: string;
  errorStateMessage: string;
}>;

export type NormalizedLookupQuery = Readonly<{
  search: string | null;
  rejectedRawId: boolean;
  minSearchLength: number;
}>;

export type UxFeedbackIntegrationContract = Readonly<{
  engine: "platform.feedback";
  source: PlatformFeedbackSource;
  allowedSeverities: readonly PlatformFeedbackSeverity[];
  directToastImportsAllowed: false;
}>;

export type ShellBrandingContext = Readonly<{
  brandingContext: BrandingContext;
  branding?: CompanyBranding;
  displayName: string;
  logoFileId?: string | null;
  primaryColorToken?: string | null;
}>;

export const DEFAULT_RESPONSIVE_LAYOUT_POLICY: ResponsiveLayoutPolicy = {
  allowWideTablesOnMobile: false,
  minTouchTargetPx: 44,
  mobileFirstForms: true,
  mobileNavigation: "drawer",
  responsiveBreakpoints: ["mobile", "tablet", "desktop", "wide"],
};

export const DEFAULT_ACCESSIBILITY_POLICY: AccessibilityPolicy = {
  ariaLabelsRequired: true,
  focusManagementRequired: true,
  focusVisibleRequired: true,
  keyboardNavigationRequired: true,
  minTouchTargetPx: 44,
  reducedMotionSupported: true,
  screenReaderLabelsRequired: true,
  supportsRtl: true,
};

export const PLATFORM_FEEDBACK_INTEGRATION: UxFeedbackIntegrationContract = {
  allowedSeverities: ["success", "error", "warning", "info", "loading", "progress"],
  directToastImportsAllowed: false,
  engine: "platform.feedback",
  source: "runtime",
};

const WORKSPACE_PATTERNS = [
  "page",
  "table",
  "form",
  "detail",
  "list-view",
  "card",
  "dialog",
  "drawer",
  "wizard",
  "empty-state",
  "loading-state",
  "error-state",
  "confirmation",
  "feedback",
  "bulk-actions",
  "command",
  "quick-action",
] as const satisfies readonly UxPattern[];

const PORTAL_PATTERNS = [
  "page",
  "form",
  "detail",
  "list-view",
  "card",
  "dialog",
  "empty-state",
  "loading-state",
  "error-state",
  "confirmation",
  "feedback",
] as const satisfies readonly UxPattern[];

const HEADLESS_PATTERNS = [
  "error-state",
  "loading-state",
  "feedback",
] as const satisfies readonly UxPattern[];

const WORKSPACE_SHELL_CAPABILITIES: ExperienceShellCapabilities = {
  appLauncher: true,
  breadcrumbs: true,
  commandPalette: true,
  companyBranchSwitcher: true,
  mobileNavigation: true,
  notificationArea: true,
  quickActions: true,
  sidebar: true,
  topbar: true,
  userMenu: true,
};

const PORTAL_SHELL_CAPABILITIES: ExperienceShellCapabilities = {
  appLauncher: false,
  breadcrumbs: true,
  commandPalette: false,
  companyBranchSwitcher: false,
  mobileNavigation: true,
  notificationArea: true,
  quickActions: true,
  sidebar: false,
  topbar: true,
  userMenu: true,
};

const MOBILE_TASK_SHELL_CAPABILITIES: ExperienceShellCapabilities = {
  appLauncher: false,
  breadcrumbs: false,
  commandPalette: false,
  companyBranchSwitcher: false,
  mobileNavigation: true,
  notificationArea: true,
  quickActions: true,
  sidebar: false,
  topbar: true,
  userMenu: true,
};

const HEADLESS_SHELL_CAPABILITIES: ExperienceShellCapabilities = {
  appLauncher: false,
  breadcrumbs: false,
  commandPalette: false,
  companyBranchSwitcher: false,
  mobileNavigation: false,
  notificationArea: false,
  quickActions: false,
  sidebar: false,
  topbar: false,
  userMenu: false,
};

const STANDARD_BRANDING_SUPPORT: ExperienceBrandingSupport = {
  colorTokens: true,
  enabled: true,
  logoPlacement: "topbar",
  respectsBrandingContext: true,
  supportedScopes: ["tenant", "company", "branch", "app"],
};

const NO_VISUAL_BRANDING_SUPPORT: ExperienceBrandingSupport = {
  colorTokens: false,
  enabled: false,
  logoPlacement: "none",
  respectsBrandingContext: false,
  supportedScopes: [],
};

export const EXPERIENCE_DEFINITIONS = {
  erp: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: WORKSPACE_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "erp",
    label: "ERP Workspace",
    layoutType: "enterprise-workspace",
    navigationStyle: "sidebar-topbar",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: WORKSPACE_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "workspace",
  }),
  admin: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: WORKSPACE_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "admin",
    label: "Admin Workspace",
    layoutType: "admin-workspace",
    navigationStyle: "sidebar-topbar",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: WORKSPACE_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet"],
    surface: "admin",
  }),
  "employee-portal": defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "employee-portal",
    label: "Employee Portal",
    layoutType: "portal",
    navigationStyle: "portal-hub",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: PORTAL_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "portal",
  }),
  "customer-portal": defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "customer-portal",
    label: "Customer Portal",
    layoutType: "portal",
    navigationStyle: "portal-hub",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: PORTAL_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "portal",
  }),
  "supplier-portal": defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "supplier-portal",
    label: "Supplier Portal",
    layoutType: "portal",
    navigationStyle: "portal-hub",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: PORTAL_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "portal",
  }),
  "driver-app": defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "driver-app",
    label: "Driver App",
    layoutType: "mobile-task-app",
    navigationStyle: "bottom-tabs",
    responsivePolicy: {
      ...DEFAULT_RESPONSIVE_LAYOUT_POLICY,
      mobileNavigation: "bottom-bar",
    },
    shellCapabilities: MOBILE_TASK_SHELL_CAPABILITIES,
    supportedDevices: ["mobile", "tablet"],
    surface: "mobile",
  }),
  "technician-app": defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "technician-app",
    label: "Technician App",
    layoutType: "mobile-task-app",
    navigationStyle: "bottom-tabs",
    responsivePolicy: {
      ...DEFAULT_RESPONSIVE_LAYOUT_POLICY,
      mobileNavigation: "bottom-bar",
    },
    shellCapabilities: MOBILE_TASK_SHELL_CAPABILITIES,
    supportedDevices: ["mobile", "tablet"],
    surface: "mobile",
  }),
  marketplace: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: PORTAL_PATTERNS,
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "marketplace",
    label: "Marketplace",
    layoutType: "marketplace",
    navigationStyle: "topbar",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: PORTAL_SHELL_CAPABILITIES,
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "marketplace",
  }),
  api: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: HEADLESS_PATTERNS,
    brandingSupport: NO_VISUAL_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "api",
    label: "API",
    layoutType: "headless-api",
    navigationStyle: "headless",
    responsivePolicy: {
      ...DEFAULT_RESPONSIVE_LAYOUT_POLICY,
      mobileFirstForms: false,
      mobileNavigation: "command-first",
    },
    shellCapabilities: HEADLESS_SHELL_CAPABILITIES,
    supportedDevices: ["api-client", "service"],
    surface: "api",
  }),
  automation: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: ["page", "table", "detail", "empty-state", "loading-state", "error-state", "feedback"],
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "automation",
    label: "Automation",
    layoutType: "automation-console",
    navigationStyle: "command-first",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: {
      ...WORKSPACE_SHELL_CAPABILITIES,
      sidebar: false,
    },
    supportedDevices: ["desktop", "tablet"],
    surface: "automation",
  }),
  ai: defineExperience({
    accessibilityPolicy: DEFAULT_ACCESSIBILITY_POLICY,
    allowedPatterns: ["page", "dialog", "drawer", "empty-state", "loading-state", "error-state", "feedback", "command"],
    brandingSupport: STANDARD_BRANDING_SUPPORT,
    defaultDirection: "ltr",
    key: "ai",
    label: "AI",
    layoutType: "ai-console",
    navigationStyle: "command-first",
    responsivePolicy: DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    shellCapabilities: {
      ...WORKSPACE_SHELL_CAPABILITIES,
      sidebar: false,
    },
    supportedDevices: ["desktop", "tablet", "mobile"],
    surface: "ai",
  }),
} as const satisfies Partial<Record<AccessExperience, ExperienceDefinition>>;

export const UX_SHELL_PRIMITIVE_CONTRACTS = {
  topbar: defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: false, keyboardReachable: true },
    brandingAware: true,
    feedbackAware: false,
    label: "Topbar",
    mobileBehavior: "visible",
    navigationAware: true,
    primitive: "topbar",
    required: true,
  }),
  sidebar: defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: false, keyboardReachable: true },
    brandingAware: true,
    feedbackAware: false,
    label: "Sidebar",
    mobileBehavior: "drawer",
    navigationAware: true,
    primitive: "sidebar",
    required: false,
  }),
  "app-launcher": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: false,
    label: "App Launcher",
    mobileBehavior: "collapsed",
    navigationAware: true,
    primitive: "app-launcher",
    required: false,
  }),
  breadcrumbs: defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: false, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: false,
    label: "Breadcrumbs",
    mobileBehavior: "collapsed",
    navigationAware: true,
    primitive: "breadcrumbs",
    required: false,
  }),
  "command-palette": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: true,
    label: "Command Palette",
    mobileBehavior: "collapsed",
    navigationAware: true,
    primitive: "command-palette",
    required: false,
  }),
  "quick-actions": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: false, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: true,
    label: "Quick Actions",
    mobileBehavior: "collapsed",
    navigationAware: true,
    primitive: "quick-actions",
    required: false,
  }),
  "notification-area": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: true,
    label: "Notification Area",
    mobileBehavior: "collapsed",
    navigationAware: false,
    primitive: "notification-area",
    required: false,
  }),
  "user-menu": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: false,
    feedbackAware: false,
    label: "User Menu",
    mobileBehavior: "collapsed",
    navigationAware: false,
    primitive: "user-menu",
    required: true,
  }),
  "company-branch-switcher": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: true,
    feedbackAware: true,
    label: "Company/Branch Switcher",
    mobileBehavior: "collapsed",
    navigationAware: false,
    primitive: "company-branch-switcher",
    required: false,
  }),
  "mobile-navigation": defineShellPrimitive({
    accessibility: { ariaLabelRequired: true, focusManaged: true, keyboardReachable: true },
    brandingAware: true,
    feedbackAware: false,
    label: "Mobile Navigation",
    mobileBehavior: "bottom-bar",
    navigationAware: true,
    primitive: "mobile-navigation",
    required: false,
  }),
} as const satisfies Record<ExperienceShellPrimitive, ExperienceShellPrimitiveContract>;

export const UX_PATTERN_CONTRACTS = {
  page: defineUxPatternContract("page", "Page", "Top-level route canvas with title, actions, content, and optional supporting regions.", "responsive", "inline-state"),
  table: defineUxPatternContract("table", "Table", "Data-dense record view with search, filters, saved views, selection, and bulk actions.", "responsive", "inline-state", true),
  form: defineUxPatternContract("form", "Form", "Validated input experience with field groups, dirty state, and submit feedback.", "mobile-first", "platform-feedback", true),
  detail: defineUxPatternContract("detail", "Detail View", "Read-focused entity view with sections, actions, and contextual metadata.", "responsive", "inline-state", true),
  "list-view": defineUxPatternContract("list-view", "List View", "Compact collection view for mobile and portal experiences.", "mobile-first", "inline-state", true),
  card: defineUxPatternContract("card", "Card", "Composable surface for summaries, metrics, or grouped actions.", "responsive", "none"),
  dialog: defineUxPatternContract("dialog", "Dialog", "Blocking overlay for focused decisions or short tasks.", "responsive", "platform-feedback"),
  drawer: defineUxPatternContract("drawer", "Drawer", "Contextual side panel for details or short forms without leaving the current page.", "responsive", "platform-feedback"),
  wizard: defineUxPatternContract("wizard", "Wizard", "Step-based flow for multi-stage tasks with explicit progress and recovery.", "mobile-first", "platform-feedback"),
  "empty-state": defineUxPatternContract("empty-state", "Empty State", "Guidance shown when a page, table, or list has no content yet.", "responsive", "inline-state"),
  "loading-state": defineUxPatternContract("loading-state", "Loading State", "Progress indication that preserves layout stability and announces busy regions.", "responsive", "inline-state"),
  "error-state": defineUxPatternContract("error-state", "Error State", "Recoverable error presentation with correlation and next-step guidance.", "responsive", "platform-feedback"),
  confirmation: defineUxPatternContract("confirmation", "Confirmation", "Explicit user confirmation before irreversible or sensitive actions.", "responsive", "platform-feedback"),
  feedback: defineUxPatternContract("feedback", "Feedback", "User-facing result messaging routed through the platform feedback engine.", "responsive", "platform-feedback"),
  "bulk-actions": defineUxPatternContract("bulk-actions", "Bulk Actions", "Selection-aware action group with permission and confirmation hooks.", "responsive", "platform-feedback", true),
} as const satisfies Partial<Record<UxPattern, UxPatternContract>>;

export const LOOKUP_FIRST_CONTRACTS = {
  "lookup-field": defineLookupContract({
    asyncOptions: defaultAsyncOptions(2),
    entityType: "entity",
    minSearchLength: 2,
    primitive: "lookup-field",
    searchProviderKey: "platform.lookup.entity",
    supportsFavorites: true,
    supportsRecent: true,
  }),
  "search-picker": defineLookupContract({
    asyncOptions: defaultAsyncOptions(2),
    entityType: "entity",
    minSearchLength: 2,
    primitive: "search-picker",
    searchProviderKey: "platform.lookup.search-picker",
    supportsFavorites: true,
    supportsRecent: true,
  }),
  "entity-selector": defineLookupContract({
    asyncOptions: defaultAsyncOptions(1),
    entityType: "entity",
    minSearchLength: 1,
    primitive: "entity-selector",
    searchProviderKey: "platform.lookup.entity-selector",
    supportsFavorites: true,
    supportsRecent: true,
  }),
  "recent-entities": defineLookupContract({
    asyncOptions: defaultAsyncOptions(0),
    entityType: "entity",
    minSearchLength: 0,
    primitive: "recent-entities",
    searchProviderKey: "platform.lookup.recent-entities",
    supportsFavorites: false,
    supportsRecent: true,
  }),
  "favorite-entities": defineLookupContract({
    asyncOptions: defaultAsyncOptions(0),
    entityType: "entity",
    minSearchLength: 0,
    primitive: "favorite-entities",
    searchProviderKey: "platform.lookup.favorite-entities",
    supportsFavorites: true,
    supportsRecent: false,
  }),
  "async-options": defineLookupContract({
    asyncOptions: defaultAsyncOptions(2),
    entityType: "entity",
    minSearchLength: 2,
    primitive: "async-options",
    searchProviderKey: "platform.lookup.async-options",
    supportsFavorites: false,
    supportsRecent: false,
  }),
} as const satisfies Record<LookupPrimitive, LookupContract>;

export function defineExperience<TDefinition extends ExperienceDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineShellPrimitive<TContract extends ExperienceShellPrimitiveContract>(
  contract: TContract,
): TContract {
  return contract;
}

export function defineLookupContract<TContract extends Omit<LookupContract, "allowRawIdInput">>(
  contract: TContract,
): TContract & Pick<LookupContract, "allowRawIdInput"> {
  return {
    ...contract,
    allowRawIdInput: false,
  };
}

export function defaultAsyncOptions(minSearchLength: number): AsyncOptionsContract {
  return {
    debounceMs: 250,
    emptyStateMessage: "No matching records found.",
    errorStateMessage: "Lookup options could not be loaded.",
    loadingStateMessage: "Loading options...",
    minSearchLength,
    pageSize: 20,
  };
}

export function defineUxPatternContract(
  pattern: UxPattern,
  label: string,
  intent: string,
  mobilePolicy: UxPatternContract["mobilePolicy"],
  feedbackPolicy: UxPatternContract["feedbackPolicy"],
  lookupFirstRequired = false,
): UxPatternContract {
  return {
    feedbackPolicy,
    intent,
    label,
    lookupFirstRequired,
    mobilePolicy,
    pattern,
    requiredAccessibility: [
      "keyboard navigation",
      "visible focus",
      "screen reader labels",
      "responsive touch targets",
    ],
  };
}

export function getExperienceDefinition(experience: AccessExperience): ExperienceDefinition | null {
  return EXPERIENCE_DEFINITIONS[experience as keyof typeof EXPERIENCE_DEFINITIONS] ?? null;
}

export function createExperienceShellContract(experience: AccessExperience): ExperienceShellContract | null {
  const definition = getExperienceDefinition(experience);

  if (!definition) {
    return null;
  }

  return {
    branding: definition.brandingSupport,
    capabilities: definition.shellCapabilities,
    direction: definition.defaultDirection,
    experience: definition.key,
    feedback: PLATFORM_FEEDBACK_INTEGRATION,
    layoutType: definition.layoutType,
    navigationStyle: definition.navigationStyle,
    primitives: getShellPrimitivesForCapabilities(definition.shellCapabilities),
  };
}

export function getShellPrimitivesForCapabilities(
  capabilities: ExperienceShellCapabilities,
): readonly ExperienceShellPrimitiveContract[] {
  const primitiveEntries: readonly [ExperienceShellPrimitive, boolean][] = [
    ["topbar", capabilities.topbar],
    ["sidebar", capabilities.sidebar],
    ["app-launcher", capabilities.appLauncher],
    ["breadcrumbs", capabilities.breadcrumbs],
    ["command-palette", capabilities.commandPalette],
    ["quick-actions", capabilities.quickActions],
    ["notification-area", capabilities.notificationArea],
    ["user-menu", capabilities.userMenu],
    ["company-branch-switcher", capabilities.companyBranchSwitcher],
    ["mobile-navigation", capabilities.mobileNavigation],
  ];

  return primitiveEntries
    .filter(([, enabled]) => enabled)
    .map(([primitive]) => UX_SHELL_PRIMITIVE_CONTRACTS[primitive]);
}

export function createShellBrandingContext(
  brandingContext: BrandingContext,
  branding?: CompanyBranding,
): ShellBrandingContext {
  return {
    branding,
    brandingContext,
    displayName: branding?.displayName ?? branding?.legalName ?? "Nexora",
    logoFileId: branding?.logoFileId ?? null,
    primaryColorToken: branding?.primaryColorToken ?? null,
  };
}

export function normalizeAccessibilityPolicy(
  policy: Partial<AccessibilityPolicy> = {},
): AccessibilityPolicy {
  return {
    ...DEFAULT_ACCESSIBILITY_POLICY,
    ...policy,
    minTouchTargetPx: Math.max(
      policy.minTouchTargetPx ?? DEFAULT_ACCESSIBILITY_POLICY.minTouchTargetPx,
      DEFAULT_ACCESSIBILITY_POLICY.minTouchTargetPx,
    ),
  };
}

export function normalizeResponsiveLayoutPolicy(
  policy: Partial<ResponsiveLayoutPolicy> = {},
): ResponsiveLayoutPolicy {
  return {
    ...DEFAULT_RESPONSIVE_LAYOUT_POLICY,
    ...policy,
    minTouchTargetPx: Math.max(
      policy.minTouchTargetPx ?? DEFAULT_RESPONSIVE_LAYOUT_POLICY.minTouchTargetPx,
      DEFAULT_RESPONSIVE_LAYOUT_POLICY.minTouchTargetPx,
    ),
    responsiveBreakpoints: policy.responsiveBreakpoints ?? DEFAULT_RESPONSIVE_LAYOUT_POLICY.responsiveBreakpoints,
  };
}

export function normalizeLookupQuery(
  input: string,
  options: Readonly<{
    allowRawIdInput?: false;
    minSearchLength?: number;
  }> = {},
): NormalizedLookupQuery {
  const minSearchLength = Math.max(options.minSearchLength ?? 2, 0);
  const search = input.trim().replace(/\s+/g, " ");

  if (!search || search.length < minSearchLength) {
    return {
      minSearchLength,
      rejectedRawId: false,
      search: null,
    };
  }

  if (isUuidLike(search)) {
    return {
      minSearchLength,
      rejectedRawId: true,
      search: null,
    };
  }

  return {
    minSearchLength,
    rejectedRawId: false,
    search,
  };
}

export function normalizeLookupOptions(
  options: readonly LookupOption[],
): readonly LookupOption[] {
  const seen = new Set<string>();
  const normalized: LookupOption[] = [];

  for (const option of options) {
    const id = option.id.trim();
    const label = option.label.trim().replace(/\s+/g, " ");
    const entityType = option.entityType.trim();

    if (!id || !label || !entityType) {
      continue;
    }

    const key = `${entityType}:${id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      ...option,
      entityType,
      id,
      label,
    });
  }

  return normalized;
}

export function toLookupInteraction(contract: LookupContract): LookupInteraction {
  return {
    allowRawIdInput: contract.allowRawIdInput,
    entityType: contract.entityType,
    minSearchLength: contract.minSearchLength,
    searchProviderKey: contract.searchProviderKey,
  };
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

import "server-only";

import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import type { PermissionKey } from "@/platform/permissions/public-api";
import {
  generateNavigation,
  registerCommands,
  type NavigationContext,
} from "@/platform/navigation/public-api";
import { financeAppManifest, FINANCE_PERMISSION_LIST } from "@/features/finance/public-api";
import { inventoryAppManifest, INVENTORY_PERMISSION_LIST } from "@/features/inventory/public-api";
import {
  manufacturingAppManifest,
  MANUFACTURING_PERMISSION_LIST,
} from "@/features/manufacturing/public-api";
import type { AppShellLauncher, ShellAction, SwitcherOption } from "@/shared/ui";

const TENANT_ID = "foundation-review-tenant";
const COMPANY_ID = "foundation-company";
const COMPANY_NAME = "Foundation Company";
const BRANCH_ID = "foundation-branch";
const BRANCH_NAME = "Foundation Branch";

const acceptedAppManifests = [
  financeAppManifest,
  inventoryAppManifest,
  manufacturingAppManifest,
] as const;

export const acceptedFoundationPermissions = [
  ...FINANCE_PERMISSION_LIST,
  ...INVENTORY_PERMISSION_LIST,
  ...MANUFACTURING_PERMISSION_LIST,
] as readonly PermissionKey[];

export type ErpRuntimeContext = Readonly<{
  tenantId: string;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  userName: string;
  permissions: readonly PermissionKey[];
}>;

function getRuntimeOrFallback(runtime?: ErpRuntimeContext): ErpRuntimeContext {
  return (
    runtime ?? {
      branchId: BRANCH_ID,
      branchName: BRANCH_NAME,
      companyId: COMPANY_ID,
      companyName: COMPANY_NAME,
      permissions: acceptedFoundationPermissions,
      tenantId: TENANT_ID,
      userName: "Foundation User",
    }
  );
}

export async function resolveErpRuntimeContext(): Promise<ErpRuntimeContext> {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [{ data: company, error: companyError }, { data: branch, error: branchError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, name")
        .eq("tenant_id", context.tenantId)
        .eq("id", context.companyId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("branches")
        .select("id, name")
        .eq("tenant_id", context.tenantId)
        .eq("id", context.branchId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

  if (companyError || !company) {
    throw companyError ?? new Error("Active company context could not be loaded.");
  }

  if (branchError || !branch) {
    throw branchError ?? new Error("Active branch context could not be loaded.");
  }

  return {
    branchId: context.branchId,
    branchName: branch.name as string,
    companyId: context.companyId,
    companyName: company.name as string,
    permissions: acceptedFoundationPermissions,
    tenantId: context.tenantId,
    userName:
      context.currentUser.displayName ??
      context.currentUser.email ??
      context.identity.displayName ??
      context.identity.email ??
      "ERP User",
  };
}

export function createErpShellSnapshot(runtime?: ErpRuntimeContext): AppRegistrySnapshot {
  const context = getRuntimeOrFallback(runtime);

  return {
    entitlements: acceptedAppManifests.map((manifest) => ({
      appKey: manifest.key,
      state: "enabled",
      tenantId: context.tenantId,
    })),
    installedApps: acceptedAppManifests.map((manifest) => ({
      appKey: manifest.key,
      installedVersion: manifest.version,
      state: "enabled",
      tenantId: context.tenantId,
    })),
    manifests: acceptedAppManifests,
  };
}

export function createErpShellContext(
  activePath = "/erp",
  runtime?: ErpRuntimeContext,
): NavigationContext {
  const context = getRuntimeOrFallback(runtime);

  return {
    activePath,
    branchId: context.branchId,
    companyId: context.companyId,
    enabledFeatureFlags: new Set(),
    experience: "erp",
    grantedPermissions: new Set(context.permissions),
    tenantId: context.tenantId,
  };
}

export function createErpShellModel(activePath = "/erp", runtime?: ErpRuntimeContext) {
  const snapshot = createErpShellSnapshot(runtime);
  const context = createErpShellContext(activePath, runtime);
  const navigation = generateNavigation(snapshot, context);
  const commandRegistry = registerCommands(snapshot.manifests, context);

  return {
    appLauncherItems: navigation.appLauncher.map((item) => ({
      href: item.href,
      isActive: item.isActive,
      key: item.key,
      label: item.label,
    })),
    commandItems: commandRegistry.commands.map((command) => ({
      description: command.description,
      group: command.category,
      href: command.href,
      key: command.key,
      label: command.label,
    })),
    quickActions: commandRegistry.quickActions.map((action) => ({
      group: "Quick actions",
      href: action.href,
      key: action.key,
      label: action.label,
    })),
  };
}

/**
 * Per-application accent colors as HSL triplets. Each workspace owns its identity
 * color, applied through the shell's `--accent` override.
 */
export const ERP_APP_ACCENTS: Readonly<Record<string, string>> = {
  finance: "221 83% 53%",
  inventory: "160 84% 39%",
  "master-data": "262 83% 58%",
  manufacturing: "25 95% 53%",
  purchasing: "189 94% 43%",
};

export function getErpAppAccent(appKey: string): string | undefined {
  return ERP_APP_ACCENTS[appKey];
}

/** Application Launcher data shared by every workspace shell. */
export function createErpLauncher(runtime?: ErpRuntimeContext): AppShellLauncher {
  const context = getRuntimeOrFallback(runtime);

  return {
    context: {
      branchId: context.branchId,
      companyId: context.companyId,
      permissions: [...context.permissions],
      tenantId: context.tenantId,
    },
    snapshot: createErpShellSnapshot(runtime),
  };
}

const ERP_THEME_OPTIONS: readonly ShellAction[] = [
  { isActive: true, label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];
const ERP_LANGUAGE_OPTIONS: readonly ShellAction[] = [
  { isActive: true, label: "English", value: "en" },
  { label: "Arabic", value: "ar" },
];

/**
 * Common top-bar chrome shared by every ERP workspace shell: the application
 * launcher, company/branch switchers, theme, and language controls.
 */
export function createErpShellChrome(appKey?: string, runtime?: ErpRuntimeContext) {
  const context = getRuntimeOrFallback(runtime);
  const companyOptions: readonly SwitcherOption[] = [
    { key: context.companyId, label: context.companyName },
  ];
  const branchOptions: readonly SwitcherOption[] = [
    { key: context.branchId, label: context.branchName },
  ];

  return {
    accent: appKey ? getErpAppAccent(appKey) : undefined,
    activeBranchKey: context.branchId,
    activeCompanyKey: context.companyId,
    branchOptions,
    companyOptions,
    languageOptions: ERP_LANGUAGE_OPTIONS,
    launcher: createErpLauncher(context),
    themeOptions: ERP_THEME_OPTIONS,
    user: {
      name: context.userName,
    },
  };
}

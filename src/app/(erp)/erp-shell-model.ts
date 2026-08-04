import "server-only";

import { cache } from "react";

import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { PLATFORM_FEATURE_FLAGS } from "@/platform/feature-flags/public-api";
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
import { hrAppManifest } from "@/features/hr/app.manifest";
import { HR_PERMISSION_LIST } from "@/features/hr/public-api";
import {
  administrationAppManifest,
  ADMINISTRATION_PERMISSION_LIST,
} from "@/features/administration/app.manifest";
import type { AppShellLauncher, ShellAction, SwitcherOption } from "@/shared/ui";

import {
  resolveAllowedAppKeysFailClosed,
  resolveGrantedPermissionsFailClosed,
} from "./erp-security.server";

const TENANT_ID = "foundation-review-tenant";
const COMPANY_ID = "foundation-company";
const COMPANY_NAME = "Foundation Company";
const BRANCH_ID = "foundation-branch";
const BRANCH_NAME = "Foundation Branch";

const acceptedAppManifests = [
  administrationAppManifest,
  financeAppManifest,
  inventoryAppManifest,
  manufacturingAppManifest,
  hrAppManifest,
] as const;

export const acceptedFoundationPermissions = [
  ...ADMINISTRATION_PERMISSION_LIST,
  ...FINANCE_PERMISSION_LIST,
  ...INVENTORY_PERMISSION_LIST,
  ...MANUFACTURING_PERMISSION_LIST,
  ...HR_PERMISSION_LIST,
] as readonly PermissionKey[];

export const acceptedFoundationFeatureFlags = [
  PLATFORM_FEATURE_FLAGS.foundationShell,
] as const;

export type ErpRuntimeContext = Readonly<{
  tenantId: string;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  userName: string;
  permissions: readonly PermissionKey[];
  allowedAppKeys: readonly string[];
}>;

function getRuntimeOrFallback(runtime?: ErpRuntimeContext): ErpRuntimeContext {
  return (
    runtime ?? {
      branchId: BRANCH_ID,
      branchName: BRANCH_NAME,
      companyId: COMPANY_ID,
      companyName: COMPANY_NAME,
      allowedAppKeys: [],
      permissions: [],
      tenantId: TENANT_ID,
      userName: "Foundation User",
    }
  );
}

async function resolveGrantedPermissions(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  tenantId: string,
): Promise<readonly PermissionKey[]> {
  const { data, error } = await supabase.rpc("list_granted_permission_keys", {
    check_tenant_id: tenantId,
  });

  if (error) {
    return resolveGrantedPermissionsFailClosed(
      acceptedFoundationPermissions.map((permission) => ({ error, permission })),
    );
  }

  const granted = new Set(
    ((data ?? []) as readonly unknown[]).filter(
      (permissionKey): permissionKey is string => typeof permissionKey === "string",
    ),
  );

  return resolveGrantedPermissionsFailClosed(
    acceptedFoundationPermissions.map((permission) => ({
      allowed: granted.has(permission),
      permission,
    })),
  );
}

async function resolveAllowedAppKeys(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  tenantId: string,
  userId: string,
): Promise<readonly string[]> {
  const acceptedAppKeys = acceptedAppManifests.map((manifest) => manifest.key);
  const { data, error } = await supabase
    .from("user_app_access")
    .select("app_key, is_enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("deleted_at", null);

  return resolveAllowedAppKeysFailClosed(acceptedAppKeys, data, error);
}

export const resolveErpRuntimeContext = cache(async function resolveErpRuntimeContext(): Promise<ErpRuntimeContext> {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [
    { data: company, error: companyError },
    { data: branch, error: branchError },
    permissions,
    allowedAppKeys,
  ] =
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
      resolveGrantedPermissions(supabase, context.tenantId),
      resolveAllowedAppKeys(supabase, context.tenantId, context.userId),
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
    allowedAppKeys,
    permissions,
    tenantId: context.tenantId,
    userName:
      context.currentUser.displayName ??
      context.currentUser.email ??
      context.identity.displayName ??
      context.identity.email ??
      "ERP User",
  };
});

export function createErpShellSnapshot(runtime?: ErpRuntimeContext): AppRegistrySnapshot {
  const context = getRuntimeOrFallback(runtime);

  return {
    entitlements: acceptedAppManifests.map((manifest) => {
      const isAllowed = context.allowedAppKeys.includes(manifest.key);

      return {
        appKey: manifest.key,
        state: isAllowed ? "enabled" : "disabled",
        tenantId: context.tenantId,
      };
    }),
    installedApps: acceptedAppManifests.map((manifest) => {
      const isAllowed = context.allowedAppKeys.includes(manifest.key);

      return {
        appKey: manifest.key,
        installedVersion: manifest.version,
        state: isAllowed ? "enabled" : "installed",
        tenantId: context.tenantId,
      };
    }),
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
    enabledFeatureFlags: new Set(acceptedFoundationFeatureFlags),
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
  hr: "340 82% 52%",
  purchasing: "189 94% 43%",
  administration: "214 84% 56%",
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
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];
const ERP_LANGUAGE_OPTIONS: readonly ShellAction[] = [
  { label: "English", value: "en" },
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

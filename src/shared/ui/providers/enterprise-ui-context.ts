"use client";

import { createContext, useContext } from "react";

import type { PermissionKey } from "@/platform/permissions/public-api";

import type { CompanyDateFormat } from "../dates/date-utils";
import type { Direction } from "../utils";

export type Locale = "en" | "ar";
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export type EnterpriseUiContextValue = Readonly<{
  dateFormat: CompanyDateFormat;
  locale: Locale;
  direction: Direction;
  permissions: ReadonlySet<PermissionKey>;
  hasPermission: (permission: PermissionKey) => boolean;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  theme: ThemePreference;
}>;

export const EnterpriseUiContext = createContext<EnterpriseUiContextValue | null>(null);

export function useEnterpriseUi(): EnterpriseUiContextValue {
  const context = useContext(EnterpriseUiContext);

  if (!context) {
    throw new Error("useEnterpriseUi must be used inside EnterpriseUiProvider.");
  }

  return context;
}

export function useEnterpriseTheme() {
  const { resolvedTheme, setTheme, theme } = useEnterpriseUi();
  return { resolvedTheme, setTheme, theme };
}

export function usePermission(permission: PermissionKey): boolean {
  return useEnterpriseUi().hasPermission(permission);
}

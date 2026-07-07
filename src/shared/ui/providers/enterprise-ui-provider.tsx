"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PermissionKey } from "@/platform/permissions/public-api";

import type { CompanyDateFormat } from "../dates/date-utils";
import { defaultDateFormatForLocale } from "../dates/date-utils";
import type { Direction } from "../utils";
import {
  EnterpriseUiContext,
  type EnterpriseUiContextValue,
  type Locale,
  type ResolvedTheme,
  type ThemePreference,
  usePermission,
} from "./enterprise-ui-context";

export type { EnterpriseUiContextValue, Locale, ResolvedTheme, ThemePreference } from "./enterprise-ui-context";
export { useEnterpriseTheme, useEnterpriseUi, usePermission } from "./enterprise-ui-context";

const THEME_STORAGE_KEY = "nexora-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function EnterpriseUiProvider({
  children,
  dateFormat,
  locale = "en",
  direction = locale === "ar" ? "rtl" : "ltr",
  permissions = [],
}: Readonly<{
  children: ReactNode;
  dateFormat?: CompanyDateFormat;
  locale?: Locale;
  direction?: Direction;
  permissions?: readonly PermissionKey[];
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const nextResolvedTheme = theme === "system" ? getSystemTheme() : theme;
      document.documentElement.dataset.theme = nextResolvedTheme;
      setResolvedTheme(nextResolvedTheme);
    }

    applyTheme();

    if (theme !== "system") {
      return undefined;
    }

    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  const resolvedDateFormat = dateFormat ?? defaultDateFormatForLocale(locale);

  const contextValue = useMemo<EnterpriseUiContextValue>(
    () => ({
      dateFormat: resolvedDateFormat,
      direction,
      hasPermission: (permission) => permissionSet.has(permission),
      locale,
      permissions: permissionSet,
      resolvedTheme,
      setTheme,
      theme,
    }),
    [direction, locale, permissionSet, resolvedDateFormat, resolvedTheme, setTheme, theme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <EnterpriseUiContext.Provider value={contextValue}>
        {children}
      </EnterpriseUiContext.Provider>
    </QueryClientProvider>
  );
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: Readonly<{
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}>) {
  return usePermission(permission) ? children : fallback;
}

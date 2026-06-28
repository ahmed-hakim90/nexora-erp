"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PermissionKey } from "@/platform/permissions/public-api";

import type { Direction } from "../utils";

export type Locale = "en" | "ar";
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export type EnterpriseUiContextValue = Readonly<{
  locale: Locale;
  direction: Direction;
  permissions: ReadonlySet<PermissionKey>;
  hasPermission: (permission: PermissionKey) => boolean;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  theme: ThemePreference;
}>;

const EnterpriseUiContext = createContext<EnterpriseUiContextValue | null>(null);
const THEME_STORAGE_KEY = "nexora-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function EnterpriseUiProvider({
  children,
  locale = "en",
  direction = locale === "ar" ? "rtl" : "ltr",
  permissions = [],
}: Readonly<{
  children: ReactNode;
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

  const contextValue = useMemo<EnterpriseUiContextValue>(
    () => ({
      direction,
      hasPermission: (permission) => permissionSet.has(permission),
      locale,
      permissions: permissionSet,
      resolvedTheme,
      setTheme,
      theme,
    }),
    [direction, locale, permissionSet, resolvedTheme, setTheme, theme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <EnterpriseUiContext.Provider value={contextValue}>
        {children}
      </EnterpriseUiContext.Provider>
    </QueryClientProvider>
  );
}

export function useEnterpriseUi(): EnterpriseUiContextValue {
  const context = useContext(EnterpriseUiContext);

  if (!context) {
    throw new Error("useEnterpriseUi must be used inside EnterpriseUiProvider.");
  }

  return context;
}

export function usePermission(permission: PermissionKey): boolean {
  return useEnterpriseUi().hasPermission(permission);
}

export function useEnterpriseTheme() {
  const { resolvedTheme, setTheme, theme } = useEnterpriseUi();
  return { resolvedTheme, setTheme, theme };
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

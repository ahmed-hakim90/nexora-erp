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
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  directionForLocale,
  htmlLangForLocale,
  parseLocale,
  translate,
  type MessageKey,
  type MessageParams,
} from "@/platform/localization/public-api";

import type { CompanyDateFormat } from "../dates/date-utils";
import { defaultDateFormatForLocale } from "../dates/date-utils";
import {
  EnterpriseUiContext,
  type EnterpriseUiContextValue,
  type Locale,
  type ResolvedTheme,
  type ThemePreference,
  usePermission,
} from "./enterprise-ui-context";

export type { EnterpriseUiContextValue, Locale, ResolvedTheme, ThemePreference } from "./enterprise-ui-context";
export {
  useEnterpriseTheme,
  useEnterpriseUi,
  usePermission,
  useTranslations,
} from "./enterprise-ui-context";

const THEME_STORAGE_KEY = "nexora-theme";
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.lang = htmlLangForLocale(locale);
  root.dir = directionForLocale(locale);
  root.dataset.locale = locale;
}

export function EnterpriseUiProvider({
  children,
  dateFormat,
  locale: initialLocale = DEFAULT_LOCALE,
  permissions = [],
}: Readonly<{
  children: ReactNode;
  dateFormat?: CompanyDateFormat;
  locale?: Locale;
  /** @deprecated Direction is derived from locale. Kept for call-site compatibility. */
  direction?: "rtl" | "ltr";
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
  const [locale, setLocaleState] = useState<Locale>(() => parseLocale(initialLocale));
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

  const setLocale = useCallback((nextLocale: Locale) => {
    const resolved = parseLocale(nextLocale);
    setLocaleState(resolved);
    persistLocale(resolved);
    applyDocumentLocale(resolved);
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale);
  }, [locale]);

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

  const direction = directionForLocale(locale);
  const resolvedDateFormat = dateFormat ?? defaultDateFormatForLocale(locale);
  const t = useCallback(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  );

  const contextValue = useMemo<EnterpriseUiContextValue>(
    () => ({
      dateFormat: resolvedDateFormat,
      direction,
      hasPermission: (permission) => permissionSet.has(permission),
      locale,
      permissions: permissionSet,
      resolvedTheme,
      setLocale,
      setTheme,
      t,
      theme,
    }),
    [direction, locale, permissionSet, resolvedDateFormat, resolvedTheme, setLocale, setTheme, t, theme],
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

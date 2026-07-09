import type { SupportedLocale, TextDirection } from "./types";

export const LOCALE_COOKIE_NAME = "nexora_locale";
export const LOCALE_STORAGE_KEY = "nexora-locale";
export const DEFAULT_LOCALE: SupportedLocale = "en";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "ar" || value === "en";
}

export function parseLocale(value: string | null | undefined): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function directionForLocale(locale: SupportedLocale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function htmlLangForLocale(locale: SupportedLocale): string {
  return locale === "ar" ? "ar" : "en";
}

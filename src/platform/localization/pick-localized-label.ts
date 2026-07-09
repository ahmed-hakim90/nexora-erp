import type { SupportedLocale } from "./types";

/** Prefer Arabic label when locale is ar and an Arabic value exists. */
export function pickLocalizedLabel(
  locale: SupportedLocale,
  english: string,
  arabic?: string | null,
): string {
  if (locale === "ar" && arabic && arabic.trim()) {
    return arabic;
  }
  return english;
}

import {
  format,
  isValid,
  parse,
  parseISO,
  type Locale as DateFnsLocale,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";

import type { Locale } from "../providers/enterprise-ui-context";

/** Canonical storage / form value format (always ISO date). */
export const ISO_DATE_FORMAT = "yyyy-MM-dd";

/** Preset display formats aligned with common company preferences. */
export type CompanyDateFormat =
  | "iso"
  | "us"
  | "eu"
  | "medium"
  | "long";

const DISPLAY_FORMATS: Readonly<Record<CompanyDateFormat, string>> = {
  eu: "dd/MM/yyyy",
  iso: "yyyy-MM-dd",
  long: "PPP",
  medium: "PP",
  us: "MM/dd/yyyy",
};

export function dateFnsLocaleFor(locale: Locale): DateFnsLocale {
  return locale === "ar" ? ar : enUS;
}

export function defaultDateFormatForLocale(locale: Locale): CompanyDateFormat {
  return locale === "ar" ? "eu" : "us";
}

export function resolveDisplayFormat(
  dateFormat: CompanyDateFormat | undefined,
  locale: Locale,
): string {
  return DISPLAY_FORMATS[dateFormat ?? defaultDateFormatForLocale(locale)];
}

export function parseIsoDate(value: string | null | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = parseISO(value.trim());
  return isValid(parsed) ? parsed : undefined;
}

export function toIsoDate(value: Date | undefined): string {
  if (!value || !isValid(value)) return "";
  return format(value, ISO_DATE_FORMAT);
}

export function formatDisplayDate(
  value: Date | undefined,
  options: Readonly<{
    dateFormat?: CompanyDateFormat;
    locale: Locale;
  }>,
): string {
  if (!value || !isValid(value)) return "";
  return format(value, resolveDisplayFormat(options.dateFormat, options.locale), {
    locale: dateFnsLocaleFor(options.locale),
  });
}

export function parseDisplayDate(
  value: string,
  options: Readonly<{
    dateFormat?: CompanyDateFormat;
    locale: Locale;
  }>,
): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const displayFormat = resolveDisplayFormat(options.dateFormat, options.locale);
  const parsed = parse(trimmed, displayFormat, new Date(), {
    locale: dateFnsLocaleFor(options.locale),
  });
  if (isValid(parsed)) return parsed;

  const isoParsed = parseIsoDate(trimmed);
  return isoParsed;
}

export function clampDateToBounds(
  value: Date,
  min?: Date,
  max?: Date,
): Date {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

const DEFAULT_CALENDAR_YEARS_BACK = 100;
const DEFAULT_CALENDAR_YEARS_FORWARD = 10;

export function getCalendarNavigationBounds(options?: Readonly<{
  max?: Date;
  min?: Date;
  yearsBack?: number;
  yearsForward?: number;
}>): Readonly<{ endMonth: Date; startMonth: Date }> {
  const today = new Date();
  const yearsBack = options?.yearsBack ?? DEFAULT_CALENDAR_YEARS_BACK;
  const yearsForward = options?.yearsForward ?? DEFAULT_CALENDAR_YEARS_FORWARD;

  return {
    endMonth: options?.max ?? new Date(today.getFullYear() + yearsForward, 11, 1),
    startMonth: options?.min ?? new Date(today.getFullYear() - yearsBack, 0, 1),
  };
}

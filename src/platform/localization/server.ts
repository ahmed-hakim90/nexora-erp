import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  directionForLocale,
  parseLocale,
  type SupportedLocale,
  type TextDirection,
} from "./public-api";

export type ResolvedLocalePreference = Readonly<{
  locale: SupportedLocale;
  direction: TextDirection;
}>;

export async function resolveLocalePreference(): Promise<ResolvedLocalePreference> {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);

  return {
    direction: directionForLocale(locale),
    locale,
  };
}

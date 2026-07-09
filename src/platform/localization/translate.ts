import { arMessages } from "./messages/ar";
import { enMessages, type MessageKey } from "./messages/en";
import type { MessageParams, SupportedLocale } from "./types";

const catalogs: Record<SupportedLocale, Record<MessageKey, string>> = {
  ar: arMessages,
  en: enMessages,
};

function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  locale: SupportedLocale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const catalog = catalogs[locale] ?? catalogs.en;
  const template = catalog[key] ?? enMessages[key] ?? key;
  return interpolate(template, params);
}

export type TranslateFn = (
  key: MessageKey,
  params?: MessageParams,
) => string;

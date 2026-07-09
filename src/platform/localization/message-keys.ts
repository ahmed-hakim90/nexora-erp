import { enMessages, type MessageKey } from "./messages/en";
import type { SupportedLocale } from "./types";

const APP_MESSAGE_KEYS = [
  "apps.hr",
  "apps.finance",
  "apps.inventory",
  "apps.manufacturing",
  "apps.master-data",
  "apps.administration",
] as const satisfies readonly MessageKey[];

const NAV_GROUP_MESSAGE_KEYS = [
  "nav.group.overview",
  "nav.group.personal",
  "nav.group.employment",
  "nav.group.financial",
  "nav.group.attendance",
  "nav.group.payroll",
  "nav.group.talent",
  "nav.group.documents",
  "nav.group.reports",
  "nav.group.operations",
  "nav.group.master-data",
  "nav.group.transactions",
  "nav.group.administration",
  "nav.group.settings",
  "nav.group.general",
] as const satisfies readonly MessageKey[];

export function isMessageKey(value: string): value is MessageKey {
  return Object.prototype.hasOwnProperty.call(enMessages, value);
}

export function appMessageKey(appKey: string): MessageKey | null {
  const key = `apps.${appKey}`;
  return isMessageKey(key) ? key : null;
}

export function navGroupMessageKey(groupKey: string): MessageKey | null {
  const key = `nav.group.${groupKey}`;
  return isMessageKey(key) ? key : null;
}

export function localizeAppName(
  locale: SupportedLocale,
  appKey: string,
  fallback: string,
  translate: (key: MessageKey) => string,
): string {
  const key = appMessageKey(appKey);
  return key ? translate(key) : fallback;
}

export { APP_MESSAGE_KEYS, NAV_GROUP_MESSAGE_KEYS };

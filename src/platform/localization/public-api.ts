export type { SupportedLocale, TextDirection, MessageParams } from "./types";
export type { MessageKey } from "./messages/en";
export { enMessages } from "./messages/en";
export { arMessages } from "./messages/ar";
export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  directionForLocale,
  htmlLangForLocale,
  isSupportedLocale,
  parseLocale,
} from "./locale-preference";
export { translate, type TranslateFn } from "./translate";
export {
  APP_MESSAGE_KEYS,
  NAV_GROUP_MESSAGE_KEYS,
  appMessageKey,
  isMessageKey,
  localizeAppName,
  navGroupMessageKey,
} from "./message-keys";
export { pickLocalizedLabel } from "./pick-localized-label";

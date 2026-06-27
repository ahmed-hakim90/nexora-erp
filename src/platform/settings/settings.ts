export type PlatformSettingKey = string & {
  readonly __brand: "PlatformSettingKey";
};

export type PlatformSettingValue = string | number | boolean | null;

export function definePlatformSettingKey(value: string): PlatformSettingKey {
  if (!value.includes(".")) {
    throw new Error("Platform setting keys must use dot notation.");
  }

  return value as PlatformSettingKey;
}

export const PLATFORM_SETTINGS = {
  defaultLocale: definePlatformSettingKey("platform.localization.default-locale"),
  defaultTimezone: definePlatformSettingKey("platform.localization.default-timezone"),
} as const;

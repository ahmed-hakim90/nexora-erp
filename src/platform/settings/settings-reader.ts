import type { PlatformSettingKey, PlatformSettingValue } from "./settings";

export type SettingsSnapshot = Readonly<Record<PlatformSettingKey, PlatformSettingValue>>;

export function readSetting(
  settings: SettingsSnapshot,
  key: PlatformSettingKey,
): PlatformSettingValue {
  return settings[key] ?? null;
}

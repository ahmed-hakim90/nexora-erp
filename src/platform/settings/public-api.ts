export {
  PLATFORM_SETTINGS,
  definePlatformSettingKey,
} from "./settings";
export { readSetting } from "./settings-reader";
export { defineCompanyBranding } from "@/platform/branding/public-api";
export type {
  BrandingContext,
  BrandingScope,
  CompanyBranding,
} from "@/platform/branding/public-api";
export type {
  PlatformSettingKey,
  PlatformSettingValue,
} from "./settings";
export type { SettingsSnapshot } from "./settings-reader";

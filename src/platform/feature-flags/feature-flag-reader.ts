import type { FeatureFlagKey } from "./feature-flag";

export type FeatureFlagSnapshot = Readonly<Record<FeatureFlagKey, boolean>>;

export function isFeatureEnabled(
  flags: FeatureFlagSnapshot,
  flag: FeatureFlagKey,
): boolean {
  return flags[flag] === true;
}

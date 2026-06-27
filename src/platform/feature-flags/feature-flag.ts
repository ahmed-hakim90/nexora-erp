export type FeatureFlagKey = string & { readonly __brand: "FeatureFlagKey" };

export function defineFeatureFlag(value: string): FeatureFlagKey {
  if (!value.includes(".")) {
    throw new Error("Feature flags must use dot notation.");
  }

  return value as FeatureFlagKey;
}

export const PLATFORM_FEATURE_FLAGS = {
  foundationShell: defineFeatureFlag("platform.foundation-shell.enabled"),
} as const;

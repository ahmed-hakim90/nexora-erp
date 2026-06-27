export type PermissionKey = string & { readonly __brand: "PermissionKey" };

export function definePermissionKey(value: string): PermissionKey {
  if (!value.includes(".")) {
    throw new Error("Permission keys must use dot notation.");
  }

  return value as PermissionKey;
}

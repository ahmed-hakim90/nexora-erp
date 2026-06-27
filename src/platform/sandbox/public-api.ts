export type SandboxTenant = Readonly<{
  tenantId: string;
  label: string;
  resettable: boolean;
  externalSideEffectsAllowed: false;
}>;

export type DemoDataset = Readonly<{
  key: string;
  label: string;
  appKeys: readonly string[];
  syntheticData: true;
}>;

export type SandboxActorMode = "real-user" | "role-preview" | "demo-guide";

export type SandboxResetRequest = Readonly<{
  tenantId: string;
  requestedByUserId: string;
  datasetKeys: readonly string[];
  reason: string;
}>;

export function defineDemoDataset<TDataset extends DemoDataset>(
  dataset: TDataset,
): TDataset {
  return dataset;
}

export function isSandboxTenant(tenant: SandboxTenant): boolean {
  return tenant.resettable && tenant.externalSideEffectsAllowed === false;
}

import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type TestCategory =
  | "unit"
  | "integration"
  | "rls"
  | "permission"
  | "workflow"
  | "approval"
  | "performance"
  | "e2e";

export type PlatformTestContext = Readonly<{
  tenantId: string;
  companyId?: string;
  branchId?: string;
  userId: string;
  experience: AccessExperience;
  permissions: readonly PermissionKey[];
}>;

export type TestTenantFactory = Readonly<{
  key: string;
  createContext(seed?: Record<string, unknown>): PlatformTestContext;
}>;

export type RlsTestScenario = Readonly<{
  key: string;
  tableName: string;
  allowedContext: PlatformTestContext;
  deniedContext: PlatformTestContext;
  operation: "select" | "insert" | "update" | "delete";
}>;

export type PermissionTestScenario = Readonly<{
  key: string;
  permission: PermissionKey;
  allowedContext: PlatformTestContext;
  deniedContext: PlatformTestContext;
}>;

export type WorkflowTestScenario = Readonly<{
  key: string;
  workflowKey: string;
  fromStatus: string;
  transitionKey: string;
  expectedStatus: string;
  requiredPermission?: PermissionKey;
}>;

export type ApprovalTestScenario = Readonly<{
  key: string;
  policyKey: string;
  actorUserId: string;
  requestedByUserId?: string;
  expectedDecisionAllowed: boolean;
}>;

export type PerformanceBudget = Readonly<{
  key: string;
  category: "query" | "search" | "report" | "print" | "dashboard" | "job" | "e2e";
  maxDurationMs: number;
  maxRowsScanned?: number;
  maxPayloadBytes?: number;
}>;

export type E2EFlowDefinition = Readonly<{
  key: string;
  experience: AccessExperience;
  description: string;
  requiredApps: readonly string[];
  requiredPermissions: readonly PermissionKey[];
}>;

export function defineRlsTestScenario<TScenario extends RlsTestScenario>(
  scenario: TScenario,
): TScenario {
  return scenario;
}

export function definePerformanceBudget<TBudget extends PerformanceBudget>(
  budget: TBudget,
): TBudget {
  return budget;
}

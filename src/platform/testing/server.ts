import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  ApprovalTestScenario,
  PerformanceBudget,
  PermissionTestScenario,
  PlatformTestContext,
  RlsTestScenario,
  WorkflowTestScenario,
} from "./public-api";

export function createPlatformTestContext(
  context: PlatformTestContext,
): PlatformTestContext {
  return context;
}

export function assertRlsIsolation(scenario: RlsTestScenario): void {
  if (scenario.allowedContext.tenantId === scenario.deniedContext.tenantId) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "RLS isolation scenarios require distinct tenant contexts.",
    });
  }
}

export function assertPermissionMatrix(scenario: PermissionTestScenario): void {
  const allowed = scenario.allowedContext.permissions.includes(scenario.permission);
  const denied = scenario.deniedContext.permissions.includes(scenario.permission);

  if (!allowed || denied) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Permission test scenario does not model allowed and denied contexts correctly.",
    });
  }
}

export function assertWorkflowTransition(scenario: WorkflowTestScenario): void {
  if (scenario.fromStatus === scenario.expectedStatus) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Workflow test scenario must verify a meaningful status transition.",
    });
  }
}

export function assertApprovalPolicy(scenario: ApprovalTestScenario): void {
  if (
    scenario.expectedDecisionAllowed === true &&
    scenario.requestedByUserId &&
    scenario.actorUserId === scenario.requestedByUserId
  ) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Approval test scenario allows self-approval without an explicit policy exception.",
    });
  }
}

export function assertPerformanceBudget(params: {
  budget: PerformanceBudget;
  durationMs: number;
  rowsScanned?: number;
  payloadBytes?: number;
}): void {
  if (params.durationMs > params.budget.maxDurationMs) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: `Performance budget ${params.budget.key} exceeded duration limit.`,
    });
  }

  if (
    params.budget.maxRowsScanned !== undefined &&
    (params.rowsScanned ?? 0) > params.budget.maxRowsScanned
  ) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: `Performance budget ${params.budget.key} exceeded row scan limit.`,
    });
  }

  if (
    params.budget.maxPayloadBytes !== undefined &&
    (params.payloadBytes ?? 0) > params.budget.maxPayloadBytes
  ) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: `Performance budget ${params.budget.key} exceeded payload size limit.`,
    });
  }
}

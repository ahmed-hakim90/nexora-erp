import "server-only";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type {
  ApprovalDecisionCommand,
  ApprovalPolicyDefinition,
  ApprovalStepDefinition,
} from "./public-api";

export function validateApprovalPolicy(policy: ApprovalPolicyDefinition): void {
  if (policy.steps.length === 0) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Approval policy must contain at least one step.",
    });
  }

  const stepKeys = new Set<string>();

  for (const step of policy.steps) {
    if (stepKeys.has(step.key)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Approval step keys must be unique.",
      });
    }

    stepKeys.add(step.key);
  }
}

export function validateApprovalDecision(params: {
  context: TenantRequestContext;
  step: ApprovalStepDefinition;
  command: ApprovalDecisionCommand;
}): void {
  if (params.command.tenantId !== params.context.tenantId) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Approval decision tenant does not match request context.",
      correlationId: params.context.correlationId,
    });
  }

  if (
    params.step.allowSelfApproval !== true &&
    params.command.actor.userId === params.command.requestedByUserId
  ) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Self-approval is not allowed for this approval step.",
      correlationId: params.context.correlationId,
    });
  }
}

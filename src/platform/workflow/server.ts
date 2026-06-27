import "server-only";

import { ApplicationError } from "@/core/errors";
import { ok, type Result } from "@/core/result";
import type { TenantRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { definePermissionKey } from "@/platform/permissions/public-api";

import type {
  WorkflowDefinition,
  WorkflowGuardResult,
  WorkflowTransitionCommand,
  WorkflowTransitionResult,
} from "./public-api";

export type WorkflowGuard = Readonly<{
  key: string;
  evaluate(command: WorkflowTransitionCommand): Promise<WorkflowGuardResult>;
}>;

export type WorkflowHook = Readonly<{
  key: string;
  run(command: WorkflowTransitionCommand): Promise<void>;
}>;

export async function validateWorkflowTransition(params: {
  context: TenantRequestContext;
  definition: WorkflowDefinition;
  command: WorkflowTransitionCommand;
  guards?: readonly WorkflowGuard[];
}): Promise<WorkflowTransitionResult> {
  const transition = params.definition.transitions.find(
    (candidate) => candidate.key === params.command.transitionKey,
  );

  if (!transition) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Workflow transition is not defined.",
      correlationId: params.context.correlationId,
    });
  }

  if (transition.from !== params.command.currentStatus) {
    throw new ApplicationError({
      code: "CONFLICT",
      message: "Workflow transition does not match the current state.",
      correlationId: params.context.correlationId,
    });
  }

  const currentState = params.definition.states.find(
    (state) => state.key === params.command.currentStatus,
  );

  if (currentState?.isTerminal) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Terminal workflow states cannot transition.",
      correlationId: params.context.correlationId,
    });
  }

  if (transition.requiredPermission) {
    await requirePermission({
      context: params.context,
      permission: definePermissionKey(transition.requiredPermission),
    });
  }

  for (const guardKey of transition.guardKeys ?? []) {
    const guard = params.guards?.find((candidate) => candidate.key === guardKey);

    if (!guard) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Workflow guard is not registered.",
        correlationId: params.context.correlationId,
      });
    }

    const result = await guard.evaluate(params.command);

    if (!result.allowed) {
      throw new ApplicationError({
        code: "BUSINESS_RULE_VIOLATION",
        message: result.reason,
        correlationId: params.context.correlationId,
      });
    }
  }

  return {
    from: transition.from,
    to: transition.to,
    transitionKey: transition.key,
  };
}

export async function runWorkflowHooks(params: {
  command: WorkflowTransitionCommand;
  hookKeys?: readonly string[];
  hooks?: readonly WorkflowHook[];
}): Promise<Result<void>> {
  for (const hookKey of params.hookKeys ?? []) {
    const hook = params.hooks?.find((candidate) => candidate.key === hookKey);

    if (!hook) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Workflow hook is not registered.",
      });
    }

    await hook.run(params.command);
  }

  return ok(undefined);
}

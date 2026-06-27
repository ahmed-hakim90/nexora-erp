import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  DocumentLifecycleCommand,
  DocumentLifecycleDefinition,
  DocumentLifecycleResult,
  PlatformDocumentDefinition,
} from "./public-api";

export function executeDocumentLifecycleCommand(params: {
  definition: DocumentLifecycleDefinition;
  command: DocumentLifecycleCommand;
}): DocumentLifecycleResult {
  const transition = params.definition.transitions.find(
    (candidate) =>
      candidate.command === params.command.command &&
      candidate.from === params.command.currentState,
  );

  if (!transition) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Document lifecycle command is not allowed from the current state.",
    });
  }

  if (params.definition.terminalStates.includes(params.command.currentState)) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Terminal document states cannot transition.",
    });
  }

  return {
    command: params.command.command,
    documentId: params.command.documentId,
    from: transition.from,
    to: transition.to,
  };
}

export function validateDocumentDefinition(
  definition: PlatformDocumentDefinition,
): void {
  if (definition.capabilities.length === 0) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Document definitions must declare at least one capability.",
    });
  }
}

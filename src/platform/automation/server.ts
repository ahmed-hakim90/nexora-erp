import "server-only";

import { ApplicationError } from "@/core/errors";

import type { AiActionDefinition, AutomationDefinition } from "./public-api";

export function validateAutomationDefinition(definition: AutomationDefinition): void {
  if (!definition.key || !definition.appKey) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Automation definitions require stable app and automation keys.",
    });
  }
}

export function validateAiActionDefinition(definition: AiActionDefinition): void {
  if (definition.mode === "execute" && !definition.contextPolicy.requiresHumanApproval) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Executable AI actions require an explicit human-approval policy.",
    });
  }

  if (definition.contextPolicy.includeSensitiveData && definition.contextPolicy.retentionPolicy !== "none") {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Sensitive AI contexts cannot be retained by default.",
    });
  }
}

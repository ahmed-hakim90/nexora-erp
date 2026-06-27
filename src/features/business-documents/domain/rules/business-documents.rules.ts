import { ApplicationError } from "@/core/errors";

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/;
const TERMINAL_STATUSES = new Set(["cancelled", "closed"]);

export function assertGenericDocumentKey(value: string, label: string): void {
  if (!KEY_PATTERN.test(value)) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: `${label} must be a lowercase generic key.`,
    });
  }
}

export function assertDocumentCanChangeStatus(currentStatus: string, nextStatus: string): void {
  if (TERMINAL_STATUSES.has(currentStatus) && currentStatus !== nextStatus) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Closed or cancelled documents cannot move to another status.",
    });
  }
}

import "server-only";

import { ApplicationError } from "@/core/errors";

import type { NotificationIntent } from "./public-api";

export function validateNotificationIntent(intent: NotificationIntent): void {
  const hasRecipient = Boolean(
    intent.recipientUserId ||
      intent.recipientRoleKey ||
      intent.recipientPermissionKey,
  );

  if (!hasRecipient || !intent.templateKey) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Notification intent requires recipient and template.",
    });
  }
}

import type { HrDashboardActionQueueItem, HrDashboardAlert } from "@/features/hr/application/types/hr-ui.types";
import { translateHrActionType, translateHrViolationKind } from "@/features/hr/public-api";
import type { MessageKey } from "@/platform/localization/messages/en";
import type { TranslateFn } from "@/platform/localization/translate";

export function resolveHrDashboardActionQueueLabel(t: TranslateFn, item: HrDashboardActionQueueItem): string {
  const params = { ...item.labelParams };
  if (item.kind === "late_early" && params.violation) {
    params.violation = translateHrViolationKind(t, String(params.violation));
  }
  if (item.kind === "hr_request" && params.requestType) {
    params.requestType = translateHrActionType(t, String(params.requestType));
  }
  return t(item.labelKey as MessageKey, params);
}

export function resolveHrDashboardAlertLabel(t: TranslateFn, alert: HrDashboardAlert): string {
  return t(alert.labelKey as MessageKey, alert.labelParams);
}

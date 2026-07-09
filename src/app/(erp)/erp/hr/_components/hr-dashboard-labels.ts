import type { HrDashboardActionQueueItem } from "@/features/hr/application/types/hr-ui.types";
import { translateHrActionType, translateHrViolationKind } from "@/features/hr/public-api";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function resolveHrDashboardActionQueueLabel(t: TranslateFn, item: HrDashboardActionQueueItem): string {
  const params = { ...item.labelParams };
  if (item.kind === "late_early" && params.violation) {
    params.violation = translateHrViolationKind(t, String(params.violation));
  }
  if (item.kind === "hr_request" && params.requestType) {
    params.requestType = translateHrActionType(t, String(params.requestType));
  }
  return t(item.labelKey, params);
}

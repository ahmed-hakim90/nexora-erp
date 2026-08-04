/**
 * MFG-02: routing readiness — steps present with operation + work center.
 * Does not schedule or start operations.
 */

export type RoutingReadinessStepInput = Readonly<{
  stepSequence: number;
  operationId: string;
  workCenterId: string;
  status: string;
}>;

export type RoutingReadinessResult = Readonly<{
  ready: boolean;
  reasons: readonly string[];
  activeStepCount: number;
  totalStepCount: number;
}>;

const USABLE_STEP_STATUSES = new Set(["draft", "active"]);

export function assessRoutingReadiness(input: Readonly<{
  status: string;
  steps: readonly RoutingReadinessStepInput[];
}>): RoutingReadinessResult {
  const reasons: string[] = [];
  const normalizedStatus = String(input.status ?? "").trim().toLowerCase();
  const usableSteps = input.steps.filter((step) => USABLE_STEP_STATUSES.has(String(step.status).trim().toLowerCase()));

  if (usableSteps.length < 1) {
    reasons.push("Routing needs at least one draft or active step.");
  }

  for (const step of usableSteps) {
    if (!String(step.operationId ?? "").trim()) {
      reasons.push(`Step ${step.stepSequence} is missing an operation.`);
    }
    if (!String(step.workCenterId ?? "").trim()) {
      reasons.push(`Step ${step.stepSequence} is missing a work center.`);
    }
  }

  const headerReady = normalizedStatus === "active" || normalizedStatus === "released";
  if (!headerReady) {
    reasons.push("Routing header must be active before release readiness.");
  }

  return {
    activeStepCount: usableSteps.length,
    ready: reasons.length === 0,
    reasons,
    totalStepCount: input.steps.length,
  };
}

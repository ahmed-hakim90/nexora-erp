import { ApplicationError } from "@/core/errors";

import type { ManufacturingMutationInput, ProductionStandardResolutionPriority } from "../../application/types";

export const PRODUCTION_STANDARD_RESOLUTION_PRIORITY: ProductionStandardResolutionPriority = [
  "product + line + shift",
  "product + line",
  "product default manufacturing target placeholder",
];

export const FUTURE_WORKER_ACHIEVEMENT_FORMULA = {
  targetPerWorker: "production standard daily target quantity / counted production workers",
  workerAchievementPercent: "worker_output_qty / target_per_worker * 100",
} as const;

const executableProductionConcepts = [
  "productionSessionId",
  "productionReportId",
  "productionPlanId",
  "inventoryPostingId",
  "attendanceRecordId",
];

const manufacturingStatuses = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"];

export function assertFoundationOnlyInput(input: ManufacturingMutationInput) {
  for (const key of executableProductionConcepts) {
    if (key in input && input[key]) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Sprint 12 manufacturing foundation cannot reference production execution, inventory posting, or attendance records.",
      });
    }
  }
}

export function assertBomFoundationRules(input: ManufacturingMutationInput) {
  assertFoundationOnlyInput(input);

  if (input.status && !manufacturingStatuses.includes(String(input.status))) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "BOM status is not supported." });
  }
}

export function assertRoutingFoundationRules(input: ManufacturingMutationInput) {
  assertFoundationOnlyInput(input);

  for (const field of ["totalStandardTimeSeconds", "totalManTimeSeconds", "targetUnitSeconds"]) {
    if (input[field] !== undefined && Number(input[field]) < 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Routing time values cannot be negative." });
    }
  }
}

export function assertProductionStandardFoundationRules(input: ManufacturingMutationInput) {
  assertFoundationOnlyInput(input);

  if (input.dailyTargetQty !== undefined && Number(input.dailyTargetQty) <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Production standard daily target quantity must be greater than zero." });
  }

  if (input.standardCrewSize !== undefined && Number(input.standardCrewSize) <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Production standard crew size must be greater than zero." });
  }
}

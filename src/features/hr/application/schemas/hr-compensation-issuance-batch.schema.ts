import { z } from "zod";

import {
  HR_COMPENSATION_ISSUANCE_AMOUNT_MODES,
  HR_COMPENSATION_ISSUANCE_DOCUMENT_KINDS,
  HR_COMPENSATION_ISSUANCE_MAX_LINES,
  HR_COMPENSATION_ISSUANCE_SELECTION_MODES,
} from "../constants/hr-compensation-issuance.constants";

const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveAmount = z.number().positive("Amount must be greater than zero.");
const nonNegativeAmount = z.number().min(0);

export const hrCompensationIssuanceImportLineSchema = z.object({
  amount: nonNegativeAmount.optional(),
  employeeId: uuid,
  employeeNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

export const hrCompensationIssuanceSelectionFiltersSchema = z.object({
  branchIds: z.array(uuid).optional(),
  departmentIds: z.array(uuid).optional(),
  employeeIds: z.array(uuid).optional(),
  employmentStatuses: z.array(z.string().min(1)).optional(),
  excludeEmployeeIds: z.array(uuid).optional(),
  importLines: z.array(hrCompensationIssuanceImportLineSchema).optional(),
  payrollGroupIds: z.array(uuid).optional(),
  positionIds: z.array(uuid).optional(),
});

export const hrCompensationIssuanceAmountConfigSchema = z.object({
  amount: positiveAmount.optional(),
  byPosition: z.record(uuid, positiveAmount).optional(),
  defaultAmount: positiveAmount.optional(),
});

export const hrCompensationIssuanceCreateDraftSchema = z
  .object({
    amountConfig: hrCompensationIssuanceAmountConfigSchema.default({}),
    amountMode: z.enum(HR_COMPENSATION_ISSUANCE_AMOUNT_MODES),
    branchId: uuid.optional(),
    currencyCode: z.string().trim().min(3).max(3).default("SAR"),
    documentKind: z.enum(HR_COMPENSATION_ISSUANCE_DOCUMENT_KINDS),
    documentSubtype: z.string().trim().min(1),
    effectiveDate: dateString,
    notes: z.string().trim().optional(),
    payrollPeriod: z.string().trim().optional(),
    reason: z.string().trim().optional(),
    selectionFilters: hrCompensationIssuanceSelectionFiltersSchema.default({}),
    selectionMode: z.enum(HR_COMPENSATION_ISSUANCE_SELECTION_MODES),
  })
  .superRefine((value, ctx) => {
    if (value.amountMode === "fixed" && value.amountConfig.amount === undefined) {
      ctx.addIssue({ code: "custom", message: "Fixed amount mode requires amount.", path: ["amountConfig", "amount"] });
    }
    if (value.amountMode === "by_position" && !value.amountConfig.byPosition && value.amountConfig.defaultAmount === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "By-position amount mode requires byPosition map or defaultAmount.",
        path: ["amountConfig"],
      });
    }
    if (value.selectionMode === "manual" && !(value.selectionFilters.employeeIds?.length ?? 0)) {
      ctx.addIssue({ code: "custom", message: "Manual selection requires employeeIds.", path: ["selectionFilters", "employeeIds"] });
    }
    if (value.selectionMode === "by_position" && !(value.selectionFilters.positionIds?.length ?? 0)) {
      ctx.addIssue({ code: "custom", message: "By-position selection requires positionIds.", path: ["selectionFilters", "positionIds"] });
    }
    if (value.selectionMode === "by_department" && !(value.selectionFilters.departmentIds?.length ?? 0)) {
      ctx.addIssue({
        code: "custom",
        message: "By-department selection requires departmentIds.",
        path: ["selectionFilters", "departmentIds"],
      });
    }
    if (value.selectionMode === "by_branch" && !(value.selectionFilters.branchIds?.length ?? 0)) {
      ctx.addIssue({ code: "custom", message: "By-branch selection requires branchIds.", path: ["selectionFilters", "branchIds"] });
    }
    if (value.selectionMode === "import") {
      if (!(value.selectionFilters.importLines?.length ?? 0)) {
        ctx.addIssue({ code: "custom", message: "Import selection requires importLines.", path: ["selectionFilters", "importLines"] });
      }
      if (value.amountMode !== "per_employee") {
        ctx.addIssue({ code: "custom", message: "Import mode requires per_employee amount mode.", path: ["amountMode"] });
      }
    }
    if (value.documentKind === "penalty" && !value.reason?.trim()) {
      ctx.addIssue({ code: "custom", message: "Penalty batches require a reason/description.", path: ["reason"] });
    }
  });

export const hrCompensationIssuanceBatchIdSchema = z.object({
  batchId: uuid,
});

export const hrCompensationIssuanceLineOverrideSchema = z.object({
  amount: nonNegativeAmount.optional(),
  employeeId: uuid,
  percentage: z.number().min(0).max(100).optional(),
});

export const hrCompensationIssuanceBuildPreviewSchema = z.object({
  batchId: uuid,
  lineOverrides: z.array(hrCompensationIssuanceLineOverrideSchema).max(HR_COMPENSATION_ISSUANCE_MAX_LINES).optional(),
});

export const hrCompensationIssuanceSaveLinesSchema = z.object({
  batchId: uuid,
  lines: z
    .array(
      z.object({
        amount: nonNegativeAmount.nullable().optional(),
        employeeId: uuid,
        percentage: z.number().min(0).max(100).nullable().optional(),
        positionId: uuid.nullable().optional(),
        positionLabel: z.string().nullable().optional(),
        skipReason: z.string().nullable().optional(),
      }),
    )
    .max(HR_COMPENSATION_ISSUANCE_MAX_LINES),
});

export type HrCompensationIssuanceImportLine = z.infer<typeof hrCompensationIssuanceImportLineSchema>;
export type HrCompensationIssuanceSelectionFilters = z.infer<typeof hrCompensationIssuanceSelectionFiltersSchema>;
export type HrCompensationIssuanceAmountConfig = z.infer<typeof hrCompensationIssuanceAmountConfigSchema>;
export type HrCompensationIssuanceCreateDraftInput = z.infer<typeof hrCompensationIssuanceCreateDraftSchema>;
export type HrCompensationIssuanceLineOverride = z.infer<typeof hrCompensationIssuanceLineOverrideSchema>;
export type HrCompensationIssuanceBuildPreviewInput = z.infer<typeof hrCompensationIssuanceBuildPreviewSchema>;
export type HrCompensationIssuanceSaveLinesInput = z.infer<typeof hrCompensationIssuanceSaveLinesSchema>;

export type HrCompensationIssuanceRecipientPreview = Readonly<{
  branchId: string | null;
  employeeId: string;
  employeeLabel: string;
  positionId: string | null;
  positionLabel: string | null;
}>;

export type HrCompensationIssuancePreviewLine = Readonly<{
  amount: number | null;
  employeeId: string;
  employeeLabel: string;
  lineStatus: "pending" | "skipped";
  percentage: number | null;
  positionId: string | null;
  positionLabel: string | null;
  skipReason: string | null;
}>;

export type HrCompensationIssuanceBatchPreview = Readonly<{
  batchId: string;
  currencyCode: string;
  documentKind: (typeof HR_COMPENSATION_ISSUANCE_DOCUMENT_KINDS)[number];
  employeeCount: number;
  includedCount: number;
  lines: readonly HrCompensationIssuancePreviewLine[];
  skippedCount: number;
  totalAmount: number;
  warnings: readonly string[];
}>;

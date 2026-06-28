import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const quantity = z.coerce.number().min(0);
const forbiddenWorkerOutputKeys = new Set(["cost", "costAmount", "incentive", "incentiveAmount", "payroll", "payrollAmount", "wage"]);

export const manufacturingDailyReportListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  manufacturingProductId: z.string().trim().uuid().optional(),
  productionLineId: z.string().trim().uuid().optional(),
  reportDate: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  shiftKey: z.string().trim().max(64).optional(),
  status: z.enum(["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"]).optional(),
});

export const manufacturingDailyReportMutationSchema = z.object({
  actualQuantity: quantity,
  downtimeMinutes: quantity,
  manufacturingProductId: requiredText,
  notes: optionalText.optional(),
  plannedQuantity: quantity,
  productionLineId: requiredText,
  reportDate: requiredText,
  reportKey: requiredText.regex(/^[a-z0-9][a-z0-9._-]*$/, "Use lowercase letters, numbers, dots, dashes, or underscores."),
  reworkQuantity: quantity,
  scrapQuantity: quantity,
  shiftKey: requiredText,
  status: z.enum(["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"]),
  supervisorRefId: optionalText.optional(),
  workerOutputJson: z.string().trim().default("[]").transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value.length > 0 ? value : "[]");
      if (!Array.isArray(parsed)) throw new Error("not-array");
      for (const [index, row] of parsed.entries()) {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          ctx.addIssue({ code: "custom", message: `Worker output row ${index + 1} must be an object.` });
          return z.NEVER;
        }

        for (const key of Object.keys(row)) {
          if (forbiddenWorkerOutputKeys.has(key)) {
            ctx.addIssue({ code: "custom", message: "Worker output may contain production facts only." });
            return z.NEVER;
          }
        }
      }
      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: "Worker output must be a JSON array of production facts." });
      return z.NEVER;
    }
  }),
});

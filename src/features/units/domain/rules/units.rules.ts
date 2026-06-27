import { ApplicationError } from "@/core/errors";

export function assertUnitCanBeSaved(input: Readonly<Record<string, unknown>>) {
  const primaryCode = input.sku ?? input.code ?? input.customerCode ?? input.supplierCode ?? input.warehouseCode ?? input.locationCode;
  const nameAr = input.nameAr;
  const nameEn = input.nameEn;

  if (typeof primaryCode === "string" && primaryCode !== primaryCode.toUpperCase()) {
    throw new ApplicationError({
      code: "BUSINESS_RULE_VIOLATION",
      message: "Units codes must be uppercase before persistence.",
    });
  }

  if (typeof nameAr === "string" && nameAr.trim().length === 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Arabic name is required." });
  }

  if (typeof nameEn === "string" && nameEn.trim().length === 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "English name is required." });
  }
}

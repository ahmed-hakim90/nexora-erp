import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  GeneratedDocumentNumber,
  NumberingSequenceDefinition,
} from "./public-api";

export function previewDocumentNumber(
  sequence: NumberingSequenceDefinition,
): GeneratedDocumentNumber {
  if (sequence.padding < 1 || sequence.nextValue < 1) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Numbering sequence padding and next value must be positive.",
    });
  }

  const paddedValue = String(sequence.nextValue).padStart(sequence.padding, "0");

  return {
    value: `${sequence.prefix}${paddedValue}`,
    sequenceKey: sequence.key,
    sequenceValue: sequence.nextValue,
  };
}

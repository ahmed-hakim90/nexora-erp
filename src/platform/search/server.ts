import "server-only";

import { ApplicationError } from "@/core/errors";

import type { SearchQuery } from "./public-api";

export function validateSearchQuery(query: SearchQuery): void {
  if (query.term.trim().length < 2) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Search term must contain at least two characters.",
    });
  }

  if (query.limit !== undefined && (query.limit < 1 || query.limit > 50)) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Search limit must be between 1 and 50.",
    });
  }
}

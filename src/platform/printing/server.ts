import "server-only";

import { ApplicationError } from "@/core/errors";

import type {
  PrintTemplateDefinition,
  PrintTemplateDesignerSchema,
  PrintTemplateDraft,
} from "./public-api";

export function createPrintTemplateDraft(params: {
  key: string;
  baseTemplateKey?: string;
  schema: PrintTemplateDesignerSchema;
  versionNote?: string;
}): PrintTemplateDraft {
  if (params.schema.sections.length === 0) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Print template drafts require at least one section.",
    });
  }

  return {
    baseTemplateKey: params.baseTemplateKey,
    key: params.key,
    schema: params.schema,
    status: "draft",
    versionNote: params.versionNote,
  };
}

export function publishPrintTemplateVersion(params: {
  draft: PrintTemplateDraft;
  mode: PrintTemplateDefinition["mode"];
  requiredPermission: string;
  version: string;
}): PrintTemplateDefinition {
  if (params.draft.status === "archived") {
    throw new ApplicationError({
      code: "CONFLICT",
      message: "Archived print template drafts cannot be published.",
    });
  }

  return {
    designerSchema: params.draft.schema,
    isOfficial: true,
    key: params.draft.key,
    mode: params.mode,
    requiredPermission: params.requiredPermission,
    version: params.version,
  };
}

export type PrintExecutionMode = "single" | "batch";

export type PrintTemplateSection =
  | "header"
  | "body"
  | "footer"
  | "watermark"
  | "signature"
  | "terms";

export type PrintTemplateBinding = Readonly<{
  key: string;
  label: string;
  sourcePath: string;
  isRequired?: boolean;
  isSensitive?: boolean;
}>;

export type PrintTemplateDesignerSchema = Readonly<{
  pageSize: "a4" | "letter" | "receipt" | "custom";
  orientation: "portrait" | "landscape";
  sections: readonly PrintTemplateSection[];
  bindings: readonly PrintTemplateBinding[];
  supportsRtl: boolean;
  supportsBranding: boolean;
}>;

export type PrintTemplateDefinition = Readonly<{
  key: string;
  version: string;
  mode: PrintExecutionMode;
  requiredPermission: string;
  designerSchema?: PrintTemplateDesignerSchema;
  isOfficial?: boolean;
}>;

export type PrintTemplateDraft = Readonly<{
  key: string;
  baseTemplateKey?: string;
  versionNote?: string;
  schema: PrintTemplateDesignerSchema;
  status: "draft" | "review" | "published" | "archived";
}>;

export type PrintSnapshot = Readonly<{
  id: string;
  templateKey: string;
  templateVersion: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}>;

export function definePrintTemplate<TTemplate extends PrintTemplateDefinition>(
  template: TTemplate,
): TTemplate {
  return template;
}

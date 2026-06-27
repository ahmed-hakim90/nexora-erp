import type { AccessExperience } from "@/core/context";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type AutomationTrigger =
  | { readonly type: "event"; readonly eventName: string }
  | { readonly type: "schedule"; readonly cron: string }
  | { readonly type: "manual"; readonly commandKey: string };

export type AutomationDefinition = Readonly<{
  key: string;
  appKey: string;
  trigger: AutomationTrigger;
  requiredPermission: PermissionKey;
  requiresApproval?: boolean;
  isEnabledByDefault: boolean;
}>;

export type AutomationRun = Readonly<{
  id: string;
  automationKey: string;
  tenantId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  idempotencyKey: string;
}>;

export type AiExecutionMode = "suggest" | "draft" | "execute";

export type AiContextPolicy = Readonly<{
  allowedExperiences: readonly AccessExperience[];
  allowedAppKeys: readonly string[];
  includeSensitiveData: boolean;
  requiresHumanApproval: boolean;
  retentionPolicy: "none" | "short" | "standard";
}>;

export type AiActionDefinition = Readonly<{
  key: string;
  label: string;
  mode: AiExecutionMode;
  requiredPermission: PermissionKey;
  contextPolicy: AiContextPolicy;
}>;

export function defineAutomation<TDefinition extends AutomationDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineAiAction<TDefinition extends AiActionDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

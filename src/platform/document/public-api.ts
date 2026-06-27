export type PlatformDocumentRef = Readonly<{
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
}>;

export type PlatformDocumentMetadata = Readonly<{
  documentNumber?: string;
  documentType: string;
  status: string;
  workflowKey?: string;
  approvalInstanceId?: string;
  attachmentCount?: number;
  commentCount?: number;
  metadata?: Record<string, unknown>;
}>;

export type PlatformDocumentCapability =
  | "workflow"
  | "approval"
  | "attachments"
  | "comments"
  | "audit-timeline"
  | "print"
  | "export";

export type UniversalDocumentLifecycleState =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"
  | "posted"
  | "cancelled"
  | "closed"
  | "reversed"
  | "archived";

export type UniversalDocumentLifecycleCommand =
  | "submit"
  | "approve"
  | "reject"
  | "return"
  | "post"
  | "cancel"
  | "close"
  | "reverse"
  | "archive"
  | "reprint";

export type PlatformDocumentDefinition = Readonly<{
  moduleKey: string;
  documentType: string;
  capabilities: readonly PlatformDocumentCapability[];
}>;

export type DocumentLifecycleTransition = Readonly<{
  command: UniversalDocumentLifecycleCommand;
  from: UniversalDocumentLifecycleState;
  to: UniversalDocumentLifecycleState;
  requiredPermission?: string;
  requiresApproval?: boolean;
  requiresAudit?: boolean;
  createsSnapshot?: boolean;
}>;

export type DocumentLifecycleDefinition = Readonly<{
  documentType: string;
  initialState: UniversalDocumentLifecycleState;
  terminalStates: readonly UniversalDocumentLifecycleState[];
  transitions: readonly DocumentLifecycleTransition[];
}>;

export type DocumentLifecycleCommand = Readonly<{
  documentId: string;
  command: UniversalDocumentLifecycleCommand;
  currentState: UniversalDocumentLifecycleState;
  idempotencyKey?: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}>;

export type DocumentLifecycleResult = Readonly<{
  documentId: string;
  from: UniversalDocumentLifecycleState;
  to: UniversalDocumentLifecycleState;
  command: UniversalDocumentLifecycleCommand;
}>;

export function defineDocumentLifecycle<TDefinition extends DocumentLifecycleDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

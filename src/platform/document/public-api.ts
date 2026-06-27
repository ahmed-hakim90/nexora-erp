import type { AuditEvent } from "@/platform/audit/public-api";
import type { AttachmentMetadata } from "@/platform/files/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type PlatformDocumentRef = Readonly<{
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
}>;

export type DocumentType = string & { readonly __brand: "DocumentType" };

export type DocumentStatus =
  | "draft"
  | "submitted"
  | "waiting-approval"
  | "approved"
  | "rejected"
  | "posted"
  | "completed"
  | "archived"
  | "cancelled"
  | (string & { readonly __brand?: "DocumentStatus" });

export type BuiltInDocumentStatus = Exclude<DocumentStatus, string & { readonly __brand?: "DocumentStatus" }>;

export type DocumentBehavior =
  | "numbering"
  | "workflow"
  | "approval"
  | "timeline"
  | "comments"
  | "attachments"
  | "versioning"
  | "printing"
  | "reporting"
  | "notifications"
  | "audit";

export type DocumentBehaviorDeclaration = Readonly<{
  behavior: DocumentBehavior;
  enabled: boolean;
  required?: boolean;
  providerKey?: string;
}>;

export type DocumentHeader = Readonly<{
  id: string;
  tenantId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  moduleKey: string;
  documentNumber?: string | null;
  title?: string | null;
  companyId?: string | null;
  branchId?: string | null;
  currentVersion: number;
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
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
  | "waiting-approval"
  | "approved"
  | "rejected"
  | "returned"
  | "posted"
  | "completed"
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
  | "complete"
  | "cancel"
  | "close"
  | "reverse"
  | "archive"
  | "reprint";

export type DocumentExtensionHook =
  | "beforeSubmit"
  | "afterSubmit"
  | "beforeApprove"
  | "afterApprove"
  | "beforePost"
  | "afterPost"
  | "beforeCancel"
  | "afterCancel"
  | "beforeArchive"
  | "afterArchive";

export type DocumentExtensionHookRegistration = Readonly<{
  hook: DocumentExtensionHook;
  key: string;
  documentType: DocumentType;
  order?: number;
  requiredBehavior?: DocumentBehavior;
}>;

export type PlatformDocumentDefinition = Readonly<{
  moduleKey: string;
  documentType: string;
  capabilities: readonly PlatformDocumentCapability[];
}>;

export type DocumentLifecycleTransition = Readonly<{
  command: UniversalDocumentLifecycleCommand;
  from: UniversalDocumentLifecycleState;
  to: UniversalDocumentLifecycleState;
  requiredPermission?: PermissionKey | string;
  requiresApproval?: boolean;
  requiresAudit?: boolean;
  createsSnapshot?: boolean;
  hookBefore?: DocumentExtensionHook;
  hookAfter?: DocumentExtensionHook;
}>;

export type DocumentLifecycleDefinition = Readonly<{
  documentType: string;
  initialState: UniversalDocumentLifecycleState;
  terminalStates: readonly UniversalDocumentLifecycleState[];
  transitions: readonly DocumentLifecycleTransition[];
}>;

export type DocumentNumberToken =
  | "prefix"
  | "suffix"
  | "year"
  | "tenant"
  | "company"
  | "branch"
  | "sequence"
  | "custom";

export type DocumentNumberingDefinition = Readonly<{
  key: string;
  documentType: DocumentType;
  pattern: string;
  prefix?: string;
  suffix?: string;
  sequencePadding: number;
  includeYear?: boolean;
  tenantScoped?: boolean;
  companyScoped?: boolean;
  branchScoped?: boolean;
  customTokens?: Readonly<Record<string, string>>;
}>;

export type DocumentNumberingContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  year?: string | number;
  sequence: number;
  customTokens?: Readonly<Record<string, string | number>>;
}>;

export type GeneratedUniversalDocumentNumber = Readonly<{
  value: string;
  sequence: number;
  pattern: string;
  tokens: Readonly<Record<string, string>>;
}>;

export type DocumentVersion = Readonly<{
  documentId: string;
  version: number;
  previousVersion?: number | null;
  changeSummary: string;
  createdAt: string;
  createdBy?: string | null;
  snapshotMetadata: Readonly<Record<string, unknown>>;
}>;

export type DocumentReference = Readonly<{
  documentType: DocumentType;
  documentId: string;
  documentNumber?: string | null;
  label?: string | null;
}>;

export type DocumentRelationKind =
  | "derived-from"
  | "creates"
  | "fulfills"
  | "reverses"
  | "replaces"
  | "related";

export type DocumentRelation = Readonly<{
  key: string;
  from: DocumentReference;
  to: DocumentReference;
  relation: DocumentRelationKind;
  createdAt: string;
  createdBy?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DocumentTimelineEvent = Readonly<{
  key: string;
  documentId: string;
  type: "lifecycle" | "comment" | "attachment" | "audit" | "system";
  label: string;
  occurredAt: string;
  actorId?: string | null;
  auditEventId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DocumentCommentMention = Readonly<{
  actorId: string;
  displayName?: string;
}>;

export type DocumentComment = Readonly<{
  key: string;
  documentId: string;
  body: string;
  createdAt: string;
  createdBy: string;
  mentions?: readonly DocumentCommentMention[];
  auditEventId?: string | null;
}>;

export type DocumentAttachment = Readonly<{
  key: string;
  documentId: string;
  attachment: AttachmentMetadata;
  auditEventId?: string | null;
}>;

export type PlatformDocument<
  TBody = unknown,
  TMetadata extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> = Readonly<{
  header: DocumentHeader;
  body: TBody;
  metadata: TMetadata;
  versions: readonly DocumentVersion[];
  references: readonly DocumentReference[];
  relations: readonly DocumentRelation[];
  timeline: readonly DocumentTimelineEvent[];
  comments: readonly DocumentComment[];
  attachments: readonly DocumentAttachment[];
  auditLinks: readonly Pick<AuditEvent, "id" | "action" | "timestamp">[];
}>;

export type DocumentTypeDefinition = Readonly<{
  documentType: DocumentType;
  moduleKey: string;
  label: string;
  description?: string;
  behaviors: readonly DocumentBehaviorDeclaration[];
  lifecycle: DocumentLifecycleDefinition;
  numbering?: DocumentNumberingDefinition;
  hooks?: readonly DocumentExtensionHookRegistration[];
}>;

export type DocumentRegistry = Readonly<{
  documentTypes: readonly DocumentTypeDefinition[];
  hooks: readonly DocumentExtensionHookRegistration[];
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

export const BUILT_IN_DOCUMENT_STATUSES = [
  "draft",
  "submitted",
  "waiting-approval",
  "approved",
  "rejected",
  "posted",
  "completed",
  "archived",
  "cancelled",
] as const satisfies readonly UniversalDocumentLifecycleState[];

export const DEFAULT_DOCUMENT_LIFECYCLE = defineDocumentLifecycle({
  documentType: "platform.document",
  initialState: "draft",
  terminalStates: ["completed", "archived", "cancelled"],
  transitions: [
    { command: "submit", from: "draft", hookAfter: "afterSubmit", hookBefore: "beforeSubmit", to: "submitted" },
    { command: "submit", from: "submitted", hookAfter: "afterSubmit", hookBefore: "beforeSubmit", requiresApproval: true, to: "waiting-approval" },
    { command: "approve", from: "waiting-approval", hookAfter: "afterApprove", hookBefore: "beforeApprove", requiresApproval: true, to: "approved" },
    { command: "reject", from: "waiting-approval", requiresApproval: true, to: "rejected" },
    { command: "post", from: "approved", hookAfter: "afterPost", hookBefore: "beforePost", to: "posted" },
    { command: "complete", from: "posted", to: "completed" },
    { command: "cancel", from: "draft", hookAfter: "afterCancel", hookBefore: "beforeCancel", to: "cancelled" },
    { command: "cancel", from: "submitted", hookAfter: "afterCancel", hookBefore: "beforeCancel", to: "cancelled" },
    { command: "archive", from: "completed", hookAfter: "afterArchive", hookBefore: "beforeArchive", to: "archived" },
  ],
} satisfies DocumentLifecycleDefinition);

export function defineDocumentLifecycle<TDefinition extends DocumentLifecycleDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineDocumentType(value: string): DocumentType {
  if (!/^[a-z][a-z0-9.-]*$/.test(value)) {
    throw new Error("Document types must be lowercase dot or dash separated identifiers.");
  }

  return value as DocumentType;
}

export function defineDocumentTypeDefinition<TDefinition extends DocumentTypeDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineDocumentBehavior(
  behavior: DocumentBehavior,
  enabled = true,
  options: Omit<DocumentBehaviorDeclaration, "behavior" | "enabled"> = {},
): DocumentBehaviorDeclaration {
  return {
    ...options,
    behavior,
    enabled,
  };
}

export function validateDocumentBehaviors(
  behaviors: readonly DocumentBehaviorDeclaration[],
): readonly string[] {
  const errors: string[] = [];
  const seen = new Set<DocumentBehavior>();

  for (const declaration of behaviors) {
    if (seen.has(declaration.behavior)) {
      errors.push(`Duplicate document behavior: ${declaration.behavior}`);
    }

    seen.add(declaration.behavior);
  }

  const enabledBehaviors = new Set(
    behaviors.filter((declaration) => declaration.enabled).map((declaration) => declaration.behavior),
  );

  if (enabledBehaviors.has("approval") && !enabledBehaviors.has("workflow")) {
    errors.push("Approval behavior requires workflow behavior.");
  }

  if (enabledBehaviors.has("comments") && !enabledBehaviors.has("timeline")) {
    errors.push("Comments behavior requires timeline behavior.");
  }

  if (enabledBehaviors.has("attachments") && !enabledBehaviors.has("audit")) {
    errors.push("Attachments behavior requires audit behavior.");
  }

  return errors;
}

export function canTransitionDocumentLifecycle(
  lifecycle: DocumentLifecycleDefinition,
  from: UniversalDocumentLifecycleState,
  command: UniversalDocumentLifecycleCommand,
): boolean {
  return lifecycle.transitions.some((transition) => transition.from === from && transition.command === command);
}

export function validateDocumentLifecycleTransition(
  lifecycle: DocumentLifecycleDefinition,
  command: DocumentLifecycleCommand,
): DocumentLifecycleResult | null {
  const transition = lifecycle.transitions.find(
    (candidate) => candidate.from === command.currentState && candidate.command === command.command,
  );

  if (!transition) {
    return null;
  }

  return {
    command: command.command,
    documentId: command.documentId,
    from: transition.from,
    to: transition.to,
  };
}

export function generateDocumentNumber(
  definition: DocumentNumberingDefinition,
  context: DocumentNumberingContext,
): GeneratedUniversalDocumentNumber {
  const tokens: Record<string, string> = {
    branch: context.branchId ?? "",
    company: context.companyId ?? "",
    prefix: definition.prefix ?? "",
    sequence: String(context.sequence).padStart(definition.sequencePadding, "0"),
    suffix: definition.suffix ?? "",
    tenant: context.tenantId,
    year: String(context.year ?? new Date().getUTCFullYear()),
    ...definition.customTokens,
  };

  for (const [key, value] of Object.entries(context.customTokens ?? {})) {
    tokens[key] = String(value);
  }

  const value = definition.pattern.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, token: string) => tokens[token] ?? "");

  return {
    pattern: definition.pattern,
    sequence: context.sequence,
    tokens,
    value,
  };
}

export function createDocumentVersion(
  input: Readonly<{
    documentId: string;
    currentVersion: number;
    changeSummary: string;
    createdAt: string;
    createdBy?: string | null;
    snapshotMetadata?: Readonly<Record<string, unknown>>;
  }>,
): DocumentVersion {
  const nextVersion = input.currentVersion + 1;

  return {
    changeSummary: input.changeSummary,
    createdAt: input.createdAt,
    createdBy: input.createdBy ?? null,
    documentId: input.documentId,
    previousVersion: input.currentVersion > 0 ? input.currentVersion : null,
    snapshotMetadata: input.snapshotMetadata ?? {},
    version: nextVersion,
  };
}

export function createDocumentRelation(
  input: Omit<DocumentRelation, "key"> & Readonly<{ key?: string }>,
): DocumentRelation {
  return {
    ...input,
    key: input.key ?? `${input.from.documentType}:${input.from.documentId}->${input.relation}->${input.to.documentType}:${input.to.documentId}`,
  };
}

export function createDocumentTimelineEvent(
  event: DocumentTimelineEvent,
): DocumentTimelineEvent {
  return event;
}

export function createDocumentComment(comment: DocumentComment): DocumentComment {
  return comment;
}

export function createDocumentAttachment(attachment: DocumentAttachment): DocumentAttachment {
  return attachment;
}

export function registerDocumentHooks(
  documentType: DocumentType,
  hooks: readonly Omit<DocumentExtensionHookRegistration, "documentType">[],
): readonly DocumentExtensionHookRegistration[] {
  return [...hooks]
    .map((hook) => ({
      ...hook,
      documentType,
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.key.localeCompare(right.key));
}

export function createDocumentRegistry(
  documentTypes: readonly DocumentTypeDefinition[],
): DocumentRegistry {
  return {
    documentTypes,
    hooks: documentTypes.flatMap((documentType) => documentType.hooks ?? []),
  };
}

export function createPlatformDocument<TBody, TMetadata extends Readonly<Record<string, unknown>>>(
  input: Readonly<{
    header: DocumentHeader;
    body: TBody;
    metadata?: TMetadata;
    versions?: readonly DocumentVersion[];
    references?: readonly DocumentReference[];
    relations?: readonly DocumentRelation[];
    timeline?: readonly DocumentTimelineEvent[];
    comments?: readonly DocumentComment[];
    attachments?: readonly DocumentAttachment[];
    auditLinks?: readonly Pick<AuditEvent, "id" | "action" | "timestamp">[];
  }>,
): PlatformDocument<TBody, TMetadata> {
  return {
    attachments: input.attachments ?? [],
    auditLinks: input.auditLinks ?? [],
    body: input.body,
    comments: input.comments ?? [],
    header: input.header,
    metadata: input.metadata ?? ({} as TMetadata),
    references: input.references ?? [],
    relations: input.relations ?? [],
    timeline: input.timeline ?? [],
    versions: input.versions ?? [],
  };
}

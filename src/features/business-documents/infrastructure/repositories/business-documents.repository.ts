import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type {
  BusinessDocumentRepository,
  DocumentAttachmentRepository,
  DocumentCommentRepository,
  DocumentExportJobRepository,
  DocumentPrintSnapshotRepository,
  DocumentReferenceRepository,
  DocumentTimelineRepository,
  NumberingRepository,
} from "../../application/ports/business-documents.repository";
import type {
  AddAttachmentRelationInput,
  AddCommentInput,
  AddReferenceInput,
  BusinessDocumentRecord,
  ChangeDocumentStatusInput,
  CreateDocumentShellRepositoryInput,
  CreateExportJobInput,
  CreatePrintSnapshotInput,
  DocumentTimelineEventType,
  GeneratedDocumentNumberRecord,
  JsonRecord,
  UpdateDocumentMetadataInput,
} from "../../application/types";

const DOCUMENT_COLUMNS = [
  "id",
  "tenant_id",
  "branch_id",
  "document_number",
  "document_type_key",
  "title",
  "status",
  "workflow_status",
  "approval_status",
  "owner_user_id",
  "source_module",
  "source_entity_type",
  "source_entity_id",
  "metadata",
  "issued_at",
  "posted_at",
  "cancelled_at",
  "closed_at",
  "created_at",
  "updated_at",
  "version",
].join(", ");

function normalizeText(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

function normalizeMetadata(value: JsonRecord | undefined): Record<string, unknown> {
  return { ...(value ?? {}) };
}

function mapDocument(row: Record<string, unknown>): BusinessDocumentRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    documentNumber: row.document_number as string,
    documentTypeKey: row.document_type_key as string,
    title: row.title as string,
    status: row.status as string,
    workflowStatus: row.workflow_status as string | null,
    approvalStatus: row.approval_status as BusinessDocumentRecord["approvalStatus"],
    ownerUserId: row.owner_user_id as string | null,
    sourceModule: row.source_module as string,
    sourceEntityType: row.source_entity_type as string | null,
    sourceEntityId: row.source_entity_id as string | null,
    metadata: (row.metadata ?? {}) as JsonRecord,
    issuedAt: row.issued_at as string | null,
    postedAt: row.posted_at as string | null,
    cancelledAt: row.cancelled_at as string | null,
    closedAt: row.closed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapId(row: Record<string, unknown>): { id: string } {
  return { id: row.id as string };
}

function timestampForStatus(status: string) {
  const now = new Date().toISOString();
  if (status === "cancelled") return { cancelled_at: now };
  if (status === "closed") return { closed_at: now };
  if (status === "posted") return { posted_at: now };
  return {};
}

export class SupabaseBusinessDocumentRepository implements BusinessDocumentRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async findById(id: string): Promise<BusinessDocumentRecord | null> {
    const { data, error } = await this.supabase
      .from("business_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read business document.", cause: error });
    }

    return data ? mapDocument(data as unknown as Record<string, unknown>) : null;
  }

  async createShell(input: CreateDocumentShellRepositoryInput): Promise<BusinessDocumentRecord> {
    const payload = {
      tenant_id: this.context.tenantId,
      branch_id: normalizeText(input.branchId),
      document_number: input.documentNumber,
      document_type_key: normalizeKey(input.documentTypeKey),
      title: normalizeText(input.title),
      status: normalizeKey(input.status ?? "draft"),
      workflow_status: normalizeKey(input.workflowStatus),
      approval_status: input.approvalStatus ?? "not_required",
      owner_user_id: normalizeText(input.ownerUserId) ?? this.context.userId,
      source_module: normalizeKey(input.sourceModule ?? "documents"),
      source_entity_type: normalizeKey(input.sourceEntityType),
      source_entity_id: normalizeText(input.sourceEntityId),
      fiscal_year: normalizeText(input.fiscalYear),
      metadata: normalizeMetadata(input.metadata),
      issued_at: normalizeText(input.issuedAt),
      created_by: this.context.userId,
      updated_by: this.context.userId,
    };

    const { data, error } = await this.supabase
      .from("business_documents")
      .insert(payload)
      .select(DOCUMENT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create business document shell.", cause: error });
    }

    return mapDocument(data as unknown as Record<string, unknown>);
  }

  async updateMetadata(id: string, input: UpdateDocumentMetadataInput): Promise<BusinessDocumentRecord> {
    const payload: Record<string, unknown> = {
      metadata: normalizeMetadata(input.metadata),
      updated_by: this.context.userId,
    };

    if (input.title !== undefined) {
      payload.title = normalizeText(input.title);
    }

    const { data, error } = await this.supabase
      .from("business_documents")
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(DOCUMENT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update business document metadata.", cause: error });
    }

    return mapDocument(data as unknown as Record<string, unknown>);
  }

  async changeStatus(id: string, input: ChangeDocumentStatusInput): Promise<BusinessDocumentRecord> {
    const status = input.status.toLowerCase();
    const payload: Record<string, unknown> = {
      status,
      updated_by: this.context.userId,
      ...timestampForStatus(status),
    };

    if (input.workflowStatus !== undefined) {
      payload.workflow_status = normalizeKey(input.workflowStatus);
    }

    if (input.approvalStatus !== undefined) {
      payload.approval_status = input.approvalStatus;
    }

    if (input.metadata !== undefined) {
      payload.metadata = normalizeMetadata(input.metadata);
    }

    const { data, error } = await this.supabase
      .from("business_documents")
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(DOCUMENT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not change business document status.", cause: error });
    }

    return mapDocument(data as unknown as Record<string, unknown>);
  }
}

export class SupabaseDocumentNumberRepository implements NumberingRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async generateBusinessDocumentNumber(input: {
    branchId?: string | null;
    documentTypeKey: string;
    fiscalYear?: string | null;
  }): Promise<GeneratedDocumentNumberRecord> {
    const { data, error } = await this.supabase.rpc("generate_business_document_number", {
      input_tenant_id: this.context.tenantId,
      input_branch_id: normalizeText(input.branchId),
      input_document_type_key: input.documentTypeKey,
      input_fiscal_year: normalizeText(input.fiscalYear),
    });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not generate business document number.", cause: error });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Document number generator returned no value." });
    }

    const generated = row as Record<string, unknown>;
    return {
      documentNumber: generated.document_number as string,
      sequenceId: generated.sequence_id as string,
      sequenceValue: Number(generated.sequence_value),
    };
  }
}

export class SupabaseDocumentTimelineRepository implements DocumentTimelineRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async addEvent(input: {
    document: BusinessDocumentRecord;
    eventType: DocumentTimelineEventType;
    metadata?: JsonRecord;
    requestId?: string | null;
    correlationId?: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from("document_timeline_events").insert({
      tenant_id: this.context.tenantId,
      branch_id: input.document.branchId,
      document_id: input.document.id,
      event_type: input.eventType,
      actor_user_id: this.context.userId,
      metadata: normalizeMetadata(input.metadata),
      request_id: normalizeText(input.requestId),
      correlation_id: normalizeText(input.correlationId ?? this.context.correlationId),
      created_by: this.context.userId,
      updated_by: this.context.userId,
    });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not append document timeline event.", cause: error });
    }
  }
}

export class SupabaseDocumentCommentRepository implements DocumentCommentRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async addComment(document: BusinessDocumentRecord, input: AddCommentInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("document_comments")
      .insert({
        tenant_id: this.context.tenantId,
        branch_id: document.branchId,
        document_id: document.id,
        parent_comment_id: normalizeText(input.parentCommentId),
        body: input.body.trim(),
        is_internal: input.isInternal ?? true,
        is_public_placeholder: input.isPublicPlaceholder ?? false,
        mentions_placeholder: [...(input.mentionsPlaceholder ?? [])],
        metadata: normalizeMetadata(input.metadata),
        created_by: this.context.userId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not add document comment.", cause: error });
    }

    return mapId(data as unknown as Record<string, unknown>);
  }
}

export class SupabaseDocumentReferenceRepository implements DocumentReferenceRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async addReference(document: BusinessDocumentRecord, input: AddReferenceInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("document_references")
      .insert({
        tenant_id: this.context.tenantId,
        branch_id: document.branchId,
        document_id: document.id,
        reference_type: input.referenceType.toLowerCase(),
        reference_id: input.referenceId,
        reference_role: input.referenceRole.toLowerCase(),
        metadata: normalizeMetadata(input.metadata),
        created_by: this.context.userId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not add document reference.", cause: error });
    }

    return mapId(data as unknown as Record<string, unknown>);
  }
}

export class SupabaseDocumentAttachmentRepository implements DocumentAttachmentRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async addAttachmentRelation(document: BusinessDocumentRecord, input: AddAttachmentRelationInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("document_attachments")
      .insert({
        tenant_id: this.context.tenantId,
        branch_id: document.branchId,
        document_id: document.id,
        file_attachment_id: input.fileAttachmentId,
        attachment_role: (input.attachmentRole ?? "supporting").toLowerCase(),
        metadata: normalizeMetadata(input.metadata),
        created_by: this.context.userId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not add document attachment relation.", cause: error });
    }

    return mapId(data as unknown as Record<string, unknown>);
  }
}

export class SupabaseDocumentPrintSnapshotRepository implements DocumentPrintSnapshotRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async createPrintSnapshot(document: BusinessDocumentRecord, input: CreatePrintSnapshotInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("document_print_snapshots")
      .insert({
        tenant_id: this.context.tenantId,
        branch_id: document.branchId,
        document_id: document.id,
        snapshot_key: input.snapshotKey.toLowerCase(),
        print_format: input.printFormat ?? "pdf",
        snapshot_metadata: normalizeMetadata(input.snapshotMetadata),
        file_attachment_id: normalizeText(input.fileAttachmentId),
        created_by: this.context.userId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create document print snapshot placeholder.", cause: error });
    }

    return mapId(data as unknown as Record<string, unknown>);
  }
}

export class SupabaseDocumentExportJobRepository implements DocumentExportJobRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async createExportJob(document: BusinessDocumentRecord, input: CreateExportJobInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("document_export_jobs")
      .insert({
        tenant_id: this.context.tenantId,
        branch_id: document.branchId,
        document_id: document.id,
        export_format: input.exportFormat,
        requested_by: this.context.userId,
        filters: normalizeMetadata(input.filters),
        metadata: normalizeMetadata(input.metadata),
        file_attachment_id: normalizeText(input.fileAttachmentId),
        idempotency_key: input.idempotencyKey,
        created_by: this.context.userId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create document export job placeholder.", cause: error });
    }

    return mapId(data as unknown as Record<string, unknown>);
  }
}

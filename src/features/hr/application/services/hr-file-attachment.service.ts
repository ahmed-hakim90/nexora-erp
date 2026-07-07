import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

export class HrFileAttachmentService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async uploadEmployeeDocument(input: {
    employeeId: string;
    documentType: string;
    expiryDate?: string | null;
    file: File;
  }): Promise<{ attachmentId: string; storagePath: string }> {
    const sanitizedName = input.file.name.replace(/\s+/g, "-").toLowerCase();
    const storagePath = `${this.context.tenantId}/${this.context.companyId}/${input.employeeId}/${Date.now()}-${sanitizedName}`;

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const { error: uploadError } = await this.supabase.storage.from("hr-documents").upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not upload document file.", cause: uploadError });
    }

    const { data, error } = await this.supabase
      .from("file_attachments")
      .insert({
        attachment_kind: "document",
        created_by: this.context.userId,
        entity_id: input.employeeId,
        entity_type: "hr_employee_document",
        file_name: input.file.name,
        metadata: {
          document_type: input.documentType,
          expiry_date: input.expiryDate ?? null,
          status: "active",
          title: input.file.name,
        },
        mime_type: input.file.type || "application/octet-stream",
        module_key: "hr",
        size_bytes: input.file.size,
        storage_path: storagePath,
        storage_version: 1,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      await this.supabase.storage.from("hr-documents").remove([storagePath]);
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not register employee document.", cause: error });
    }

    return { attachmentId: String(data.id), storagePath };
  }

  async uploadEmployeePhoto(input: { employeeId: string; file: File }): Promise<{ attachmentId: string; storagePath: string }> {
    const sanitizedName = input.file.name.replace(/\s+/g, "-").toLowerCase();
    const storagePath = `${this.context.tenantId}/${this.context.companyId}/${input.employeeId}/photo-${Date.now()}-${sanitizedName}`;

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const { error: uploadError } = await this.supabase.storage.from("hr-documents").upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not upload employee photo.", cause: uploadError });
    }

    const { data, error } = await this.supabase
      .from("file_attachments")
      .insert({
        attachment_kind: "image",
        created_by: this.context.userId,
        entity_id: input.employeeId,
        entity_type: "hr_employee",
        file_name: input.file.name,
        metadata: {
          status: "active",
          title: input.file.name,
        },
        mime_type: input.file.type || "application/octet-stream",
        module_key: "hr",
        size_bytes: input.file.size,
        storage_path: storagePath,
        storage_version: 1,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      await this.supabase.storage.from("hr-documents").remove([storagePath]);
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not register employee photo.", cause: error });
    }

    return { attachmentId: String(data.id), storagePath };
  }

  async getSignedUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage.from("hr-documents").createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
}

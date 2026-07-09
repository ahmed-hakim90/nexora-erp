import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type {
  HrRequiredDocumentSetCreateInput,
  HrRequiredDocumentSetUpdateInput,
} from "../schemas/hr-required-document-set.schema";
import type { HrRequiredDocumentKind } from "../../template-lifecycle-foundation";

export type HrRequiredDocumentSetRecord = Readonly<{
  code: string;
  documentKinds: readonly HrRequiredDocumentKind[];
  id: string;
  name: string;
  status: string;
}>;

export class HrRequiredDocumentSetService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async listDocumentSets(): Promise<readonly HrRequiredDocumentSetRecord[]> {
    const { data, error } = await this.supabase
      .from("hr_required_document_sets")
      .select("id, code, name, document_kinds, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("code", { ascending: true })
      .limit(100);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load document sets.", cause: error });
    }
    return (data ?? []).map((row) => this.mapRow(row));
  }

  async getDocumentSet(documentSetId: string): Promise<HrRequiredDocumentSetRecord> {
    const { data, error } = await this.supabase
      .from("hr_required_document_sets")
      .select("id, code, name, document_kinds, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", documentSetId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Document set not found." });
    }
    return this.mapRow(data);
  }

  async createDocumentSet(input: HrRequiredDocumentSetCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_required_document_sets")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        document_kinds: input.documentKinds,
        metadata: {
          copied_operational_data: false,
          document_compliance_runtime_implemented: true,
          foundation_only: false,
          references_only: false,
        },
        name: input.name,
        status: input.status,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create document set.", cause: error });
    }
    return { id: String(data.id) };
  }

  async updateDocumentSet(input: HrRequiredDocumentSetUpdateInput): Promise<void> {
    const existing = await this.getDocumentSet(input.documentSetId);
    void existing;
    const { error } = await this.supabase
      .from("hr_required_document_sets")
      .update({
        code: input.code,
        document_kinds: input.documentKinds,
        is_active: input.status !== "archived" && input.status !== "inactive",
        name: input.name,
        status: input.status,
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.documentSetId)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update document set.", cause: error });
    }
  }

  async archiveDocumentSet(documentSetId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { error } = await this.supabase
      .from("hr_required_document_sets")
      .update({
        deleted_at: deletedAt,
        deleted_by: this.context.userId,
        is_active: false,
        status: "archived",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", documentSetId)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive document set.", cause: error });
    }
  }

  private mapRow(row: Readonly<{ code: string; document_kinds: string[] | null; id: string; name: string; status: string }>): HrRequiredDocumentSetRecord {
    return {
      code: String(row.code),
      documentKinds: (row.document_kinds ?? []) as HrRequiredDocumentKind[],
      id: String(row.id),
      name: String(row.name),
      status: String(row.status),
    };
  }
}

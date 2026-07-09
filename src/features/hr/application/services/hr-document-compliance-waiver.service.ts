import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrDocumentComplianceWaiverGrantInput } from "../schemas/hr-document-compliance-waiver.schema";
import type { HrRequiredDocumentKind } from "../../template-lifecycle-foundation";

export type HrDocumentComplianceWaiverRecord = Readonly<{
  documentKind: HrRequiredDocumentKind;
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeId: string;
  id: string;
  reason: string;
}>;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class HrDocumentComplianceWaiverService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async listActiveWaiversForEmployee(employeeId: string): Promise<readonly HrDocumentComplianceWaiverRecord[]> {
    const today = todayIsoDate();
    const { data, error } = await this.supabase
      .from("hr_document_compliance_waivers")
      .select("id, employee_id, document_kind, reason, effective_from, effective_to")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("revoked_at", null)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load document compliance waivers.", cause: error });
    }
    return (data ?? []).map((row) => ({
      documentKind: String(row.document_kind) as HrRequiredDocumentKind,
      effectiveFrom: String(row.effective_from),
      effectiveTo: row.effective_to ? String(row.effective_to) : null,
      employeeId: String(row.employee_id),
      id: String(row.id),
      reason: String(row.reason),
    }));
  }

  async listActiveWaiversForEmployees(employeeIds: readonly string[]) {
    const map = new Map<string, HrDocumentComplianceWaiverRecord[]>();
    if (employeeIds.length === 0) return map;

    const today = todayIsoDate();
    const { data, error } = await this.supabase
      .from("hr_document_compliance_waivers")
      .select("id, employee_id, document_kind, reason, effective_from, effective_to")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("employee_id", [...employeeIds])
      .eq("status", "active")
      .is("revoked_at", null)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load document compliance waivers.", cause: error });
    }

    for (const row of data ?? []) {
      const employeeId = String(row.employee_id);
      const bucket = map.get(employeeId) ?? [];
      bucket.push({
        documentKind: String(row.document_kind) as HrRequiredDocumentKind,
        effectiveFrom: String(row.effective_from),
        effectiveTo: row.effective_to ? String(row.effective_to) : null,
        employeeId,
        id: String(row.id),
        reason: String(row.reason),
      });
      map.set(employeeId, bucket);
    }
    return map;
  }

  async grantWaiver(input: HrDocumentComplianceWaiverGrantInput): Promise<{ waiverId: string }> {
    const { data, error } = await this.supabase
      .from("hr_document_compliance_waivers")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        document_kind: input.documentKind,
        effective_from: todayIsoDate(),
        effective_to: input.effectiveTo || null,
        employee_id: input.employeeId,
        granted_by: this.context.userId,
        metadata: { document_compliance_waiver_runtime_implemented: true },
        reason: input.reason,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not grant document compliance waiver.", cause: error });
    }
    return { waiverId: String(data.id) };
  }

  async revokeWaiver(waiverId: string, revokeReason?: string): Promise<void> {
    const { error } = await this.supabase
      .from("hr_document_compliance_waivers")
      .update({
        revoke_reason: revokeReason ?? null,
        revoked_at: new Date().toISOString(),
        revoked_by: this.context.userId,
        status: "archived",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", waiverId)
      .is("deleted_at", null)
      .is("revoked_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not revoke document compliance waiver.", cause: error });
    }
  }
}

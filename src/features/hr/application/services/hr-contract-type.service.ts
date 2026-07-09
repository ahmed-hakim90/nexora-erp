import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import {
  buildContractLegalTermsSnapshot,
  HR_CONTRACT_TYPE_AUDIT_ACTIONS,
  type HrContractLegalTermsSnapshot,
  type HrContractPlaceholderContext,
  parseContractLegalTermsSnapshot,
  resolveContractPlaceholders,
} from "../../contract-type-foundation";
import type {
  HrContractCreateInput,
  HrContractPreviewInput,
  HrContractTypeArticlesSaveInput,
  HrContractTypeCreateInput,
  HrContractTypeUpdateInput,
  HrContractTypeVersionCreateInput,
} from "../schemas/hr-contracts.schema";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";

type ArticleRow = Readonly<{
  body_ar: string;
  body_en: string;
  code: string | null;
  sequence: number;
  title_ar: string | null;
  title_en: string;
}>;

type VersionRow = Readonly<{
  contract_type_id: string;
  id: string;
  status: string;
  version_no: number;
}>;

type TypeRow = Readonly<{
  code: string;
  id: string;
  name: string;
  status: string;
}>;

export class HrContractTypeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async createContractType(input: HrContractTypeCreateInput): Promise<{ contractTypeId: string; versionId: string }> {
    const { data: typeRow, error: typeError } = await this.supabase
      .from("hr_contract_types")
      .insert({
        branch_id: this.context.branchId,
        code: input.code,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        default_probation_days: input.defaultProbationDays ?? null,
        metadata: { contract_type_runtime_implemented: true, legal_only: true },
        name: input.name,
        name_ar: input.nameAr ?? null,
        required_document_set_id: input.requiredDocumentSetId || null,
        requires_end_date: input.requiresEndDate ?? false,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (typeError || !typeRow) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create contract type.", cause: typeError });
    }

    const { data: versionRow, error: versionError } = await this.supabase
      .from("hr_contract_type_versions")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        contract_type_id: typeRow.id,
        created_by: this.context.userId,
        metadata: { contract_type_runtime_implemented: true, legal_only: true },
        status: "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        version_no: 1,
      })
      .select("id")
      .single();
    if (versionError || !versionRow) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create initial contract type version.", cause: versionError });
    }

    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeCreated,
      category: "data-access",
      context: this.context,
      entityId: String(typeRow.id),
      entityType: "hr_contract_types",
      metadata: { code: input.code, initialVersionId: versionRow.id },
      module: "hr",
    });
    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionCreated,
      category: "data-access",
      context: this.context,
      entityId: String(versionRow.id),
      entityType: "hr_contract_type_versions",
      metadata: { contractTypeId: typeRow.id, versionNo: 1 },
      module: "hr",
    });

    return { contractTypeId: String(typeRow.id), versionId: String(versionRow.id) };
  }

  async updateContractType(input: HrContractTypeUpdateInput): Promise<void> {
    const { data: existing, error: readError } = await this.supabase
      .from("hr_contract_types")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", input.contractTypeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !existing) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Contract type not found." });
    }

    const { error } = await this.supabase
      .from("hr_contract_types")
      .update({
        code: input.code,
        default_probation_days: input.defaultProbationDays ?? null,
        name: input.name,
        name_ar: input.nameAr ?? null,
        required_document_set_id: input.requiredDocumentSetId || null,
        requires_end_date: input.requiresEndDate ?? false,
        status: input.status ?? "active",
        updated_by: this.context.userId,
      })
      .eq("id", input.contractTypeId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update contract type.", cause: error });
    }
  }

  async archiveContractType(contractTypeId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { error } = await this.supabase
      .from("hr_contract_types")
      .update({
        deleted_at: deletedAt,
        deleted_by: this.context.userId,
        is_active: false,
        status: "archived",
        updated_by: this.context.userId,
      })
      .eq("id", contractTypeId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive contract type.", cause: error });
    }
  }

  async createContractTypeVersion(input: HrContractTypeVersionCreateInput): Promise<{ versionId: string; versionNo: number }> {
    const type = await this.loadContractType(input.contractTypeId);
    const nextVersionNo = await this.nextVersionNo(input.contractTypeId);

    const { data: versionRow, error } = await this.supabase
      .from("hr_contract_type_versions")
      .insert({
        branch_id: this.context.branchId,
        change_summary: input.changeSummary ?? null,
        company_id: this.context.companyId,
        contract_type_id: input.contractTypeId,
        created_by: this.context.userId,
        metadata: { contract_type_runtime_implemented: true, legal_only: true },
        notes: input.notes ?? null,
        parent_version_id: input.parentVersionId ?? null,
        status: "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        version_no: nextVersionNo,
      })
      .select("id, version_no")
      .single();
    if (error || !versionRow) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create contract type version.", cause: error });
    }

    if (input.parentVersionId) {
      await this.copyArticles(input.parentVersionId, String(versionRow.id));
    }

    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionCreated,
      category: "data-access",
      context: this.context,
      entityId: String(versionRow.id),
      entityType: "hr_contract_type_versions",
      metadata: { contractTypeCode: type.code, parentVersionId: input.parentVersionId ?? null, versionNo: versionRow.version_no },
      module: "hr",
    });

    return { versionId: String(versionRow.id), versionNo: Number(versionRow.version_no) };
  }

  async saveDraftArticles(input: HrContractTypeArticlesSaveInput): Promise<{ versionId: string }> {
    const version = await this.loadVersion(input.contractTypeVersionId);
    if (version.status === "draft") {
      await this.replaceArticles(input.contractTypeVersionId, input.articles);
      await recordAuditEvent({
        action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionUpdated,
        category: "data-access",
        context: this.context,
        entityId: input.contractTypeVersionId,
        entityType: "hr_contract_type_versions",
        metadata: { articleCount: input.articles.length, versionNo: version.version_no },
        module: "hr",
      });
      return { versionId: input.contractTypeVersionId };
    }

    const forked = await this.createContractTypeVersion({
      changeSummary: "Forked from immutable version for article edits.",
      contractTypeId: version.contract_type_id,
      parentVersionId: input.contractTypeVersionId,
    });
    await this.replaceArticles(forked.versionId, input.articles);
    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionUpdated,
      category: "data-access",
      context: this.context,
      entityId: forked.versionId,
      entityType: "hr_contract_type_versions",
      metadata: { articleCount: input.articles.length, forkedFromVersionId: input.contractTypeVersionId, versionNo: forked.versionNo },
      module: "hr",
    });
    return { versionId: forked.versionId };
  }

  async activateContractTypeVersion(contractTypeVersionId: string): Promise<void> {
    const version = await this.loadVersion(contractTypeVersionId);
    if (version.status !== "draft") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only draft contract type versions can be activated." });
    }

    const articles = await this.loadArticles(contractTypeVersionId);
    if (articles.length === 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "At least one article is required before activation." });
    }

    const { data: activeVersions, error: activeError } = await this.supabase
      .from("hr_contract_type_versions")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("contract_type_id", version.contract_type_id)
      .eq("status", "active")
      .is("deleted_at", null);
    if (activeError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load active contract type versions.", cause: activeError });
    }

    if (activeVersions && activeVersions.length > 0) {
      const { error: archiveError } = await this.supabase
        .from("hr_contract_type_versions")
        .update({ status: "archived", updated_by: this.context.userId })
        .in(
          "id",
          activeVersions.map((row) => String(row.id)),
        );
      if (archiveError) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive previous active version.", cause: archiveError });
      }
      for (const row of activeVersions) {
        await recordAuditEvent({
          action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionArchived,
          category: "data-access",
          context: this.context,
          entityId: String(row.id),
          entityType: "hr_contract_type_versions",
          metadata: { reason: "superseded_by_activation" },
          module: "hr",
        });
      }
    }

    const { error } = await this.supabase
      .from("hr_contract_type_versions")
      .update({ status: "active", updated_by: this.context.userId })
      .eq("id", contractTypeVersionId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not activate contract type version.", cause: error });
    }

    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionActivated,
      category: "data-access",
      context: this.context,
      entityId: contractTypeVersionId,
      entityType: "hr_contract_type_versions",
      metadata: { versionNo: version.version_no },
      module: "hr",
    });
  }

  async archiveContractTypeVersion(contractTypeVersionId: string): Promise<void> {
    const version = await this.loadVersion(contractTypeVersionId);
    if (version.status === "active") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active contract type versions cannot be archived directly. Activate a newer version instead." });
    }

    const { error } = await this.supabase
      .from("hr_contract_type_versions")
      .update({ status: "archived", updated_by: this.context.userId })
      .eq("id", contractTypeVersionId)
      .eq("tenant_id", this.context.tenantId);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive contract type version.", cause: error });
    }

    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractTypeVersionArchived,
      category: "data-access",
      context: this.context,
      entityId: contractTypeVersionId,
      entityType: "hr_contract_type_versions",
      metadata: { versionNo: version.version_no },
      module: "hr",
    });
  }

  async buildActiveVersionSnapshot(contractTypeVersionId: string): Promise<{
    legalTerms: HrContractLegalTermsSnapshot;
    type: TypeRow;
    version: VersionRow;
  }> {
    const version = await this.loadVersion(contractTypeVersionId);
    if (version.status !== "active") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only active contract type versions can be used for contracts." });
    }
    const type = await this.loadContractType(version.contract_type_id);
    if (type.status !== "active") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Contract type is archived." });
    }
    const articles = await this.loadArticles(contractTypeVersionId);
    if (articles.length === 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active contract type version has no articles." });
    }

    return {
      legalTerms: buildContractLegalTermsSnapshot({
        articles,
        contractTypeCode: type.code,
        contractTypeId: type.id,
        contractTypeVersionId: version.id,
        versionNo: version.version_no,
      }),
      type,
      version,
    };
  }

  async createContract(
    input: HrContractCreateInput,
    employmentProfileId: string,
    options?: Readonly<{
      branchId?: string | null;
      metadata?: Record<string, unknown>;
      probationPeriodDays?: number | null;
      status?: "active" | "draft";
    }>,
  ): Promise<{ contractId: string }> {
    const snapshotBundle = await this.buildActiveVersionSnapshot(input.contractTypeVersionId);
    const legalTerms = snapshotBundle.legalTerms;

    const { data, error } = await this.supabase
      .from("hr_contracts")
      .insert({
        branch_id: options?.branchId ?? this.context.branchId,
        company_id: this.context.companyId,
        contract_number: input.contractNumber,
        contract_type: snapshotBundle.type.code,
        contract_type_version_id: input.contractTypeVersionId,
        created_by: this.context.userId,
        employee_id: input.employeeId,
        employment_profile_id: employmentProfileId,
        ends_on: input.endsOn || null,
        legal_terms: legalTerms,
        metadata: {
          contract_type_runtime_implemented: true,
          legal_only: true,
          ...(options?.metadata ?? {}),
        },
        probation_period_days: options?.probationPeriodDays ?? null,
        starts_on: input.startsOn,
        status: options?.status ?? "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create contract.", cause: error });
    }

    await recordAuditEvent({
      action: HR_CONTRACT_TYPE_AUDIT_ACTIONS.contractLegalTermsSnapshotted,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_contracts",
      metadata: {
        articleCount: legalTerms.articles.length,
        contractTypeVersionId: input.contractTypeVersionId,
        versionNo: legalTerms.version_no,
      },
      module: "hr",
    });

    return { contractId: String(data.id) };
  }

  async buildRenewalContractEvidence(source: Readonly<{
    contract_type: string;
    contract_type_version_id: string | null;
    legal_terms: unknown;
  }>): Promise<{
    contractType: string;
    contractTypeVersionId: string | null;
    legalTerms: HrContractLegalTermsSnapshot | Record<string, never>;
  }> {
    if (!source.contract_type_version_id) {
      return {
        contractType: source.contract_type,
        contractTypeVersionId: null,
        legalTerms: (source.legal_terms as Record<string, never>) ?? {},
      };
    }

    const sourceVersion = await this.loadVersion(source.contract_type_version_id);
    const { data: activeVersion, error } = await this.supabase
      .from("hr_contract_type_versions")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("contract_type_id", sourceVersion.contract_type_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve active contract type version for renewal.", cause: error });
    }

    if (!activeVersion) {
      return {
        contractType: source.contract_type,
        contractTypeVersionId: source.contract_type_version_id,
        legalTerms: parseContractLegalTermsSnapshot(source.legal_terms) ?? {},
      };
    }

    const snapshotBundle = await this.buildActiveVersionSnapshot(String(activeVersion.id));
    return {
      contractType: snapshotBundle.type.code,
      contractTypeVersionId: String(activeVersion.id),
      legalTerms: snapshotBundle.legalTerms,
    };
  }

  async previewContract(input: HrContractPreviewInput): Promise<{
    html: string;
    legalTerms: HrContractLegalTermsSnapshot;
  }> {
    const snapshotBundle = await this.buildActiveVersionSnapshot(input.contractTypeVersionId);
    const placeholderContext = await this.loadPlaceholderContext(input.employeeId, input.startsOn, input.endsOn ?? null);
    const { renderContractArticlesHtml } = await import("../utils/hr-contract-legal-terms.render");
    const html = renderContractArticlesHtml({
      articles: snapshotBundle.legalTerms.articles,
      companyName: placeholderContext.company ?? "Company",
      contractTypeCode: snapshotBundle.type.code,
      contractTypeName: snapshotBundle.type.name,
      generatedOn: new Date().toISOString().slice(0, 10),
      placeholderContext,
      resolvePlaceholders: true,
    });
    return { html, legalTerms: snapshotBundle.legalTerms };
  }

  private async loadPlaceholderContext(employeeId: string, startsOn: string, endsOn: string | null): Promise<HrContractPlaceholderContext> {
    const assignmentResolver = new HrAssignmentResolverService(this.supabase, this.context);
    const [employeeResult, companyResult, assignmentSnapshot, profileResult] = await Promise.all([
      this.supabase
        .from("hr_employees")
        .select("full_name, employee_number")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("companies")
        .select("name, legal_name")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", this.context.companyId)
        .is("deleted_at", null)
        .maybeSingle(),
      assignmentResolver.resolveEmployeeAssignments(employeeId, startsOn),
      this.supabase
        .from("hr_employment_profiles")
        .select("salary_package_ref")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let salary: string | null = null;
    if (profileResult.data?.salary_package_ref) {
      const { data: salaryLines } = await this.supabase
        .from("hr_salary_package_lines")
        .select("amount_override")
        .eq("tenant_id", this.context.tenantId)
        .eq("salary_package_version_id", String(profileResult.data.salary_package_ref))
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (salaryLines?.amount_override !== null && salaryLines?.amount_override !== undefined) {
        salary = String(salaryLines.amount_override);
      }
    }

    return {
      company: companyResult.data?.legal_name ? String(companyResult.data.legal_name) : companyResult.data?.name ? String(companyResult.data.name) : null,
      department: assignmentSnapshot.department?.label ?? null,
      employeeName: employeeResult.data?.full_name ? String(employeeResult.data.full_name) : null,
      employeeNumber: employeeResult.data?.employee_number ? String(employeeResult.data.employee_number) : null,
      endDate: endsOn,
      jobTitle: assignmentSnapshot.position?.label ?? null,
      salary,
      startDate: startsOn,
    };
  }

  private async loadContractType(contractTypeId: string): Promise<TypeRow> {
    const { data, error } = await this.supabase
      .from("hr_contract_types")
      .select("id, code, name, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", contractTypeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Contract type not found." });
    }
    return { code: String(data.code), id: String(data.id), name: String(data.name), status: String(data.status) };
  }

  private async loadVersion(contractTypeVersionId: string): Promise<VersionRow> {
    const { data, error } = await this.supabase
      .from("hr_contract_type_versions")
      .select("id, contract_type_id, version_no, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", contractTypeVersionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Contract type version not found." });
    }
    return {
      contract_type_id: String(data.contract_type_id),
      id: String(data.id),
      status: String(data.status),
      version_no: Number(data.version_no),
    };
  }

  private async nextVersionNo(contractTypeId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("hr_contract_type_versions")
      .select("version_no")
      .eq("tenant_id", this.context.tenantId)
      .eq("contract_type_id", contractTypeId)
      .is("deleted_at", null)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve next contract type version.", cause: error });
    }
    return data ? Number(data.version_no) + 1 : 1;
  }

  private async loadArticles(contractTypeVersionId: string): Promise<readonly ArticleRow[]> {
    const { data, error } = await this.supabase
      .from("hr_contract_type_articles")
      .select("sequence, code, title_en, title_ar, body_en, body_ar")
      .eq("tenant_id", this.context.tenantId)
      .eq("contract_type_version_id", contractTypeVersionId)
      .is("deleted_at", null)
      .order("sequence", { ascending: true });
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load contract type articles.", cause: error });
    }
    return (data ?? []).map((row) => ({
      body_ar: String(row.body_ar ?? ""),
      body_en: String(row.body_en ?? ""),
      code: row.code ? String(row.code) : null,
      sequence: Number(row.sequence),
      title_ar: row.title_ar ? String(row.title_ar) : null,
      title_en: String(row.title_en),
    }));
  }

  private async replaceArticles(
    contractTypeVersionId: string,
    articles: HrContractTypeArticlesSaveInput["articles"],
  ): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { error: deleteError } = await this.supabase
      .from("hr_contract_type_articles")
      .update({ deleted_at: deletedAt, deleted_by: this.context.userId, is_active: false, updated_by: this.context.userId })
      .eq("contract_type_version_id", contractTypeVersionId)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null);
    if (deleteError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not replace contract type articles.", cause: deleteError });
    }

    const version = await this.loadVersion(contractTypeVersionId);
    const { error: insertError } = await this.supabase.from("hr_contract_type_articles").insert(
      articles.map((article) => ({
        body_ar: article.bodyAr,
        body_en: article.bodyEn,
        branch_id: this.context.branchId,
        code: article.code ?? null,
        company_id: this.context.companyId,
        contract_type_version_id: contractTypeVersionId,
        created_by: this.context.userId,
        is_required: true,
        sequence: article.sequence,
        tenant_id: this.context.tenantId,
        title_ar: article.titleAr ?? null,
        title_en: article.titleEn,
        updated_by: this.context.userId,
      })),
    );
    if (insertError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save contract type articles.", cause: insertError });
    }
    void version;
  }

  private async copyArticles(sourceVersionId: string, targetVersionId: string): Promise<void> {
    const articles = await this.loadArticles(sourceVersionId);
    if (articles.length === 0) return;
    await this.replaceArticles(
      targetVersionId,
      articles.map((article) => ({
        bodyAr: article.body_ar,
        bodyEn: article.body_en,
        code: article.code ?? undefined,
        sequence: article.sequence,
        titleAr: article.title_ar ?? undefined,
        titleEn: article.title_en,
      })),
    );
  }
}

export { resolveContractPlaceholders };

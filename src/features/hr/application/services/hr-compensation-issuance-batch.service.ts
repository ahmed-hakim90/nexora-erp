import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob } from "@/platform/background-jobs/public-api";

import {
  HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS,
  HR_COMPENSATION_ISSUANCE_BATCH_CODE_PREFIX,
  HR_COMPENSATION_ISSUANCE_CHUNK_SIZE,
  HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB,
  HR_COMPENSATION_ISSUANCE_MAX_LINES,
  HR_COMPENSATION_ISSUANCE_SYNC_THRESHOLD,
  type HrCompensationIssuanceDocumentKind,
} from "../constants/hr-compensation-issuance.constants";
import {
  hrCompensationIssuanceBuildPreviewSchema,
  hrCompensationIssuanceCreateDraftSchema,
  hrCompensationIssuanceSaveLinesSchema,
  type HrCompensationIssuanceAmountConfig,
  type HrCompensationIssuanceBatchPreview,
  type HrCompensationIssuanceBuildPreviewInput,
  type HrCompensationIssuanceCreateDraftInput,
  type HrCompensationIssuanceRecipientPreview,
  type HrCompensationIssuanceSaveLinesInput,
  type HrCompensationIssuanceSelectionFilters,
} from "../schemas/hr-compensation-issuance-batch.schema";
import type { HrCompensationIssuanceAmountMode, HrCompensationIssuanceSelectionMode } from "../constants/hr-compensation-issuance.constants";
import { HrPayrollPeriodLifecycleService } from "./hr-payroll-period-lifecycle.service";
import { HrCompensationRecipientResolverService } from "./hr-compensation-recipient-resolver.service";
import {
  buildIssuancePreviewLines,
  nextCompensationIssuanceBatchCode,
} from "./hr-compensation-issuance-batch.engine";

type BatchRow = Readonly<{
  amount_config: HrCompensationIssuanceAmountConfig;
  amount_mode: HrCompensationIssuanceAmountMode;
  batch_code: string;
  branch_id: string | null;
  currency_code: string;
  document_kind: HrCompensationIssuanceDocumentKind;
  document_subtype: string;
  effective_date: string;
  employee_count: number;
  id: string;
  notes: string | null;
  payroll_period: string | null;
  reason: string | null;
  selection_filters: HrCompensationIssuanceSelectionFilters;
  selection_mode: HrCompensationIssuanceSelectionMode;
  status: string;
  total_amount: number;
}>;

type BatchLineRow = Readonly<{
  amount: number | null;
  employee_id: string;
  id: string;
  line_status: string;
  percentage: number | null;
  position_id: string | null;
  position_label: string | null;
  skip_reason: string | null;
}>;

function nextFinancialDocNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
}

function assertNoError(result: { error: unknown | null }, message: string): void {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

export class HrCompensationIssuanceBatchService {
  private readonly recipientResolver: HrCompensationRecipientResolverService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.recipientResolver = new HrCompensationRecipientResolverService(supabase, context);
  }

  async createDraft(input: HrCompensationIssuanceCreateDraftInput): Promise<{ batchCode: string; batchId: string }> {
    const parsed = hrCompensationIssuanceCreateDraftSchema.parse(input);
    const periodLifecycle = new HrPayrollPeriodLifecycleService(this.supabase, this.context);
    await periodLifecycle.assertPayrollDateRangeAllowsMutation(parsed.effectiveDate, parsed.effectiveDate);

    const batchCode = nextCompensationIssuanceBatchCode(HR_COMPENSATION_ISSUANCE_BATCH_CODE_PREFIX[parsed.documentKind]);
    const { data, error } = await this.supabase
      .from("hr_compensation_issuance_batches")
      .insert({
        amount_config: parsed.amountConfig,
        amount_mode: parsed.amountMode,
        batch_code: batchCode,
        branch_id: parsed.branchId ?? this.context.branchId ?? null,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        currency_code: parsed.currencyCode,
        document_kind: parsed.documentKind,
        document_subtype: parsed.documentSubtype,
        effective_date: parsed.effectiveDate,
        notes: parsed.notes ?? null,
        payroll_period: parsed.payrollPeriod ?? null,
        reason: parsed.reason ?? null,
        selection_filters: parsed.selectionFilters,
        selection_mode: parsed.selectionMode,
        status: "draft",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id, batch_code")
      .single();

    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create compensation issuance batch.", cause: error });
    }

    await recordAuditEvent({
      action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_compensation_issuance_batch",
      metadata: {
        batchCode,
        documentKind: parsed.documentKind,
        documentSubtype: parsed.documentSubtype,
        selectionMode: parsed.selectionMode,
      },
      module: "hr",
    });

    return { batchCode: String(data.batch_code), batchId: String(data.id) };
  }

  async resolveRecipients(batchId: string): Promise<readonly HrCompensationIssuanceRecipientPreview[]> {
    const batch = await this.getBatchRow(batchId);
    return this.recipientResolver.resolveRecipients({
      asOfDate: batch.effective_date,
      branchId: batch.branch_id,
      selectionFilters: batch.selection_filters,
      selectionMode: batch.selection_mode,
    });
  }

  async buildPreview(input: HrCompensationIssuanceBuildPreviewInput): Promise<HrCompensationIssuanceBatchPreview> {
    const parsed = hrCompensationIssuanceBuildPreviewSchema.parse(input);
    const batch = await this.getBatchRow(parsed.batchId);

    if (!["draft", "preview_ready"].includes(batch.status)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Preview is only available for draft batches." });
    }

    const recipients = await this.resolveRecipients(parsed.batchId);
    if (recipients.length > HR_COMPENSATION_ISSUANCE_MAX_LINES) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Batch exceeds maximum of ${HR_COMPENSATION_ISSUANCE_MAX_LINES} employees.`,
      });
    }

    const lineOverrides =
      parsed.lineOverrides ??
      (batch.selection_mode === "import"
        ? (batch.selection_filters.importLines ?? []).map((line) => ({
            amount: line.amount,
            employeeId: line.employeeId,
            percentage: line.percentage,
          }))
        : undefined);

    const preview = buildIssuancePreviewLines({
      amountConfig: batch.amount_config,
      amountMode: batch.amount_mode,
      documentKind: batch.document_kind,
      lineOverrides,
      recipients,
    });

    const duplicateWarnings = await this.detectDuplicateIssuanceWarnings(batch, recipients.map((recipient) => recipient.employeeId));
    const warnings = [...preview.warnings, ...duplicateWarnings];

    const includedCount = preview.lines.filter((line) => line.lineStatus === "pending").length;
    const skippedCount = preview.lines.length - includedCount;

    const { error: updateError } = await this.supabase
      .from("hr_compensation_issuance_batches")
      .update({
        employee_count: preview.lines.length,
        status: "preview_ready",
        total_amount: preview.totalAmount,
        updated_by: this.context.userId,
      })
      .eq("id", parsed.batchId)
      .eq("tenant_id", this.context.tenantId);

    assertNoError({ error: updateError }, "Could not update batch preview totals.");

    await recordAuditEvent({
      action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchPreviewBuilt,
      category: "data-access",
      context: this.context,
      entityId: parsed.batchId,
      entityType: "hr_compensation_issuance_batch",
      metadata: {
        employeeCount: preview.lines.length,
        includedCount,
        skippedCount,
        totalAmount: preview.totalAmount,
      },
      module: "hr",
    });

    return {
      batchId: parsed.batchId,
      currencyCode: batch.currency_code,
      documentKind: batch.document_kind,
      employeeCount: preview.lines.length,
      includedCount,
      lines: preview.lines,
      skippedCount,
      totalAmount: preview.totalAmount,
      warnings,
    };
  }

  async savePreviewLines(input: HrCompensationIssuanceSaveLinesInput): Promise<void> {
    const parsed = hrCompensationIssuanceSaveLinesSchema.parse(input);
    const batch = await this.getBatchRow(parsed.batchId);

    if (!["draft", "preview_ready"].includes(batch.status)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Lines can only be saved for draft batches." });
    }

    const deleteResult = await this.supabase
      .from("hr_compensation_issuance_batch_lines")
      .delete()
      .eq("batch_id", parsed.batchId)
      .eq("tenant_id", this.context.tenantId);
    assertNoError(deleteResult, "Could not clear existing batch lines.");

    if (parsed.lines.length === 0) {
      return;
    }

    const insertResult = await this.supabase.from("hr_compensation_issuance_batch_lines").insert(
      parsed.lines.map((line) => ({
        amount: line.amount ?? null,
        batch_id: parsed.batchId,
        currency_code: batch.currency_code,
        employee_id: line.employeeId,
        line_status: line.skipReason ? "skipped" : "pending",
        metadata: {},
        percentage: line.percentage ?? null,
        position_id: line.positionId ?? null,
        position_label: line.positionLabel ?? null,
        skip_reason: line.skipReason ?? null,
        tenant_id: this.context.tenantId,
      })),
    );
    assertNoError(insertResult, "Could not save batch preview lines.");

    const totalAmount = parsed.lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
    const updateResult = await this.supabase
      .from("hr_compensation_issuance_batches")
      .update({
        employee_count: parsed.lines.length,
        status: "preview_ready",
        total_amount: totalAmount,
        updated_by: this.context.userId,
      })
      .eq("id", parsed.batchId)
      .eq("tenant_id", this.context.tenantId);
    assertNoError(updateResult, "Could not update batch after saving lines.");
  }

  async getBatch(batchId: string): Promise<BatchRow> {
    return this.getBatchRow(batchId);
  }

  async submitBatch(batchId: string): Promise<{ createdCount: number; queued: boolean; skippedCount: number }> {
    await this.ensurePreviewLines(batchId);
    const lines = (await this.loadBatchLines(batchId)).filter((line) => line.line_status === "pending");
    if (lines.length === 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "No payable lines found in this batch." });
    }

    const batch = await this.getBatchRow(batchId);
    const periodLifecycle = new HrPayrollPeriodLifecycleService(this.supabase, this.context);
    await periodLifecycle.assertPayrollDateRangeAllowsMutation(batch.effective_date, batch.effective_date);

    if (lines.length > HR_COMPENSATION_ISSUANCE_SYNC_THRESHOLD) {
      await this.queueMaterializeJob(batchId);
      return { createdCount: 0, queued: true, skippedCount: lines.length };
    }

    const result = await this.processMaterializeJob(batchId);
    return { ...result, queued: false };
  }

  async processMaterializeJob(batchId: string): Promise<{ createdCount: number; skippedCount: number }> {
    let batch = await this.getBatchRow(batchId);
    if (!["draft", "preview_ready", "processing"].includes(batch.status)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Batch is not ready for materialization." });
    }

    if (batch.status !== "processing") {
      const markProcessing = await this.supabase
        .from("hr_compensation_issuance_batches")
        .update({ status: "processing", updated_by: this.context.userId })
        .eq("id", batchId)
        .eq("tenant_id", this.context.tenantId);
      assertNoError(markProcessing, "Could not mark batch as processing.");
      batch = await this.getBatchRow(batchId);
    }

    try {
      let createdCount = 0;
      let pendingLines = (await this.loadBatchLines(batchId)).filter((line) => line.line_status === "pending");

      while (pendingLines.length > 0) {
        const chunk = pendingLines.slice(0, HR_COMPENSATION_ISSUANCE_CHUNK_SIZE);
        for (const line of chunk) {
          const document = await this.materializeLineDocument(batch, line);
          const updateLine = await this.supabase
            .from("hr_compensation_issuance_batch_lines")
            .update({
              line_status: "created",
              target_document_id: document.id,
              target_document_number: document.documentNumber,
              updated_at: new Date().toISOString(),
            })
            .eq("id", line.id)
            .eq("tenant_id", this.context.tenantId);
          assertNoError(updateLine, "Could not update batch line after document creation.");
          createdCount += 1;
        }
        pendingLines = (await this.loadBatchLines(batchId)).filter((line) => line.line_status === "pending");
      }

      const skippedCount = (await this.loadBatchLines(batchId)).filter((line) => line.line_status === "skipped").length;
      const updateBatch = await this.supabase
        .from("hr_compensation_issuance_batches")
        .update({
          employee_count: createdCount + skippedCount,
          processing_error: null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: this.context.userId,
          updated_by: this.context.userId,
        })
        .eq("id", batchId)
        .eq("tenant_id", this.context.tenantId);
      assertNoError(updateBatch, "Could not finalize batch submission.");

      await recordAuditEvent({
        action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchSubmitted,
        category: "data-access",
        context: this.context,
        entityId: batchId,
        entityType: "hr_compensation_issuance_batch",
        metadata: { createdCount, skippedCount },
        module: "hr",
      });

      return { createdCount, skippedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compensation issuance materialization failed.";
      await this.supabase
        .from("hr_compensation_issuance_batches")
        .update({
          processing_error: message,
          status: "failed",
          updated_by: this.context.userId,
        })
        .eq("id", batchId)
        .eq("tenant_id", this.context.tenantId);

      await recordAuditEvent({
        action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchFailed,
        category: "data-access",
        context: this.context,
        entityId: batchId,
        entityType: "hr_compensation_issuance_batch",
        metadata: { message },
        module: "hr",
      });

      throw error;
    }
  }

  private async ensurePreviewLines(batchId: string): Promise<void> {
    let batch = await this.getBatchRow(batchId);
    if (!["draft", "preview_ready"].includes(batch.status)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only draft batches can be submitted." });
    }

    const existingLines = await this.loadBatchLines(batchId);
    if (existingLines.length > 0) return;

    const preview = await this.buildPreview({ batchId });
    await this.savePreviewLines({
      batchId,
      lines: preview.lines.map((line) => ({
        amount: line.amount,
        employeeId: line.employeeId,
        percentage: line.percentage,
        positionId: line.positionId,
        positionLabel: line.positionLabel,
        skipReason: line.skipReason,
      })),
    });
    batch = await this.getBatchRow(batchId);
    void batch;
  }

  private async queueMaterializeJob(batchId: string): Promise<string | null> {
    const batch = await this.getBatchRow(batchId);
    const idempotencyKey = `issuance-materialize:${batchId}`;
    const payload = {
      batchId,
      branchId: batch.branch_id,
      companyId: this.context.companyId,
      tenantId: this.context.tenantId,
      userId: this.context.userId,
    };

    createBackgroundJob(HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey,
      jobKey: HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB.key,
      originatingApp: "hr",
      payload,
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    const markProcessing = await this.supabase
      .from("hr_compensation_issuance_batches")
      .update({ status: "processing", updated_by: this.context.userId })
      .eq("id", batchId)
      .eq("tenant_id", this.context.tenantId);
    assertNoError(markProcessing, "Could not mark batch as processing.");

    const { data, error } = await this.supabase
      .from("background_jobs")
      .insert({
        created_by: this.context.userId,
        idempotency_key: idempotencyKey,
        job_key: HR_COMPENSATION_ISSUANCE_MATERIALIZE_JOB.key,
        payload,
        priority: "high",
        status: "queued",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not queue compensation issuance job.", cause: error });
    }

    const backgroundJobId = data?.id ? String(data.id) : null;
    if (backgroundJobId) {
      await this.supabase
        .from("hr_compensation_issuance_batches")
        .update({ background_job_id: backgroundJobId, updated_by: this.context.userId })
        .eq("id", batchId)
        .eq("tenant_id", this.context.tenantId);
    }

    return backgroundJobId;
  }

  async approveBatch(batchId: string): Promise<void> {
    const batch = await this.getBatchRow(batchId);
    if (batch.status !== "submitted") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted batches can be approved." });
    }

    await this.updateLinkedDocumentsStatus(batch.document_kind, batchId, "approved", {
      approval_date: new Date().toISOString().slice(0, 10),
      approved_by: this.context.userId,
    });

    const updateBatch = await this.supabase
      .from("hr_compensation_issuance_batches")
      .update({
        approved_at: new Date().toISOString(),
        approved_by: this.context.userId,
        status: "approved",
        updated_by: this.context.userId,
      })
      .eq("id", batchId)
      .eq("tenant_id", this.context.tenantId);
    assertNoError(updateBatch, "Could not approve compensation issuance batch.");

    await recordAuditEvent({
      action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchApproved,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_compensation_issuance_batch",
      module: "hr",
    });
  }

  async rejectBatch(batchId: string, reason: string): Promise<void> {
    const batch = await this.getBatchRow(batchId);
    if (batch.status !== "submitted") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted batches can be rejected." });
    }

    await this.updateLinkedDocumentsStatus(batch.document_kind, batchId, "rejected");

    const updateBatch = await this.supabase
      .from("hr_compensation_issuance_batches")
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: this.context.userId,
        rejection_reason: reason,
        status: "rejected",
        updated_by: this.context.userId,
      })
      .eq("id", batchId)
      .eq("tenant_id", this.context.tenantId);
    assertNoError(updateBatch, "Could not reject compensation issuance batch.");

    await recordAuditEvent({
      action: HR_COMPENSATION_ISSUANCE_AUDIT_ACTIONS.batchRejected,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_compensation_issuance_batch",
      metadata: { reason },
      module: "hr",
    });
  }

  private async detectDuplicateIssuanceWarnings(batch: BatchRow, employeeIds: readonly string[]): Promise<string[]> {
    if (employeeIds.length === 0) return [];

    const year = batch.effective_date.slice(0, 4);
    const table =
      batch.document_kind === "bonus" ? "hr_employee_bonuses" : batch.document_kind === "incentive" ? "hr_employee_incentives" : "hr_employee_penalties";
    const subtypeField =
      batch.document_kind === "bonus" ? "bonus_type" : batch.document_kind === "incentive" ? "incentive_type" : "penalty_type";

    const { data, error } = await this.supabase
      .from(table)
      .select("employee_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq(subtypeField, batch.document_subtype)
      .in("employee_id", [...employeeIds])
      .in("status", ["submitted", "approved"])
      .gte("effective_date", `${year}-01-01`)
      .lte("effective_date", `${year}-12-31`)
      .is("deleted_at", null)
      .neq("batch_id", batch.id);

    if (error) return [];

    const duplicateCount = new Set((data ?? []).map((row) => String(row.employee_id))).size;
    if (duplicateCount === 0) return [];

    return [
      `${duplicateCount} employee(s) already have a ${batch.document_subtype} ${batch.document_kind} record this year.`,
    ];
  }

  private async loadBatchLines(batchId: string): Promise<readonly BatchLineRow[]> {
    const { data, error } = await this.supabase
      .from("hr_compensation_issuance_batch_lines")
      .select("id, employee_id, amount, percentage, position_id, position_label, line_status, skip_reason")
      .eq("batch_id", batchId)
      .eq("tenant_id", this.context.tenantId)
      .order("created_at", { ascending: true });
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load batch lines.", cause: error });
    }
    return (data ?? []).map((row) => ({
      amount: row.amount === null ? null : Number(row.amount),
      employee_id: String(row.employee_id),
      id: String(row.id),
      line_status: String(row.line_status),
      percentage: row.percentage === null ? null : Number(row.percentage),
      position_id: row.position_id ? String(row.position_id) : null,
      position_label: row.position_label ? String(row.position_label) : null,
      skip_reason: row.skip_reason ? String(row.skip_reason) : null,
    }));
  }

  private async materializeLineDocument(
    batch: BatchRow,
    line: BatchLineRow,
  ): Promise<{ documentNumber: string; id: string }> {
    if (batch.document_kind === "bonus") {
      if (!line.amount || line.amount <= 0) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Bonus line amount must be greater than zero." });
      }
      const documentNumber = nextFinancialDocNumber("BON");
      const { data, error } = await this.supabase
        .from("hr_employee_bonuses")
        .insert({
          amount: line.amount,
          batch_id: batch.id,
          bonus_type: batch.document_subtype,
          branch_id: batch.branch_id,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          currency_code: batch.currency_code,
          document_number: documentNumber,
          effective_date: batch.effective_date,
          employee_id: line.employee_id,
          payroll_period: batch.payroll_period,
          reason: batch.reason,
          status: "submitted",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        })
        .select("id, document_number")
        .single();
      if (error || !data) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create bonus document.", cause: error });
      }
      return { documentNumber: String(data.document_number), id: String(data.id) };
    }

    if (batch.document_kind === "incentive") {
      if (!line.amount && !line.percentage) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Incentive line requires amount or percentage." });
      }
      const documentNumber = nextFinancialDocNumber("INC");
      const { data, error } = await this.supabase
        .from("hr_employee_incentives")
        .insert({
          amount: line.amount,
          batch_id: batch.id,
          branch_id: batch.branch_id,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          currency_code: batch.currency_code,
          document_number: documentNumber,
          effective_date: batch.effective_date,
          employee_id: line.employee_id,
          incentive_type: batch.document_subtype,
          notes: batch.notes,
          percentage: line.percentage,
          status: "submitted",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        })
        .select("id, document_number")
        .single();
      if (error || !data) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create incentive document.", cause: error });
      }
      return { documentNumber: String(data.document_number), id: String(data.id) };
    }

    const documentNumber = nextFinancialDocNumber("PEN");
    const { data, error } = await this.supabase
      .from("hr_employee_penalties")
      .insert({
        amount: line.amount,
        batch_id: batch.id,
        branch_id: batch.branch_id,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        currency_code: batch.currency_code,
        description: batch.reason ?? "Batch penalty",
        document_number: documentNumber,
        effective_date: batch.effective_date,
        employee_id: line.employee_id,
        incident_date: batch.effective_date,
        payroll_period: batch.payroll_period,
        penalty_type: batch.document_subtype,
        severity: "minor",
        status: "submitted",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id, document_number")
      .single();
    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create penalty document.", cause: error });
    }
    return { documentNumber: String(data.document_number), id: String(data.id) };
  }

  private async updateLinkedDocumentsStatus(
    documentKind: HrCompensationIssuanceDocumentKind,
    batchId: string,
    status: string,
    extraFields: Record<string, unknown> = {},
  ): Promise<void> {
    const table =
      documentKind === "bonus" ? "hr_employee_bonuses" : documentKind === "incentive" ? "hr_employee_incentives" : "hr_employee_penalties";
    const { error } = await this.supabase
      .from(table)
      .update({ status, updated_by: this.context.userId, ...extraFields })
      .eq("batch_id", batchId)
      .eq("tenant_id", this.context.tenantId)
      .eq("status", "submitted");
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update linked compensation documents.", cause: error });
    }
  }

  private async getBatchRow(batchId: string): Promise<BatchRow> {
    const { data, error } = await this.supabase
      .from("hr_compensation_issuance_batches")
      .select(
        "id, batch_code, document_kind, document_subtype, status, effective_date, selection_mode, selection_filters, amount_mode, amount_config, currency_code, branch_id, reason, notes, payroll_period, employee_count, total_amount",
      )
      .eq("id", batchId)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Compensation issuance batch not found." });
    }

    return {
      amount_config: (data.amount_config ?? {}) as HrCompensationIssuanceAmountConfig,
      amount_mode: String(data.amount_mode) as HrCompensationIssuanceAmountMode,
      batch_code: String(data.batch_code),
      branch_id: data.branch_id ? String(data.branch_id) : null,
      currency_code: String(data.currency_code ?? "SAR"),
      document_kind: String(data.document_kind) as HrCompensationIssuanceDocumentKind,
      document_subtype: String(data.document_subtype),
      effective_date: String(data.effective_date),
      employee_count: Number(data.employee_count ?? 0),
      id: String(data.id),
      notes: data.notes ? String(data.notes) : null,
      payroll_period: data.payroll_period ? String(data.payroll_period) : null,
      reason: data.reason ? String(data.reason) : null,
      selection_filters: (data.selection_filters ?? {}) as HrCompensationIssuanceSelectionFilters,
      selection_mode: String(data.selection_mode) as HrCompensationIssuanceSelectionMode,
      status: String(data.status),
      total_amount: Number(data.total_amount ?? 0),
    };
  }
}

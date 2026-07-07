import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import {
  defineNotification,
  type NotificationDefinition,
  type NotificationPriority,
} from "@/platform/notifications/public-api";

import {
  HR_NOTIFICATION_EVENT_KEYS,
  HR_NOTIFICATION_TRIGGER_DEFINITIONS,
  type HrNotificationEventKey,
} from "../../hr-production-readiness-foundation";
import { formatHrDisplayLabel } from "../utils/hr-display";

const HR_EXPIRY_NOTIFICATION_EVENT_KEYS = [
  HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching,
  HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching,
  HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon,
] as const satisfies readonly HrNotificationEventKey[];

type HrExpiryNotificationEventKey = (typeof HR_EXPIRY_NOTIFICATION_EVENT_KEYS)[number];

export type HrExpiryNotificationScanResult = Readonly<{
  contracts: number;
  documents: number;
  probation: number;
  total: number;
}>;

type HrOperatorNotificationInsert = Readonly<{
  body: string;
  employeeId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  eventKey: HrExpiryNotificationEventKey;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
  title: string;
}>;

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapSeverityToPriority(severity: "info" | "warning" | "error"): NotificationPriority {
  if (severity === "error") return "high";
  if (severity === "warning") return "normal";
  return "low";
}

function createExpiryNotificationDefinition(
  trigger: (typeof HR_NOTIFICATION_TRIGGER_DEFINITIONS)[number],
): NotificationDefinition {
  return defineNotification({
    channels: ["in-app"],
    description: trigger.description,
    durable: true,
    key: trigger.eventKey,
    name: trigger.label,
    priority: mapSeverityToPriority(trigger.severity),
    recipients: trigger.recipients.map((recipient) => ({
      id: recipient,
      type: "role",
    })),
    templateKey: trigger.eventKey,
  });
}

export const HR_NOTIFICATION_RUNTIME_HANDLERS = HR_NOTIFICATION_TRIGGER_DEFINITIONS.filter((trigger) =>
  (HR_EXPIRY_NOTIFICATION_EVENT_KEYS as readonly string[]).includes(trigger.eventKey),
).map((trigger) => createExpiryNotificationDefinition(trigger));

export class HrNotificationRuntimeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async runHrExpiryNotificationScan(): Promise<HrExpiryNotificationScanResult> {
    const [contracts, documents, probation] = await Promise.all([
      this.scanContractExpiry(),
      this.scanDocumentExpiry(),
      this.scanProbationEnding(),
    ]);

    return {
      contracts,
      documents,
      probation,
      total: contracts + documents + probation,
    };
  }

  private async scanContractExpiry(): Promise<number> {
    const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
      (definition) => definition.eventKey === HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching,
    );
    if (!trigger) return 0;

    const today = todayIso();
    const thresholdDate = addDaysIso(trigger.thresholdDays);

    const { data, error } = await this.supabase
      .from("hr_contracts")
      .select("id, employee_id, contract_number, ends_on, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .not("ends_on", "is", null)
      .gte("ends_on", today)
      .lte("ends_on", thresholdDate)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not scan expiring HR contracts.",
        cause: error,
      });
    }

    let created = 0;
    for (const row of data ?? []) {
      const inserted = await this.insertOperatorNotification({
        body: `Contract ${formatHrDisplayLabel(row.contract_number, "Contract")} expires on ${String(row.ends_on)}.`,
        employeeId: String(row.employee_id),
        entityId: String(row.id),
        entityType: "hr_contracts",
        eventKey: HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching,
        idempotencyKey: `${HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching}:${row.id}:${row.ends_on}`,
        payload: {
          contractNumber: row.contract_number,
          endsOn: row.ends_on,
          thresholdDays: trigger.thresholdDays,
        },
        severity: trigger.severity,
        title: trigger.label,
      });
      if (inserted) created += 1;
    }

    return created;
  }

  private async scanDocumentExpiry(): Promise<number> {
    const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
      (definition) => definition.eventKey === HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching,
    );
    if (!trigger) return 0;

    const today = todayIso();
    const thresholdDate = addDaysIso(trigger.thresholdDays);

    const { data, error } = await this.supabase
      .from("file_attachments")
      .select("id, entity_id, file_name, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("module_key", "hr")
      .eq("entity_type", "hr_employee_document")
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not scan expiring HR documents.",
        cause: error,
      });
    }

    let created = 0;
    for (const row of data ?? []) {
      const metadata = row.metadata;
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) continue;
      const expiryDate = (metadata as Record<string, unknown>).expiry_date;
      if (!expiryDate) continue;

      const expiry = String(expiryDate);
      if (expiry < today || expiry > thresholdDate) continue;

      const inserted = await this.insertOperatorNotification({
        body: `Document ${formatHrDisplayLabel(row.file_name, "Document")} expires on ${expiry}.`,
        employeeId: row.entity_id ? String(row.entity_id) : null,
        entityId: String(row.id),
        entityType: "hr_employee_document",
        eventKey: HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching,
        idempotencyKey: `${HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching}:${row.id}:${expiry}`,
        payload: {
          expiryDate: expiry,
          fileName: row.file_name,
          thresholdDays: trigger.thresholdDays,
        },
        severity: trigger.severity,
        title: trigger.label,
      });
      if (inserted) created += 1;
    }

    return created;
  }

  private async scanProbationEnding(): Promise<number> {
    const trigger = HR_NOTIFICATION_TRIGGER_DEFINITIONS.find(
      (definition) => definition.eventKey === HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon,
    );
    if (!trigger) return 0;

    const today = todayIso();
    const thresholdDate = addDaysIso(trigger.thresholdDays);

    const { data: lifecycleRows, error: lifecycleError } = await this.supabase
      .from("hr_employee_lifecycle_states")
      .select("id, employee_id, effective_from")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("lifecycle_state", "probation")
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .is("deleted_at", null);

    if (lifecycleError) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not scan probation lifecycle states.",
        cause: lifecycleError,
      });
    }

    if (!lifecycleRows || lifecycleRows.length === 0) {
      return 0;
    }

    const employeeIds = [...new Set(lifecycleRows.map((row) => String(row.employee_id)))];
    const { data: contracts, error: contractsError } = await this.supabase
      .from("hr_contracts")
      .select("employee_id, starts_on, probation_period_days, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("employee_id", employeeIds)
      .in("status", ["active", "signed"])
      .is("deleted_at", null);

    if (contractsError) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not load probation contracts for notification scan.",
        cause: contractsError,
      });
    }

    const contractByEmployee = new Map<string, { startsOn: string; probationPeriodDays: number | null }>();
    for (const contract of contracts ?? []) {
      contractByEmployee.set(String(contract.employee_id), {
        probationPeriodDays:
          contract.probation_period_days === null ? null : Number(contract.probation_period_days),
        startsOn: String(contract.starts_on),
      });
    }

    let created = 0;
    for (const lifecycle of lifecycleRows) {
      const employeeId = String(lifecycle.employee_id);
      const contract = contractByEmployee.get(employeeId);
      const probationDays = contract?.probationPeriodDays ?? 90;
      const startDate = contract?.startsOn ?? String(lifecycle.effective_from);
      const probationEnd = addDaysToDate(startDate, probationDays);

      if (probationEnd < today || probationEnd > thresholdDate) {
        continue;
      }

      const inserted = await this.insertOperatorNotification({
        body: `Probation for employee ${employeeId} ends on ${probationEnd}.`,
        employeeId,
        entityId: String(lifecycle.id),
        entityType: "hr_employee_lifecycle_states",
        eventKey: HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon,
        idempotencyKey: `${HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon}:${lifecycle.id}:${probationEnd}`,
        payload: {
          effectiveFrom: lifecycle.effective_from,
          probationEnd,
          probationPeriodDays: probationDays,
          thresholdDays: trigger.thresholdDays,
        },
        severity: trigger.severity,
        title: trigger.label,
      });
      if (inserted) created += 1;
    }

    return created;
  }

  private async insertOperatorNotification(input: HrOperatorNotificationInsert): Promise<boolean> {
    const { error } = await this.supabase.from("hr_operator_notifications").insert({
      body: input.body,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: input.employeeId ?? null,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
      event_key: input.eventKey,
      idempotency_key: input.idempotencyKey,
      payload: input.payload ?? {},
      severity: input.severity,
      status: "unread",
      tenant_id: this.context.tenantId,
      title: input.title,
      updated_by: this.context.userId,
    });

    if (!error) {
      return true;
    }

    if (isUniqueViolation(error)) {
      return false;
    }

    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not create HR operator notification.",
      cause: error,
    });
  }
}

function addDaysToDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function runHrExpiryNotificationScan(
  context: BranchRequestContext,
): Promise<HrExpiryNotificationScanResult> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrNotificationRuntimeService(supabase, context);
  return service.runHrExpiryNotificationScan();
}

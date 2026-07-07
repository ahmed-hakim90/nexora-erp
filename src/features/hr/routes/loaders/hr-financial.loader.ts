import type { HrEmployeeAdvance, HrEmployeeBankAccount, HrEmployeeBonus, HrEmployeeIncentive, HrEmployeeLoan, HrEmployeePenalty } from "../../financial-services-foundation";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { ApplicationError } from "@/core/errors";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

async function loadEmployeeMap(supabase: ReturnType<typeof createRequestSupabaseClient>, employeeIds: string[]) {
  const employeeMap = new Map<string, string>();
  if (employeeIds.length === 0) return employeeMap;
  const { data: emps } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
  for (const emp of emps ?? []) {
    employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
  }
  return employeeMap;
}

async function resolveEmployeeIdsBySearch(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  tenantId: string,
  companyId: string,
  search: string,
) {
  const term = search.replaceAll("%", "").trim();
  if (!term) return null;
  const { data } = await supabase
    .from("hr_employees")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .or(`full_name.ilike.%${term}%,employee_number.ilike.%${term}%`)
    .limit(200);
  return (data ?? []).map((row) => String(row.id));
}

// ─── Bank Accounts Loader ─────────────────────────────────────────────────────

export type HrBankAccountsWorkspaceData = {
  records: HrEmployeeBankAccount[];
  employeeFilter: string | null;
};

export function mapBankAccountRow(row: Record<string, unknown>): HrEmployeeBankAccount {
  return {
    accountHolderName: String(row.account_holder_name ?? ""),
    accountNumber: String(row.account_number ?? ""),
    accountType: String(row.account_type ?? "current") as HrEmployeeBankAccount["accountType"],
    bankName: String(row.bank_name ?? ""),
    currencyCode: String(row.currency_code ?? "SAR"),
    effectiveFrom: String(row.effective_from ?? ""),
    effectiveTo: row.effective_to ? String(row.effective_to) : null,
    employeeId: String(row.employee_id ?? ""),
    iban: row.iban ? String(row.iban) : null,
    id: String(row.id ?? ""),
    isPrimary: Boolean(row.is_primary),
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status ?? "active"),
    swiftCode: row.swift_code ? String(row.swift_code) : null,
  };
}

// ─── Advances Loader ──────────────────────────────────────────────────────────

export type HrAdvancesWorkspaceData = {
  records: HrEmployeeAdvance[];
  employeeOptions: Array<{ id: string; label: string }>;
  totalOutstanding: number;
  activeCount: number;
};

export function mapAdvanceRow(row: Record<string, unknown>, employeeLabel?: string): HrEmployeeAdvance {
  return {
    advanceType: String(row.advance_type ?? "salary") as HrEmployeeAdvance["advanceType"],
    approvalDate: row.approval_date ? String(row.approval_date) : null,
    approvedAmount: row.approved_amount !== null && row.approved_amount !== undefined ? Number(row.approved_amount) : null,
    currencyCode: String(row.currency_code ?? "SAR"),
    deductionMonths: row.deduction_months ? Number(row.deduction_months) : null,
    deductionStartMonth: row.deduction_start_month ? String(row.deduction_start_month) : null,
    disbursedAmount: row.disbursed_amount !== null && row.disbursed_amount !== undefined ? Number(row.disbursed_amount) : null,
    disbursementDate: row.disbursement_date ? String(row.disbursement_date) : null,
    documentNumber: String(row.document_number ?? ""),
    employeeId: String(row.employee_id ?? ""),
    employeeLabel,
    expectedSettlementDate: row.expected_settlement_date ? String(row.expected_settlement_date) : null,
    id: String(row.id ?? ""),
    monthlyDeduction: row.monthly_deduction !== null && row.monthly_deduction !== undefined ? Number(row.monthly_deduction) : null,
    notes: row.notes ? String(row.notes) : null,
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    reason: row.reason ? String(row.reason) : null,
    requestDate: String(row.request_date ?? ""),
    requestedAmount: Number(row.requested_amount ?? 0),
    settlementDate: row.settlement_date ? String(row.settlement_date) : null,
    status: String(row.status ?? "draft") as HrEmployeeAdvance["status"],
  };
}

// ─── Loans Loader ─────────────────────────────────────────────────────────────

export type HrLoansWorkspaceData = {
  records: HrEmployeeLoan[];
  employeeOptions: Array<{ id: string; label: string }>;
  totalOutstanding: number;
  activeCount: number;
};

export function mapLoanRow(row: Record<string, unknown>, employeeLabel?: string): HrEmployeeLoan {
  return {
    agreementDate: row.agreement_date ? String(row.agreement_date) : null,
    approvalDate: row.approval_date ? String(row.approval_date) : null,
    approvedAmount: row.approved_amount !== null && row.approved_amount !== undefined ? Number(row.approved_amount) : null,
    closureDate: row.closure_date ? String(row.closure_date) : null,
    currencyCode: String(row.currency_code ?? "SAR"),
    disbursedAmount: row.disbursed_amount !== null && row.disbursed_amount !== undefined ? Number(row.disbursed_amount) : null,
    disbursementDate: row.disbursement_date ? String(row.disbursement_date) : null,
    documentNumber: String(row.document_number ?? ""),
    employeeId: String(row.employee_id ?? ""),
    employeeLabel,
    firstInstallmentDate: row.first_installment_date ? String(row.first_installment_date) : null,
    id: String(row.id ?? ""),
    interestRate: Number(row.interest_rate ?? 0),
    loanType: String(row.loan_type ?? "personal") as HrEmployeeLoan["loanType"],
    monthlyInstallment: row.monthly_installment !== null && row.monthly_installment !== undefined ? Number(row.monthly_installment) : null,
    notes: row.notes ? String(row.notes) : null,
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    paidInstallments: Number(row.paid_installments ?? 0),
    principalAmount: Number(row.principal_amount ?? 0),
    purpose: row.purpose ? String(row.purpose) : null,
    requestDate: String(row.request_date ?? ""),
    status: String(row.status ?? "draft") as HrEmployeeLoan["status"],
    termMonths: Number(row.term_months ?? 12),
    totalInstallments: row.total_installments !== null && row.total_installments !== undefined ? Number(row.total_installments) : null,
  };
}

// ─── Bonuses Loader ───────────────────────────────────────────────────────────

export type HrBonusesWorkspaceData = {
  records: HrEmployeeBonus[];
  employeeOptions: Array<{ id: string; label: string }>;
  pendingCount: number;
};

export function mapBonusRow(row: Record<string, unknown>, employeeLabel?: string): HrEmployeeBonus {
  return {
    amount: Number(row.amount ?? 0),
    approvalDate: row.approval_date ? String(row.approval_date) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    bonusType: String(row.bonus_type ?? "performance") as HrEmployeeBonus["bonusType"],
    currencyCode: String(row.currency_code ?? "SAR"),
    documentNumber: String(row.document_number ?? ""),
    effectiveDate: String(row.effective_date ?? ""),
    employeeId: String(row.employee_id ?? ""),
    employeeLabel,
    id: String(row.id ?? ""),
    notes: row.notes ? String(row.notes) : null,
    payrollPeriod: row.payroll_period ? String(row.payroll_period) : null,
    reason: row.reason ? String(row.reason) : null,
    status: String(row.status ?? "draft"),
  };
}

// ─── Incentives Loader ────────────────────────────────────────────────────────

export type HrIncentivesWorkspaceData = {
  records: HrEmployeeIncentive[];
  employeeOptions: Array<{ id: string; label: string }>;
};

export function mapIncentiveRow(row: Record<string, unknown>, employeeLabel?: string): HrEmployeeIncentive {
  return {
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    currencyCode: String(row.currency_code ?? "SAR"),
    documentNumber: String(row.document_number ?? ""),
    effectiveDate: String(row.effective_date ?? ""),
    employeeId: String(row.employee_id ?? ""),
    employeeLabel,
    id: String(row.id ?? ""),
    incentiveType: String(row.incentive_type ?? "kpi") as HrEmployeeIncentive["incentiveType"],
    notes: row.notes ? String(row.notes) : null,
    percentage: row.percentage !== null && row.percentage !== undefined ? Number(row.percentage) : null,
    reviewPeriod: row.review_period ? String(row.review_period) : null,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    status: String(row.status ?? "draft"),
  };
}

// ─── Penalties Loader ─────────────────────────────────────────────────────────

export type HrPenaltiesWorkspaceData = {
  records: HrEmployeePenalty[];
  employeeOptions: Array<{ id: string; label: string }>;
};

export function mapPenaltyRow(row: Record<string, unknown>, employeeLabel?: string): HrEmployeePenalty {
  return {
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    appealOutcome: row.appeal_outcome ? String(row.appeal_outcome) : null,
    appealed: Boolean(row.appealed),
    currencyCode: String(row.currency_code ?? "SAR"),
    description: String(row.description ?? ""),
    documentNumber: String(row.document_number ?? ""),
    effectiveDate: row.effective_date ? String(row.effective_date) : null,
    employeeId: String(row.employee_id ?? ""),
    employeeLabel,
    id: String(row.id ?? ""),
    incidentDate: String(row.incident_date ?? ""),
    notes: row.notes ? String(row.notes) : null,
    payrollPeriod: row.payroll_period ? String(row.payroll_period) : null,
    penaltyType: String(row.penalty_type ?? "warning") as HrEmployeePenalty["penaltyType"],
    severity: String(row.severity ?? "minor") as HrEmployeePenalty["severity"],
    status: String(row.status ?? "draft"),
  };
}

// ─── Async Workspace Loaders ──────────────────────────────────────────────────

export async function loadHrPenaltiesWorkspace(query: { status?: string; search?: string; employeeId?: string }) {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_employee_penalties")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query.status) request = request.eq("status", query.status);
  if (query.employeeId) request = request.eq("employee_id", query.employeeId);
  if (query.search) {
    const ids = await resolveEmployeeIdsBySearch(supabase, context.tenantId, context.companyId, query.search);
    if (ids && ids.length === 0) return { records: [] as HrEmployeePenalty[] };
    if (ids) request = request.in("employee_id", ids);
  }

  const { data } = await request;
  const rows = data ?? [];
  const employeeMap = await loadEmployeeMap(supabase, [...new Set(rows.map((r) => String(r.employee_id)))]);
  return { records: rows.map((r) => mapPenaltyRow(r as Record<string, unknown>, employeeMap.get(String(r.employee_id)))) };
}

export async function loadHrBankAccountsWorkspace(query: { search?: string; employeeId?: string }) {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_employee_bank_accounts")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query.employeeId) request = request.eq("employee_id", query.employeeId);
  if (query.search) {
    const ids = await resolveEmployeeIdsBySearch(supabase, context.tenantId, context.companyId, query.search);
    if (ids && ids.length === 0) return { records: [] as HrEmployeeBankAccount[] };
    if (ids) request = request.in("employee_id", ids);
  }

  const { data } = await request;
  const rows = data ?? [];
  const employeeMap = await loadEmployeeMap(supabase, [...new Set(rows.map((r) => String(r.employee_id)))]);
  return {
    records: rows.map((r) => ({
      ...mapBankAccountRow(r as Record<string, unknown>),
      employeeLabel: employeeMap.get(String(r.employee_id)),
    })),
  };
}

export async function exportHrAdvancesCsv(query: { status?: string; search?: string } = {}): Promise<string> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_employee_advances")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (query.status) request = request.eq("status", query.status);
  if (query.search) {
    const ids = await resolveEmployeeIdsBySearch(supabase, context.tenantId, context.companyId, query.search);
    if (ids && ids.length === 0) return "Document #,Employee,Type,Requested,Outstanding,Status,Request Date\n";
    if (ids) request = request.in("employee_id", ids);
  }

  const { data, error } = await request;
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not export advances.", cause: error });

  const rows = data ?? [];
  const employeeMap = await loadEmployeeMap(supabase, [...new Set(rows.map((r) => String(r.employee_id)))]);
  const headers = ["Document #", "Employee", "Type", "Requested", "Outstanding", "Status", "Request Date"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const mapped = mapAdvanceRow(row as Record<string, unknown>, employeeMap.get(String(row.employee_id)));
    lines.push(
      [
        csvEscape(mapped.documentNumber),
        csvEscape(mapped.employeeLabel ?? mapped.employeeId),
        csvEscape(mapped.advanceType),
        String(mapped.requestedAmount),
        String(mapped.outstandingBalance),
        csvEscape(mapped.status),
        csvEscape(mapped.requestDate),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export async function exportHrLoansCsv(query: { status?: string } = {}): Promise<string> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_employee_loans")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (query.status) request = request.eq("status", query.status);

  const { data, error } = await request;
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not export loans.", cause: error });

  const rows = data ?? [];
  const employeeMap = await loadEmployeeMap(supabase, [...new Set(rows.map((r) => String(r.employee_id)))]);
  const headers = ["Document #", "Employee", "Type", "Principal", "Outstanding", "Status", "Request Date"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const mapped = mapLoanRow(row as Record<string, unknown>, employeeMap.get(String(row.employee_id)));
    lines.push(
      [
        csvEscape(mapped.documentNumber),
        csvEscape(mapped.employeeLabel ?? mapped.employeeId),
        csvEscape(mapped.loanType),
        String(mapped.principalAmount),
        String(mapped.outstandingBalance),
        csvEscape(mapped.status),
        csvEscape(mapped.requestDate),
      ].join(","),
    );
  }
  return lines.join("\n");
}

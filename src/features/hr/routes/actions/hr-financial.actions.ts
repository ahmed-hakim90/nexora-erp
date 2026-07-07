"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function nextDocNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function createEmployeeBankAccountAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountHolderName = String(formData.get("accountHolderName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim() || null;
  const swiftCode = String(formData.get("swiftCode") ?? "").trim() || null;
  const currencyCode = String(formData.get("currencyCode") ?? "SAR").trim();
  const accountType = String(formData.get("accountType") ?? "current").trim();
  const isPrimary = formData.get("isPrimary") === "true";
  const effectiveFrom = String(formData.get("effectiveFrom") ?? new Date().toISOString().slice(0, 10));

  if (!employeeId || !bankName || !accountHolderName || !accountNumber) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee, bank name, account holder, and account number are required." });
  }

  if (isPrimary) {
    await supabase
      .from("hr_employee_bank_accounts")
      .update({ is_primary: false, updated_by: context.userId })
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", employeeId)
      .eq("is_primary", true)
      .is("deleted_at", null);
  }

  const { error } = await supabase.from("hr_employee_bank_accounts").insert({
    account_holder_name: accountHolderName,
    account_number: accountNumber,
    account_type: accountType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: currencyCode,
    effective_from: effectiveFrom,
    employee_id: employeeId,
    iban,
    is_primary: isPrimary,
    bank_name: bankName,
    status: "active",
    swift_code: swiftCode,
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save bank account.", cause: error });

  revalidatePath("/erp/hr/bank-accounts");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function updateEmployeeBankAccountAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const accountId = String(formData.get("accountId") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountHolderName = String(formData.get("accountHolderName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const iban = String(formData.get("iban") ?? "").trim() || null;
  const swiftCode = String(formData.get("swiftCode") ?? "").trim() || null;
  const isPrimary = formData.get("isPrimary") === "true";

  if (!accountId || !bankName || !accountHolderName || !accountNumber) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Account ID, bank name, account holder, and account number are required." });
  }

  const { data: account } = await supabase
    .from("hr_employee_bank_accounts")
    .select("id, employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", accountId)
    .is("deleted_at", null)
    .single();
  if (!account) throw new ApplicationError({ code: "NOT_FOUND", message: "Bank account not found." });

  if (isPrimary) {
    await supabase
      .from("hr_employee_bank_accounts")
      .update({ is_primary: false, updated_by: context.userId })
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", account.employee_id)
      .eq("is_primary", true)
      .is("deleted_at", null);
  }

  const { error } = await supabase
    .from("hr_employee_bank_accounts")
    .update({
      account_holder_name: accountHolderName,
      account_number: accountNumber,
      bank_name: bankName,
      iban,
      is_primary: isPrimary,
      swift_code: swiftCode,
      updated_by: context.userId,
    })
    .eq("id", accountId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update bank account.", cause: error });

  revalidatePath("/erp/hr/bank-accounts");
  revalidatePath(`/erp/hr/employees/${String(account.employee_id)}`);
}

export async function archiveEmployeeBankAccountAction(accountId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_employee_bank_accounts")
    .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId, status: "archived", updated_by: context.userId })
    .eq("tenant_id", context.tenantId)
    .eq("id", accountId)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive bank account.", cause: error });

  revalidatePath("/erp/hr/bank-accounts");
}

// ─── Advances ─────────────────────────────────────────────────────────────────

export async function createEmployeeAdvanceAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const advanceType = String(formData.get("advanceType") ?? "salary").trim();
  const requestedAmount = parseFloat(String(formData.get("requestedAmount") ?? "0"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const deductionMonths = parseInt(String(formData.get("deductionMonths") ?? "1"), 10);
  const requestDate = String(formData.get("requestDate") ?? new Date().toISOString().slice(0, 10));

  if (!employeeId || !requestedAmount || requestedAmount <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and a positive advance amount are required." });
  }

  const monthlyDeduction = requestedAmount / deductionMonths;

  const { error } = await supabase.from("hr_employee_advances").insert({
    advance_type: advanceType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: "SAR",
    deduction_months: deductionMonths,
    document_number: nextDocNumber("ADV"),
    employee_id: employeeId,
    monthly_deduction: monthlyDeduction,
    outstanding_balance: requestedAmount,
    reason,
    request_date: requestDate,
    requested_amount: requestedAmount,
    status: "submitted",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create advance request.", cause: error });

  revalidatePath("/erp/hr/advances");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function approveEmployeeAdvanceAction(advanceId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: advance } = await supabase
    .from("hr_employee_advances")
    .select("id, employee_id, requested_amount, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", advanceId)
    .single();
  if (!advance) throw new ApplicationError({ code: "NOT_FOUND", message: "Advance not found." });
  if (advance.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted advances can be approved." });

  const { error } = await supabase
    .from("hr_employee_advances")
    .update({
      approval_date: new Date().toISOString().slice(0, 10),
      approved_amount: advance.requested_amount,
      approved_by: context.userId,
      status: "approved",
      updated_by: context.userId,
    })
    .eq("id", advanceId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve advance.", cause: error });

  revalidatePath("/erp/hr/advances");
  revalidatePath(`/erp/hr/employees/${String(advance.employee_id)}`);
}

export async function disburseEmployeeAdvanceAction(advanceId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: advance } = await supabase
    .from("hr_employee_advances")
    .select("id, employee_id, approved_amount, requested_amount, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", advanceId)
    .single();
  if (!advance) throw new ApplicationError({ code: "NOT_FOUND", message: "Advance not found." });
  if (!["approved"].includes(advance.status ?? "")) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only approved advances can be disbursed." });

  const disbursedAmount = advance.approved_amount ?? advance.requested_amount;

  const { error } = await supabase
    .from("hr_employee_advances")
    .update({
      disbursed_amount: disbursedAmount,
      disbursed_by: context.userId,
      disbursement_date: new Date().toISOString().slice(0, 10),
      outstanding_balance: disbursedAmount,
      status: "disbursed",
      updated_by: context.userId,
    })
    .eq("id", advanceId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not disburse advance.", cause: error });

  revalidatePath("/erp/hr/advances");
  revalidatePath(`/erp/hr/employees/${String(advance.employee_id)}`);
}

export async function cancelEmployeeAdvanceAction(advanceId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: advance } = await supabase
    .from("hr_employee_advances")
    .select("id, employee_id, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", advanceId)
    .single();
  if (!advance) throw new ApplicationError({ code: "NOT_FOUND", message: "Advance not found." });
  if (!["draft", "submitted", "approved"].includes(advance.status ?? "")) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Cannot cancel a disbursed or settled advance." });
  }

  const { error } = await supabase
    .from("hr_employee_advances")
    .update({ outstanding_balance: 0, status: "cancelled", updated_by: context.userId })
    .eq("id", advanceId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not cancel advance.", cause: error });

  revalidatePath("/erp/hr/advances");
  revalidatePath(`/erp/hr/employees/${String(advance.employee_id)}`);
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export async function createEmployeeLoanAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const loanType = String(formData.get("loanType") ?? "personal").trim();
  const principalAmount = parseFloat(String(formData.get("principalAmount") ?? "0"));
  const termMonths = parseInt(String(formData.get("termMonths") ?? "12"), 10);
  const interestRate = parseFloat(String(formData.get("interestRate") ?? "0"));
  const purpose = String(formData.get("purpose") ?? "").trim() || null;
  const requestDate = String(formData.get("requestDate") ?? new Date().toISOString().slice(0, 10));

  if (!employeeId || !principalAmount || principalAmount <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and a positive loan amount are required." });
  }

  const monthlyInterest = interestRate > 0 ? (principalAmount * (interestRate / 100)) / 12 : 0;
  const monthlyInstallment = principalAmount / termMonths + monthlyInterest;

  const { error } = await supabase.from("hr_employee_loans").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: "SAR",
    document_number: nextDocNumber("LOAN"),
    employee_id: employeeId,
    interest_rate: interestRate,
    loan_type: loanType,
    monthly_installment: monthlyInstallment,
    outstanding_balance: principalAmount,
    paid_installments: 0,
    principal_amount: principalAmount,
    purpose,
    request_date: requestDate,
    status: "submitted",
    tenant_id: context.tenantId,
    term_months: termMonths,
    total_installments: termMonths,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create loan request.", cause: error });

  revalidatePath("/erp/hr/loans");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function approveEmployeeLoanAction(loanId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: loan } = await supabase
    .from("hr_employee_loans")
    .select("id, employee_id, principal_amount, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", loanId)
    .single();
  if (!loan) throw new ApplicationError({ code: "NOT_FOUND", message: "Loan not found." });
  if (loan.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted loans can be approved." });

  const { error } = await supabase
    .from("hr_employee_loans")
    .update({
      approval_date: new Date().toISOString().slice(0, 10),
      approved_amount: loan.principal_amount,
      approved_by: context.userId,
      status: "approved",
      updated_by: context.userId,
    })
    .eq("id", loanId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve loan.", cause: error });

  revalidatePath("/erp/hr/loans");
  revalidatePath(`/erp/hr/employees/${String(loan.employee_id)}`);
}

export async function disburseEmployeeLoanAction(loanId: string, formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: loan } = await supabase
    .from("hr_employee_loans")
    .select("id, employee_id, approved_amount, principal_amount, term_months, monthly_installment, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", loanId)
    .single();
  if (!loan) throw new ApplicationError({ code: "NOT_FOUND", message: "Loan not found." });
  if (!["approved", "agreement_signed"].includes(loan.status ?? "")) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only approved loans can be disbursed." });
  }

  const firstInstallmentDate = String(formData.get("firstInstallmentDate") ?? new Date().toISOString().slice(0, 10));
  const disbursedAmount = loan.approved_amount ?? loan.principal_amount;

  const { error } = await supabase
    .from("hr_employee_loans")
    .update({
      disbursed_amount: disbursedAmount,
      disbursed_by: context.userId,
      disbursement_date: new Date().toISOString().slice(0, 10),
      first_installment_date: firstInstallmentDate,
      outstanding_balance: disbursedAmount,
      status: "active",
      updated_by: context.userId,
    })
    .eq("id", loanId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not disburse loan.", cause: error });

  // Generate installment schedule
  const termMonths = loan.term_months ?? 12;
  const monthly = loan.monthly_installment ?? disbursedAmount / termMonths;
  const startDate = new Date(firstInstallmentDate);
  const installments = Array.from({ length: termMonths }, (_, i) => {
    const dueDate = new Date(startDate);
    dueDate.setUTCMonth(dueDate.getUTCMonth() + i);
    return {
      company_id: context.companyId,
      created_by: context.userId,
      due_date: dueDate.toISOString().slice(0, 10),
      employee_id: loan.employee_id,
      installment_number: i + 1,
      interest_amount: 0,
      loan_id: loanId,
      paid_amount: 0,
      principal_amount: monthly,
      status: "pending",
      tenant_id: context.tenantId,
      total_amount: monthly,
      updated_by: context.userId,
    };
  });

  await supabase.from("hr_employee_loan_installments").insert(installments);

  revalidatePath("/erp/hr/loans");
  revalidatePath(`/erp/hr/employees/${String(loan.employee_id)}`);
}

export async function cancelEmployeeLoanAction(loanId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: loan } = await supabase
    .from("hr_employee_loans")
    .select("id, employee_id, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", loanId)
    .single();
  if (!loan) throw new ApplicationError({ code: "NOT_FOUND", message: "Loan not found." });
  if (!["draft", "submitted", "approved"].includes(loan.status ?? "")) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Cannot cancel an active or closed loan." });
  }

  const { error } = await supabase
    .from("hr_employee_loans")
    .update({ outstanding_balance: 0, status: "cancelled", updated_by: context.userId })
    .eq("id", loanId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not cancel loan.", cause: error });

  revalidatePath("/erp/hr/loans");
  revalidatePath(`/erp/hr/employees/${String(loan.employee_id)}`);
}

export async function settleEmployeeLoanAction(loanId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: loan } = await supabase
    .from("hr_employee_loans")
    .select("id, employee_id, status, total_installments, paid_installments")
    .eq("tenant_id", context.tenantId)
    .eq("id", loanId)
    .single();
  if (!loan) throw new ApplicationError({ code: "NOT_FOUND", message: "Loan not found." });
  if (!["active", "disbursed"].includes(loan.status ?? "")) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only active or disbursed loans can be settled." });
  }

  const closureDate = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("hr_employee_loans")
    .update({
      closure_date: closureDate,
      outstanding_balance: 0,
      paid_installments: loan.total_installments ?? loan.paid_installments ?? 0,
      status: "closed",
      updated_by: context.userId,
    })
    .eq("id", loanId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not settle loan.", cause: error });

  const { data: installments } = await supabase
    .from("hr_employee_loan_installments")
    .select("id, total_amount")
    .eq("loan_id", loanId)
    .eq("tenant_id", context.tenantId)
    .in("status", ["pending", "partial", "overdue"]);
  for (const inst of installments ?? []) {
    await supabase
      .from("hr_employee_loan_installments")
      .update({ paid_amount: inst.total_amount, status: "paid", updated_by: context.userId })
      .eq("id", inst.id);
  }

  revalidatePath("/erp/hr/loans");
  revalidatePath(`/erp/hr/employees/${String(loan.employee_id)}`);
}

// ─── Bonuses ──────────────────────────────────────────────────────────────────

export async function createEmployeeBonusAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const bonusType = String(formData.get("bonusType") ?? "performance").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const effectiveDate = String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10));
  const payrollPeriod = String(formData.get("payrollPeriod") ?? "").trim() || null;

  if (!employeeId || !amount || amount <= 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and a positive bonus amount are required." });
  }

  const { error } = await supabase.from("hr_employee_bonuses").insert({
    amount,
    bonus_type: bonusType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: "SAR",
    document_number: nextDocNumber("BON"),
    effective_date: effectiveDate,
    employee_id: employeeId,
    payroll_period: payrollPeriod,
    reason,
    status: "submitted",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create bonus.", cause: error });

  revalidatePath("/erp/hr/bonuses");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function approveBonusAction(bonusId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: bonus } = await supabase.from("hr_employee_bonuses").select("id, employee_id, status").eq("tenant_id", context.tenantId).eq("id", bonusId).single();
  if (!bonus) throw new ApplicationError({ code: "NOT_FOUND", message: "Bonus not found." });
  if (bonus.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted bonuses can be approved." });

  const { error } = await supabase
    .from("hr_employee_bonuses")
    .update({ approval_date: new Date().toISOString().slice(0, 10), approved_by: context.userId, status: "approved", updated_by: context.userId })
    .eq("id", bonusId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve bonus.", cause: error });

  revalidatePath("/erp/hr/bonuses");
  revalidatePath(`/erp/hr/employees/${String(bonus.employee_id)}`);
}

export async function rejectBonusAction(bonusId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: bonus } = await supabase.from("hr_employee_bonuses").select("id, employee_id, status").eq("tenant_id", context.tenantId).eq("id", bonusId).single();
  if (!bonus) throw new ApplicationError({ code: "NOT_FOUND", message: "Bonus not found." });
  if (bonus.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted bonuses can be rejected." });

  const { error } = await supabase
    .from("hr_employee_bonuses")
    .update({ status: "rejected", updated_by: context.userId })
    .eq("id", bonusId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reject bonus.", cause: error });

  revalidatePath("/erp/hr/bonuses");
  revalidatePath(`/erp/hr/employees/${String(bonus.employee_id)}`);
}

// ─── Incentives ───────────────────────────────────────────────────────────────

export async function createEmployeeIncentiveAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const incentiveType = String(formData.get("incentiveType") ?? "kpi").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || null;
  const percentage = parseFloat(String(formData.get("percentage") ?? "0")) || null;
  const score = parseFloat(String(formData.get("score") ?? "0")) || null;
  const effectiveDate = String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10));
  const reviewPeriod = String(formData.get("reviewPeriod") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee is required." });
  if (!amount && !percentage) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Either amount or percentage is required for an incentive." });

  const { error } = await supabase.from("hr_employee_incentives").insert({
    amount: amount ?? null,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: "SAR",
    document_number: nextDocNumber("INC"),
    effective_date: effectiveDate,
    employee_id: employeeId,
    incentive_type: incentiveType,
    notes,
    percentage: percentage ?? null,
    review_period: reviewPeriod,
    score,
    status: "submitted",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create incentive.", cause: error });

  revalidatePath("/erp/hr/incentives");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function approveEmployeeIncentiveAction(incentiveId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: incentive } = await supabase.from("hr_employee_incentives").select("id, employee_id, status").eq("tenant_id", context.tenantId).eq("id", incentiveId).single();
  if (!incentive) throw new ApplicationError({ code: "NOT_FOUND", message: "Incentive not found." });
  if (incentive.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted incentives can be approved." });

  const { error } = await supabase
    .from("hr_employee_incentives")
    .update({ approval_date: new Date().toISOString().slice(0, 10), approved_by: context.userId, status: "approved", updated_by: context.userId })
    .eq("id", incentiveId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve incentive.", cause: error });

  revalidatePath("/erp/hr/incentives");
  revalidatePath(`/erp/hr/employees/${String(incentive.employee_id)}`);
}

export async function rejectEmployeeIncentiveAction(incentiveId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: incentive } = await supabase.from("hr_employee_incentives").select("id, employee_id, status").eq("tenant_id", context.tenantId).eq("id", incentiveId).single();
  if (!incentive) throw new ApplicationError({ code: "NOT_FOUND", message: "Incentive not found." });
  if (incentive.status !== "submitted") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only submitted incentives can be rejected." });

  const { error } = await supabase
    .from("hr_employee_incentives")
    .update({ status: "rejected", updated_by: context.userId })
    .eq("id", incentiveId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not reject incentive.", cause: error });

  revalidatePath("/erp/hr/incentives");
  revalidatePath(`/erp/hr/employees/${String(incentive.employee_id)}`);
}

// ─── Penalties ────────────────────────────────────────────────────────────────

export async function createEmployeePenaltyAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const penaltyType = String(formData.get("penaltyType") ?? "warning").trim();
  const severity = String(formData.get("severity") ?? "minor").trim();
  const description = String(formData.get("description") ?? "").trim();
  const incidentDate = String(formData.get("incidentDate") ?? new Date().toISOString().slice(0, 10));
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId || !description) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and description are required." });
  }

  const { error } = await supabase.from("hr_employee_penalties").insert({
    amount,
    appealed: false,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    currency_code: "SAR",
    description,
    document_number: nextDocNumber("PEN"),
    employee_id: employeeId,
    incident_date: incidentDate,
    issued_by: context.userId,
    notes,
    penalty_type: penaltyType,
    severity,
    status: "issued",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create penalty.", cause: error });

  revalidatePath("/erp/hr/penalties");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function acknowledgePenaltyAction(penaltyId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: penalty } = await supabase.from("hr_employee_penalties").select("id, employee_id, status").eq("tenant_id", context.tenantId).eq("id", penaltyId).single();
  if (!penalty) throw new ApplicationError({ code: "NOT_FOUND", message: "Penalty not found." });

  const { error } = await supabase
    .from("hr_employee_penalties")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: context.userId, status: "acknowledged", updated_by: context.userId })
    .eq("id", penaltyId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not acknowledge penalty.", cause: error });

  revalidatePath("/erp/hr/penalties");
  revalidatePath(`/erp/hr/employees/${String(penalty.employee_id)}`);
}

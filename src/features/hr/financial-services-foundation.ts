/**
 * HR Employee Financial Services Foundation
 *
 * Defines types, constants, and domain contracts for:
 * - Employee bank accounts
 * - Salary advances
 * - Employee loans (with installment schedule)
 * - Bonuses
 * - Incentives
 * - Penalties
 * - Salary certificates
 * - Final settlement readiness
 */

// ─── Bank Account Types ───────────────────────────────────────────────────────

export const HR_BANK_ACCOUNT_TYPES = [
  { label: "Current Account", value: "current" },
  { label: "Savings Account", value: "savings" },
  { label: "Payroll Account", value: "payroll" },
] as const;

export type HrBankAccountType = (typeof HR_BANK_ACCOUNT_TYPES)[number]["value"];

export type HrEmployeeBankAccount = {
  id: string;
  employeeId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string | null;
  swiftCode: string | null;
  currencyCode: string;
  accountType: HrBankAccountType;
  isPrimary: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  notes: string | null;
};

// ─── Advance Types ────────────────────────────────────────────────────────────

export const HR_ADVANCE_TYPES = [
  { label: "Salary Advance", value: "salary" },
  { label: "Emergency Advance", value: "emergency" },
  { label: "Housing Advance", value: "housing" },
  { label: "Medical Advance", value: "medical" },
  { label: "Other", value: "other" },
] as const;

export type HrAdvanceType = (typeof HR_ADVANCE_TYPES)[number]["value"];

export const HR_ADVANCE_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Disbursed", value: "disbursed" },
  { label: "Partially Settled", value: "partially_settled" },
  { label: "Settled", value: "settled" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
] as const;

export type HrAdvanceStatus = (typeof HR_ADVANCE_STATUSES)[number]["value"];

export type HrEmployeeAdvance = {
  id: string;
  employeeId: string;
  employeeLabel?: string;
  documentNumber: string;
  advanceType: HrAdvanceType;
  requestedAmount: number;
  approvedAmount: number | null;
  disbursedAmount: number | null;
  outstandingBalance: number;
  currencyCode: string;
  status: HrAdvanceStatus;
  requestDate: string;
  approvalDate: string | null;
  disbursementDate: string | null;
  expectedSettlementDate: string | null;
  settlementDate: string | null;
  deductionMonths: number | null;
  monthlyDeduction: number | null;
  deductionStartMonth: string | null;
  reason: string | null;
  notes: string | null;
};

// ─── Loan Types ───────────────────────────────────────────────────────────────

export const HR_LOAN_TYPES = [
  { label: "Personal Loan", value: "personal" },
  { label: "Housing Loan", value: "housing" },
  { label: "Vehicle Loan", value: "vehicle" },
  { label: "Education Loan", value: "education" },
  { label: "Emergency Loan", value: "emergency" },
  { label: "Other", value: "other" },
] as const;

export type HrLoanType = (typeof HR_LOAN_TYPES)[number]["value"];

export const HR_LOAN_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Agreement Signed", value: "agreement_signed" },
  { label: "Disbursed", value: "disbursed" },
  { label: "Active", value: "active" },
  { label: "Early Settled", value: "early_settled" },
  { label: "Closed", value: "closed" },
  { label: "Restructured", value: "restructured" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
] as const;

export type HrLoanStatus = (typeof HR_LOAN_STATUSES)[number]["value"];

export type HrEmployeeLoan = {
  id: string;
  employeeId: string;
  employeeLabel?: string;
  documentNumber: string;
  loanType: HrLoanType;
  principalAmount: number;
  approvedAmount: number | null;
  disbursedAmount: number | null;
  outstandingBalance: number;
  interestRate: number;
  currencyCode: string;
  status: HrLoanStatus;
  requestDate: string;
  approvalDate: string | null;
  agreementDate: string | null;
  disbursementDate: string | null;
  firstInstallmentDate: string | null;
  closureDate: string | null;
  termMonths: number;
  monthlyInstallment: number | null;
  totalInstallments: number | null;
  paidInstallments: number;
  purpose: string | null;
  notes: string | null;
};

export type HrLoanInstallment = {
  id: string;
  loanId: string;
  employeeId: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: "pending" | "paid" | "overdue" | "partial";
  paidAt: string | null;
  payrollPeriod: string | null;
};

// ─── Bonus Types ──────────────────────────────────────────────────────────────

export const HR_BONUS_TYPES = [
  { label: "Performance Bonus", value: "performance" },
  { label: "Annual Bonus", value: "annual" },
  { label: "Spot Bonus", value: "spot" },
  { label: "Retention Bonus", value: "retention" },
  { label: "Project Completion", value: "project" },
  { label: "Ramadan Bonus", value: "ramadan" },
  { label: "Eid Bonus", value: "eid" },
  { label: "Other", value: "other" },
] as const;

export type HrBonusType = (typeof HR_BONUS_TYPES)[number]["value"];

export const HR_FINANCIAL_DOC_STATUSES = [
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Processed", value: "processed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
] as const;

export type HrEmployeeBonus = {
  id: string;
  employeeId: string;
  employeeLabel?: string;
  documentNumber: string;
  bonusType: HrBonusType;
  amount: number;
  currencyCode: string;
  status: string;
  effectiveDate: string;
  payrollPeriod: string | null;
  reason: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
};

// ─── Incentive Types ──────────────────────────────────────────────────────────

export const HR_INCENTIVE_TYPES = [
  { label: "KPI Achievement", value: "kpi" },
  { label: "Sales Target", value: "sales" },
  { label: "Attendance Incentive", value: "attendance" },
  { label: "Innovation Award", value: "innovation" },
  { label: "Long Service", value: "long_service" },
  { label: "Other", value: "other" },
] as const;

export type HrIncentiveType = (typeof HR_INCENTIVE_TYPES)[number]["value"];

export type HrEmployeeIncentive = {
  id: string;
  employeeId: string;
  employeeLabel?: string;
  documentNumber: string;
  incentiveType: HrIncentiveType;
  amount: number | null;
  percentage: number | null;
  currencyCode: string;
  status: string;
  effectiveDate: string;
  reviewPeriod: string | null;
  score: number | null;
  notes: string | null;
};

// ─── Penalty Types ────────────────────────────────────────────────────────────

export const HR_PENALTY_TYPES = [
  { label: "Written Warning", value: "warning" },
  { label: "Final Warning", value: "final_warning" },
  { label: "Salary Deduction", value: "deduction" },
  { label: "Suspension", value: "suspension" },
  { label: "Demotion", value: "demotion" },
  { label: "Termination Notice", value: "termination_notice" },
] as const;

export type HrPenaltyType = (typeof HR_PENALTY_TYPES)[number]["value"];

export const HR_PENALTY_SEVERITIES = [
  { label: "Minor", value: "minor" },
  { label: "Moderate", value: "moderate" },
  { label: "Serious", value: "serious" },
  { label: "Gross Misconduct", value: "gross_misconduct" },
] as const;

export type HrPenaltySeverity = (typeof HR_PENALTY_SEVERITIES)[number]["value"];

export type HrEmployeePenalty = {
  id: string;
  employeeId: string;
  employeeLabel?: string;
  documentNumber: string;
  penaltyType: HrPenaltyType;
  severity: HrPenaltySeverity;
  amount: number | null;
  currencyCode: string;
  status: string;
  incidentDate: string;
  effectiveDate: string | null;
  payrollPeriod: string | null;
  description: string;
  notes: string | null;
  appealed: boolean;
  appealOutcome: string | null;
};

// ─── Financial Summary ────────────────────────────────────────────────────────

export type HrEmployeeFinancialSummary = {
  employeeId: string;
  activeAdvancesCount: number;
  totalAdvancesOutstanding: number;
  activeLoansCount: number;
  totalLoansOutstanding: number;
  pendingBonusesCount: number;
  pendingBonusesAmount: number;
  currencyCode: string;
};

// ─── Salary Certificate Types ─────────────────────────────────────────────────

export const HR_SALARY_CERTIFICATE_PURPOSES = [
  { label: "Bank / Mortgage", value: "bank" },
  { label: "Embassy / Visa", value: "embassy" },
  { label: "Rental Agreement", value: "rental" },
  { label: "Government Agency", value: "government" },
  { label: "Personal Use", value: "personal" },
] as const;

export type HrSalaryCertificatePurpose = (typeof HR_SALARY_CERTIFICATE_PURPOSES)[number]["value"];

// ─── Final Settlement Readiness ───────────────────────────────────────────────

export type HrFinalSettlementReadiness = {
  employeeId: string;
  hasActiveContract: boolean;
  outstandingAdvances: number;
  outstandingLoans: number;
  outstandingCustody: number;
  pendingLeaveBalance: number;
  hasBankAccount: boolean;
  isPayrollReady: boolean;
  blockingIssues: Array<{ code: string; label: string; severity: "error" | "warning" }>;
};

// ─── Permission Keys ──────────────────────────────────────────────────────────

export const HR_FINANCIAL_PERMISSION_KEYS = {
  advancesManage: "hr.advances.manage",
  advancesView: "hr.advances.view",
  bankAccountsManage: "hr.bank_accounts.manage",
  bankAccountsView: "hr.bank_accounts.view",
  bonusesManage: "hr.bonuses.manage",
  bonusesView: "hr.bonuses.view",
  incentivesManage: "hr.incentives.manage",
  incentivesView: "hr.incentives.view",
  loansManage: "hr.loans.manage",
  loansView: "hr.loans.view",
  penaltiesManage: "hr.penalties.manage",
  penaltiesView: "hr.penalties.view",
  salaryCertificatePrint: "hr.salary_certificate.print",
  settlementView: "hr.settlement.view",
} as const;

export type HrFinancialPermissionKey = (typeof HR_FINANCIAL_PERMISSION_KEYS)[keyof typeof HR_FINANCIAL_PERMISSION_KEYS];

// ─── Financial Services Gate Contract ────────────────────────────────────────

export const HR_FINANCIAL_SERVICES_V1 = {
  advanceStatuses: HR_ADVANCE_STATUSES,
  advanceTypes: HR_ADVANCE_TYPES,
  bankAccountTypes: HR_BANK_ACCOUNT_TYPES,
  bonusTypes: HR_BONUS_TYPES,
  docStatuses: HR_FINANCIAL_DOC_STATUSES,
  incentiveTypes: HR_INCENTIVE_TYPES,
  loanStatuses: HR_LOAN_STATUSES,
  loanTypes: HR_LOAN_TYPES,
  penaltySeverities: HR_PENALTY_SEVERITIES,
  penaltyTypes: HR_PENALTY_TYPES,
  permissions: HR_FINANCIAL_PERMISSION_KEYS,
  salaryCertificatePurposes: HR_SALARY_CERTIFICATE_PURPOSES,
  version: "1.0.0" as const,
} as const;

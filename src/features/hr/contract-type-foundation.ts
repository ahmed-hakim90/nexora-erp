import { defineAuditAction } from "@/platform/audit/public-api";

export const HR_CONTRACT_TYPE_STATUSES = ["active", "archived"] as const;
export type HrContractTypeStatus = (typeof HR_CONTRACT_TYPE_STATUSES)[number];

export const HR_CONTRACT_TYPE_VERSION_STATUSES = ["draft", "active", "archived"] as const;
export type HrContractTypeVersionStatus = (typeof HR_CONTRACT_TYPE_VERSION_STATUSES)[number];

export const HR_CONTRACT_LEGAL_TERMS_SCHEMA = "hr.contract.legal_terms.v1" as const;

export const HR_CONTRACT_PLACEHOLDERS = [
  "employee_name",
  "employee_number",
  "job_title",
  "department",
  "company",
  "start_date",
  "end_date",
  "salary",
] as const;

export type HrContractPlaceholderKey = (typeof HR_CONTRACT_PLACEHOLDERS)[number];

export const HR_CONTRACT_PLACEHOLDER_LABELS: Readonly<Record<HrContractPlaceholderKey, string>> = {
  company: "Company",
  department: "Department",
  employee_name: "Employee Name",
  employee_number: "Employee Number",
  end_date: "End Date",
  job_title: "Job Title",
  salary: "Salary",
  start_date: "Start Date",
};

export const HR_CONTRACT_TYPE_AUDIT_ACTIONS = {
  contractLegalTermsSnapshotted: defineAuditAction("hr.contract.legal_terms_snapshotted"),
  contractTypeCreated: defineAuditAction("hr.contract_type.created"),
  contractTypeVersionActivated: defineAuditAction("hr.contract_type_version.activated"),
  contractTypeVersionArchived: defineAuditAction("hr.contract_type_version.archived"),
  contractTypeVersionCreated: defineAuditAction("hr.contract_type_version.created"),
  contractTypeVersionUpdated: defineAuditAction("hr.contract_type_version.updated"),
} as const;

export type HrContractLegalTermsArticleSnapshot = Readonly<{
  body_ar: string;
  body_en: string;
  code: string | null;
  sequence: number;
  title_ar: string | null;
  title_en: string;
  version: number;
}>;

export type HrContractLegalTermsSnapshot = Readonly<{
  articles: readonly HrContractLegalTermsArticleSnapshot[];
  contract_type_code: string;
  contract_type_id: string;
  contract_type_version_id: string;
  placeholders_resolved: false;
  schema: typeof HR_CONTRACT_LEGAL_TERMS_SCHEMA;
  snapshotted_at: string;
  version_no: number;
}>;

export type HrContractPlaceholderContext = Readonly<{
  company?: string | null;
  department?: string | null;
  employeeName?: string | null;
  employeeNumber?: string | null;
  endDate?: string | null;
  jobTitle?: string | null;
  salary?: string | null;
  startDate?: string | null;
}>;

export function placeholderToken(key: HrContractPlaceholderKey): string {
  return `{{${key}}}`;
}

export function resolveContractPlaceholders(text: string, context: HrContractPlaceholderContext): string {
  const values: Record<HrContractPlaceholderKey, string | null | undefined> = {
    company: context.company,
    department: context.department,
    employee_name: context.employeeName,
    employee_number: context.employeeNumber,
    end_date: context.endDate,
    job_title: context.jobTitle,
    salary: context.salary,
    start_date: context.startDate,
  };

  return text.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => {
    if (!(HR_CONTRACT_PLACEHOLDERS as readonly string[]).includes(key)) return match;
    const value = values[key as HrContractPlaceholderKey];
    if (value === null || value === undefined || value.trim() === "") return "—";
    return value;
  });
}

export function buildContractLegalTermsSnapshot(input: Readonly<{
  articles: readonly Readonly<{
    body_ar: string;
    body_en: string;
    code: string | null;
    sequence: number;
    title_ar: string | null;
    title_en: string;
  }>[];
  contractTypeCode: string;
  contractTypeId: string;
  contractTypeVersionId: string;
  versionNo: number;
}>): HrContractLegalTermsSnapshot {
  return {
    articles: input.articles.map((article) => ({
      body_ar: article.body_ar,
      body_en: article.body_en,
      code: article.code,
      sequence: article.sequence,
      title_ar: article.title_ar,
      title_en: article.title_en,
      version: input.versionNo,
    })),
    contract_type_code: input.contractTypeCode,
    contract_type_id: input.contractTypeId,
    contract_type_version_id: input.contractTypeVersionId,
    placeholders_resolved: false,
    schema: HR_CONTRACT_LEGAL_TERMS_SCHEMA,
    snapshotted_at: new Date().toISOString(),
    version_no: input.versionNo,
  };
}

export function parseContractLegalTermsSnapshot(value: unknown): HrContractLegalTermsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.schema !== HR_CONTRACT_LEGAL_TERMS_SCHEMA) return null;
  if (!Array.isArray(record.articles)) return null;
  return value as HrContractLegalTermsSnapshot;
}

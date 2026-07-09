import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import {
  createPrintTemplateRegistry,
  definePrintTemplate,
  registerPrintTemplate,
  type PrintRegistry,
  type PrintTemplate,
} from "@/platform/printing/public-api";

import {
  HR_PRINT_TEMPLATE_DEFINITIONS,
  HR_PRINT_TEMPLATE_KEYS,
  type HrPrintTemplateKey,
} from "../../hr-production-readiness-foundation";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import type { HrEmployeeAssignmentSnapshot } from "../types/hr-ui.types";
import { formatHrDisplayLabel, formatHrStatusLabel, readContactField } from "../utils/hr-display";
import { renderContractArticlesHtml } from "../utils/hr-contract-legal-terms.render";
import { parseContractLegalTermsSnapshot, type HrContractPlaceholderContext } from "../../contract-type-foundation";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";
import { HrEmployeeCompensationService } from "./hr-employee-compensation.service";

const HR_RUNTIME_PRINT_TEMPLATE_KEYS = [
  HR_PRINT_TEMPLATE_KEYS.employeeProfile,
  HR_PRINT_TEMPLATE_KEYS.contract,
  HR_PRINT_TEMPLATE_KEYS.salaryLetter,
  HR_PRINT_TEMPLATE_KEYS.employeeCertificate,
] as const satisfies readonly HrPrintTemplateKey[];

type HrRuntimePrintTemplateKey = (typeof HR_RUNTIME_PRINT_TEMPLATE_KEYS)[number];

type HrPrintEmployeeRecord = Readonly<{
  id: string;
  employeeNumber: string;
  fullName: string;
  status: string;
  nationalId: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  email: string | null;
  phone: string | null;
}>;

type HrPrintContractRecord = Readonly<{
  contractNumber: string;
  contractType: string;
  endsOn: string | null;
  legalTerms: ReturnType<typeof parseContractLegalTermsSnapshot>;
  probationPeriodDays: number | null;
  signedDate: string | null;
  startsOn: string;
  status: string;
}>;

type HrPrintSalaryLine = Readonly<{
  label: string;
  amount: string;
}>;

type HrPrintRenderContext = Readonly<{
  companyName: string;
  employee: HrPrintEmployeeRecord;
  assignment: HrEmployeeAssignmentSnapshot;
  contracts: readonly HrPrintContractRecord[];
  salaryLines: readonly HrPrintSalaryLine[];
  generatedOn: string;
}>;

function isRuntimePrintTemplateKey(templateKey: string): templateKey is HrRuntimePrintTemplateKey {
  return (HR_RUNTIME_PRINT_TEMPLATE_KEYS as readonly string[]).includes(templateKey);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function createRuntimePrintTemplate(
  definition: (typeof HR_PRINT_TEMPLATE_DEFINITIONS)[number],
): PrintTemplate {
  const requiredPermission =
    definition.sensitiveData === "payroll" ? HR_PERMISSIONS.compensationView : HR_PERMISSIONS.employeesView;

  return definePrintTemplate({
    appKey: "hr",
    defaultLocale: "en",
    key: definition.key,
    metadata: {
      brandAware: true,
      companyScoped: true,
      localeAware: true,
      paperSize: definition.paperSize,
      sensitiveData: definition.sensitiveData,
      tenantScoped: true,
    },
    name: definition.label,
    providerSource: "business-app",
    requiredPermission,
    security: {
      auditRequired: true,
      branchAware: true,
      companyAware: true,
      requiredPermissions: [requiredPermission],
      sensitiveData: definition.sensitiveData !== "internal",
      sensitivity: definition.sensitiveData === "payroll" ? "sensitive" : "restricted",
      tenantAware: true,
    },
    supportedFormats: ["preview", "html"],
    supportedLocales: ["en", "ar"],
    type: definition.key === HR_PRINT_TEMPLATE_KEYS.contract ? "contract" : "hr-letter",
  });
}

export function createHrPrintRuntimeRegistry(): PrintRegistry {
  let registry = createPrintTemplateRegistry();

  for (const definition of HR_PRINT_TEMPLATE_DEFINITIONS) {
    if (!isRuntimePrintTemplateKey(definition.key)) {
      continue;
    }

    registry = registerPrintTemplate(registry, createRuntimePrintTemplate(definition));
  }

  return registry;
}

export const HR_PRINT_RUNTIME_REGISTRY = createHrPrintRuntimeRegistry();

function wrapPrintDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: "Segoe UI", system-ui, sans-serif; color: #111827; margin: 0; background: #f8fafc; }
      .page { max-width: 800px; margin: 24px auto; background: #fff; border: 1px solid #e5e7eb; padding: 40px; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      h2 { margin: 28px 0 12px; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
      p { margin: 0 0 12px; line-height: 1.6; }
      .muted { color: #6b7280; font-size: 13px; }
      .grid { display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; font-size: 14px; }
      .label { color: #6b7280; }
      .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      .signature-line { border-top: 1px solid #111827; padding-top: 8px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
      th { background: #f9fafb; }
    </style>
  </head>
  <body>
    <main class="page">${body}</main>
  </body>
</html>`;
}

function renderInfoGrid(rows: readonly { label: string; value: string | null | undefined }[]): string {
  return `<div class="grid">${rows
    .map(
      (row) =>
        `<div class="label">${escapeHtml(row.label)}</div><div>${escapeHtml(row.value || "—")}</div>`,
    )
    .join("")}</div>`;
}

function renderEmployeeProfile(context: HrPrintRenderContext): string {
  const body = `
    <h1>Employee Profile</h1>
    <p class="muted">${escapeHtml(context.companyName)} · Generated ${escapeHtml(context.generatedOn)}</p>
    <h2>Identity</h2>
    ${renderInfoGrid([
      { label: "Employee number", value: context.employee.employeeNumber },
      { label: "Full name", value: context.employee.fullName },
      { label: "Status", value: context.employee.status },
      { label: "National ID", value: context.employee.nationalId },
      { label: "Birth date", value: context.employee.birthDate },
      { label: "Gender", value: context.employee.gender },
      { label: "Nationality", value: context.employee.nationality },
      { label: "Marital status", value: context.employee.maritalStatus },
      { label: "Email", value: context.employee.email },
      { label: "Phone", value: context.employee.phone },
    ])}
    <h2>Organization Context</h2>
    ${renderInfoGrid([
      { label: "Position", value: context.assignment.position?.label },
      { label: "Department", value: context.assignment.department?.label },
      { label: "Manager", value: context.assignment.manager?.label },
      { label: "Work location", value: context.assignment.workLocation?.label },
      { label: "Payroll group", value: context.assignment.payrollGroupLabel },
      { label: "As of date", value: context.assignment.asOfDate },
    ])}
    <h2>Contracts</h2>
    ${
      context.contracts.length === 0
        ? "<p>No contracts on file.</p>"
        : `<table><thead><tr><th>Number</th><th>Type</th><th>Status</th><th>Start</th><th>End</th></tr></thead><tbody>${context.contracts
            .map(
              (contract) =>
                `<tr><td>${escapeHtml(contract.contractNumber)}</td><td>${escapeHtml(contract.contractType)}</td><td>${escapeHtml(contract.status)}</td><td>${escapeHtml(contract.startsOn)}</td><td>${escapeHtml(contract.endsOn || "—")}</td></tr>`,
            )
            .join("")}</tbody></table>`
    }`;

  return wrapPrintDocument("Employee Profile", body);
}

function renderContractDocument(context: HrPrintRenderContext): string {
  const contract = context.contracts[0];
  const placeholderContext: HrContractPlaceholderContext = {
    company: context.companyName,
    department: context.assignment.department?.label ?? null,
    employeeName: context.employee.fullName,
    employeeNumber: context.employee.employeeNumber,
    endDate: contract?.endsOn ?? null,
    jobTitle: context.assignment.position?.label ?? null,
    salary: context.salaryLines[0]?.amount ?? null,
    startDate: contract?.startsOn ?? null,
  };

  const header = `
    <h1>Employment Contract</h1>
    <p class="muted">${escapeHtml(context.companyName)} · Generated ${escapeHtml(context.generatedOn)}</p>
    <p>This employment contract is issued for <strong>${escapeHtml(context.employee.fullName)}</strong> (${escapeHtml(context.employee.employeeNumber)}).</p>
  ${
    contract
      ? renderInfoGrid([
          { label: "Contract number", value: contract.contractNumber },
          { label: "Contract type", value: contract.contractType },
          { label: "Status", value: contract.status },
          { label: "Start date", value: contract.startsOn },
          { label: "End date", value: contract.endsOn },
          { label: "Probation (days)", value: contract.probationPeriodDays?.toString() ?? null },
          { label: "Signed date", value: contract.signedDate },
          { label: "Position", value: context.assignment.position?.label },
          { label: "Department", value: context.assignment.department?.label },
        ])
      : "<p>No active contract record is available for this employee.</p>"
  }`;

  const articles =
    contract?.legalTerms && contract.legalTerms.articles.length > 0
      ? renderContractArticlesHtml({
          articles: contract.legalTerms.articles,
          companyName: context.companyName,
          contractTypeCode: contract.legalTerms.contract_type_code,
          contractTypeName: contract.contractType,
          generatedOn: context.generatedOn,
          placeholderContext,
          resolvePlaceholders: true,
        })
      : "<p>The parties agree to the employment terms recorded in the HR contract register. This printout is generated from the current HR system of record.</p>";

  const body = `
    ${header}
    <h2>Contract Terms</h2>
    ${articles}
    <div class="signature">
      <div class="signature-line">Employer representative</div>
      <div class="signature-line">Employee signature</div>
    </div>`;

  return wrapPrintDocument("Employment Contract", body);
}

function renderSalaryLetter(context: HrPrintRenderContext): string {
  const body = `
    <h1>Salary Confirmation Letter</h1>
    <p class="muted">${escapeHtml(context.companyName)} · Generated ${escapeHtml(context.generatedOn)}</p>
    <p>To whom it may concern,</p>
    <p>This letter confirms that <strong>${escapeHtml(context.employee.fullName)}</strong> (${escapeHtml(context.employee.employeeNumber)}) is employed with ${escapeHtml(context.companyName)} in the capacity of ${escapeHtml(context.assignment.position?.label ?? "the assigned position")}.</p>
    <h2>Compensation Summary</h2>
    ${
      context.salaryLines.length === 0
        ? "<p>No active salary package lines are available for this employee.</p>"
        : `<table><thead><tr><th>Component</th><th>Amount</th></tr></thead><tbody>${context.salaryLines
            .map((line) => `<tr><td>${escapeHtml(line.label)}</td><td>${escapeHtml(line.amount)}</td></tr>`)
            .join("")}</tbody></table>`
    }
    <p>This document is generated for official use and reflects compensation records available in the HR system at the time of printing.</p>
    <div class="signature">
      <div class="signature-line">Authorized HR signatory</div>
      <div class="signature-line">Company stamp</div>
    </div>`;

  return wrapPrintDocument("Salary Confirmation Letter", body);
}

function renderEmploymentCertificate(context: HrPrintRenderContext): string {
  const activeContract = context.contracts.find((contract) => contract.status.toLowerCase().includes("active")) ?? context.contracts[0];
  const body = `
    <h1>Employment Certificate</h1>
    <p class="muted">${escapeHtml(context.companyName)} · Generated ${escapeHtml(context.generatedOn)}</p>
    <p>This is to certify that <strong>${escapeHtml(context.employee.fullName)}</strong> (${escapeHtml(context.employee.employeeNumber)}) is employed with ${escapeHtml(context.companyName)}.</p>
    ${renderInfoGrid([
      { label: "Position", value: context.assignment.position?.label },
      { label: "Department", value: context.assignment.department?.label },
      { label: "Employment status", value: context.employee.status },
      { label: "Contract start", value: activeContract?.startsOn },
      { label: "Contract end", value: activeContract?.endsOn },
    ])}
    <p>This certificate is issued upon request and does not confer any rights beyond the employment records maintained in the HR system.</p>
    <div class="signature">
      <div class="signature-line">Authorized HR signatory</div>
      <div class="signature-line">Date</div>
    </div>`;

  return wrapPrintDocument("Employment Certificate", body);
}

export class HrPrintRuntimeService {
  private readonly assignmentResolver: HrAssignmentResolverService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.assignmentResolver = new HrAssignmentResolverService(supabase, context);
  }

  async renderHrPrintDocument(templateKey: string, employeeId: string): Promise<string> {
    if (!isRuntimePrintTemplateKey(templateKey)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: `Unsupported HR print template: ${templateKey}`,
      });
    }

    const renderContext = await this.loadRenderContext(employeeId);

    switch (templateKey) {
      case HR_PRINT_TEMPLATE_KEYS.employeeProfile:
        return renderEmployeeProfile(renderContext);
      case HR_PRINT_TEMPLATE_KEYS.contract:
        return renderContractDocument(renderContext);
      case HR_PRINT_TEMPLATE_KEYS.salaryLetter:
        return renderSalaryLetter(renderContext);
      case HR_PRINT_TEMPLATE_KEYS.employeeCertificate:
        return renderEmploymentCertificate(renderContext);
      default:
        throw new ApplicationError({
          code: "VALIDATION_ERROR",
          message: `Unsupported HR print template: ${templateKey}`,
        });
    }
  }

  private async loadRenderContext(employeeId: string): Promise<HrPrintRenderContext> {
    const [employeeResult, companyResult, contractsResult] = await Promise.all([
      this.supabase
        .from("hr_employees")
        .select("id, employee_number, full_name, status, national_id, birth_date, gender, nationality, marital_status, contact_info")
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
      this.supabase
        .from("hr_contracts")
        .select("contract_number, contract_type, status, starts_on, ends_on, probation_period_days, signed_date, legal_terms")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("starts_on", { ascending: false }),
    ]);

    if (employeeResult.error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not load employee for print rendering.",
        cause: employeeResult.error,
      });
    }

    if (!employeeResult.data) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Employee not found." });
    }

    if (companyResult.error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not load company branding for print rendering.",
        cause: companyResult.error,
      });
    }

    if (contractsResult.error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not load employee contracts for print rendering.",
        cause: contractsResult.error,
      });
    }

    const assignment = await this.assignmentResolver.resolveEmployeeAssignments(employeeId);
    const compensationService = new HrEmployeeCompensationService(this.supabase, this.context);
    const compensation = await compensationService.resolveEmployeeCompensation({ employeeId });
    const salaryLines: readonly HrPrintSalaryLine[] = compensation.lines.map((line) => ({
      amount: Number(line.amount).toFixed(2),
      label: line.name,
    }));

    return {
      assignment,
      companyName: formatHrDisplayLabel(companyResult.data?.legal_name ?? companyResult.data?.name, "Company"),
      contracts: (contractsResult.data ?? []).map((row) => ({
        contractNumber: formatHrDisplayLabel(row.contract_number, "Contract"),
        contractType: formatHrDisplayLabel(row.contract_type, "Contract"),
        endsOn: row.ends_on ? String(row.ends_on) : null,
        legalTerms: parseContractLegalTermsSnapshot(row.legal_terms),
        probationPeriodDays: row.probation_period_days === null ? null : Number(row.probation_period_days),
        signedDate: row.signed_date ? String(row.signed_date) : null,
        startsOn: String(row.starts_on),
        status: formatHrStatusLabel(String(row.status)),
      })),
      employee: {
        birthDate: employeeResult.data.birth_date ? String(employeeResult.data.birth_date) : null,
        email: readContactField(employeeResult.data.contact_info, "email"),
        employeeNumber: formatHrDisplayLabel(employeeResult.data.employee_number, "Employee"),
        fullName: formatHrDisplayLabel(employeeResult.data.full_name, "Employee"),
        gender: employeeResult.data.gender ? String(employeeResult.data.gender) : null,
        id: String(employeeResult.data.id),
        maritalStatus: employeeResult.data.marital_status ? String(employeeResult.data.marital_status) : null,
        nationalId: employeeResult.data.national_id ? String(employeeResult.data.national_id) : null,
        nationality: employeeResult.data.nationality ? String(employeeResult.data.nationality) : null,
        phone: readContactField(employeeResult.data.contact_info, "phone"),
        status: formatHrStatusLabel(String(employeeResult.data.status)),
      },
      generatedOn: new Date().toISOString().slice(0, 10),
      salaryLines,
    };
  }

  private async loadSalaryLines(salaryPackageVersionId: string | null): Promise<readonly HrPrintSalaryLine[]> {
    if (!salaryPackageVersionId) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("hr_salary_package_lines")
      .select("amount_override, display_order, component_version_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("salary_package_version_id", salaryPackageVersionId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: "Could not load salary package lines for print rendering.",
        cause: error,
      });
    }

    const componentVersionIds = [...new Set((data ?? []).map((row) => String(row.component_version_id)))];
    const componentLabels = new Map<string, { label: string; currency: string }>();

    if (componentVersionIds.length > 0) {
      const { data: versions, error: versionError } = await this.supabase
        .from("hr_compensation_component_versions")
        .select("id, currency, component_id")
        .eq("tenant_id", this.context.tenantId)
        .in("id", componentVersionIds);

      if (versionError) {
        throw new ApplicationError({
          code: "OPERATIONAL_ERROR",
          message: "Could not load compensation component versions for print rendering.",
          cause: versionError,
        });
      }

      const componentIds = [...new Set((versions ?? []).map((row) => String(row.component_id)))];
      const componentNames = new Map<string, string>();

      if (componentIds.length > 0) {
        const { data: components, error: componentError } = await this.supabase
          .from("hr_compensation_components")
          .select("id, name")
          .eq("tenant_id", this.context.tenantId)
          .in("id", componentIds);

        if (componentError) {
          throw new ApplicationError({
            code: "OPERATIONAL_ERROR",
            message: "Could not load compensation components for print rendering.",
            cause: componentError,
          });
        }

        for (const component of components ?? []) {
          componentNames.set(String(component.id), formatHrDisplayLabel(component.name, "Salary component"));
        }
      }

      for (const version of versions ?? []) {
        componentLabels.set(String(version.id), {
          currency: String(version.currency ?? ""),
          label: componentNames.get(String(version.component_id)) ?? "Salary component",
        });
      }
    }

    return (data ?? []).map((row) => {
      const version = componentLabels.get(String(row.component_version_id));
      const amount = row.amount_override ?? 0;
      return {
        amount: `${amount} ${version?.currency ?? ""}`.trim(),
        label: version?.label ?? "Salary component",
      };
    });
  }
}

export async function renderHrPrintDocument(
  templateKey: string,
  employeeId: string,
  context: BranchRequestContext,
): Promise<string> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrPrintRuntimeService(supabase, context);
  return service.renderHrPrintDocument(templateKey, employeeId);
}

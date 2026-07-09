import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";

import { HR_COMPENSATION_AUDIT_ACTIONS } from "../../compensation-foundation";
import {
  HR_BASIC_SALARY_CONFLICT_MESSAGE,
  type HrEmployeeCompensationResolution,
  type HrResolvedCompensationPackageLine,
  resolveEmployeeCompensation,
} from "./hr-employee-compensation-resolve";

export type HrActiveEmploymentProfile = Readonly<{
  effectiveFrom: string;
  employeeId: string;
  id: string;
  salaryPackageRef: string | null;
}>;

export type HrBasicSalaryOverrideRecord = Readonly<{
  amount: number;
  componentVersionId: string;
  effectiveFrom: string;
  id: string;
}>;

type ComponentVersionJoin = Readonly<{
  earning_or_deduction: "earning" | "deduction";
  hr_compensation_components: {
    code: string;
    hr_compensation_categories: { category_key: string } | { category_key: string }[];
    name: string;
  };
  id: string;
  included_in_gross_salary: boolean;
  insurable: boolean;
  taxable: boolean;
}>;

type DbPackageLineRow = Readonly<{
  amount_override: number | null;
  hr_compensation_component_versions: ComponentVersionJoin | ComponentVersionJoin[];
}>;

function readCategoryKey(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "allowance";
  const row = value as { category_key?: string };
  return String(row.category_key ?? "allowance");
}

function readJoinedComponentVersion(versionInput: ComponentVersionJoin | ComponentVersionJoin[] | undefined): {
  categoryKey: string;
  code: string;
  componentVersionId: string;
  earningOrDeduction: "earning" | "deduction";
  includedInGrossSalary: boolean;
  insurable: boolean;
  name: string;
  taxable: boolean;
} {
  const version = Array.isArray(versionInput) ? versionInput[0] : versionInput;
  if (!version) {
    return {
      categoryKey: "allowance",
      code: "COMPONENT",
      componentVersionId: "",
      earningOrDeduction: "earning",
      includedInGrossSalary: true,
      insurable: false,
      name: "Component",
      taxable: true,
    };
  }
  const component = version.hr_compensation_components;
  const category = component.hr_compensation_categories;
  const categoryKey = Array.isArray(category) ? readCategoryKey(category[0]) : readCategoryKey(category);
  return {
    categoryKey,
    code: String(component.code),
    componentVersionId: String(version.id),
    earningOrDeduction: version.earning_or_deduction,
    includedInGrossSalary: Boolean(version.included_in_gross_salary),
    insurable: Boolean(version.insurable),
    name: String(component.name),
    taxable: Boolean(version.taxable),
  };
}

function mapPackageLineRow(row: DbPackageLineRow): HrResolvedCompensationPackageLine {
  const version = readJoinedComponentVersion(row.hr_compensation_component_versions);
  return {
    amount: Number(row.amount_override ?? 0),
    categoryKey: version.categoryKey,
    code: version.code,
    componentVersionId: version.componentVersionId,
    earningOrDeduction: version.earningOrDeduction,
    includedInGrossSalary: version.includedInGrossSalary,
    insurable: version.insurable,
    name: version.name,
    source: "package",
    taxable: version.taxable,
  };
}

export class HrEmployeeCompensationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadActiveEmploymentProfile(employeeId: string): Promise<HrActiveEmploymentProfile | null> {
    const { data, error } = await this.supabase
      .from("hr_employment_profiles")
      .select("id, employee_id, salary_package_ref, effective_from")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employment profile.", cause: error });
    }
    if (!data) return null;

    return {
      effectiveFrom: String(data.effective_from),
      employeeId: String(data.employee_id),
      id: String(data.id),
      salaryPackageRef: data.salary_package_ref ? String(data.salary_package_ref) : null,
    };
  }

  async resolveBasicSalaryComponentVersion(): Promise<{
    code: string;
    componentVersionId: string;
    earningOrDeduction: "earning" | "deduction";
    includedInGrossSalary: boolean;
    insurable: boolean;
    name: string;
    taxable: boolean;
  }> {
    const { data, error } = await this.supabase
      .from("hr_compensation_component_versions")
      .select(
        "id, earning_or_deduction, taxable, insurable, included_in_gross_salary, hr_compensation_components!inner(code, name, hr_compensation_categories!inner(category_key))",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("version_no", { ascending: false })
      .limit(50);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load basic salary component.", cause: error });
    }

    const preferred = (data ?? []).find((row) => {
      const version = readJoinedComponentVersion(row as ComponentVersionJoin);
      return version.categoryKey === "basic_salary";
    });

    if (!preferred) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "No active basic salary compensation component found. Create a BASIC_SALARY component first.",
      });
    }

    return readJoinedComponentVersion(preferred as ComponentVersionJoin);
  }

  async loadPackageLines(salaryPackageRef: string | null): Promise<readonly HrResolvedCompensationPackageLine[]> {
    if (!salaryPackageRef) return [];

    const { data, error } = await this.supabase
      .from("hr_salary_package_lines")
      .select(
        "amount_override, hr_compensation_component_versions!inner(id, earning_or_deduction, taxable, insurable, included_in_gross_salary, hr_compensation_components!inner(code, name, hr_compensation_categories!inner(category_key)))",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("salary_package_version_id", salaryPackageRef)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load salary package lines.", cause: error });
    }

    return (data ?? []).map((row) => mapPackageLineRow(row as DbPackageLineRow));
  }

  async packageVersionHasBasicSalaryLine(salaryPackageVersionId: string): Promise<boolean> {
    const lines = await this.loadPackageLines(salaryPackageVersionId);
    return lines.some((line) => line.categoryKey === "basic_salary" && line.earningOrDeduction === "earning" && line.amount > 0);
  }

  async loadBasicSalaryOverride(
    employmentProfileId: string,
    asOfDate: string = new Date().toISOString().slice(0, 10),
  ): Promise<HrBasicSalaryOverrideRecord | null> {
    const basicComponent = await this.resolveBasicSalaryComponentVersion();

    const { data, error } = await this.supabase
      .from("hr_employee_compensation_overrides")
      .select("id, amount, effective_from")
      .eq("tenant_id", this.context.tenantId)
      .eq("employment_profile_id", employmentProfileId)
      .eq("component_version_id", basicComponent.componentVersionId)
      .eq("override_type", "amount")
      .eq("status", "active")
      .is("deleted_at", null)
      .lte("effective_from", asOfDate)
      .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load basic salary override.", cause: error });
    }
    if (!data || data.amount === null) return null;

    return {
      amount: Number(data.amount),
      componentVersionId: basicComponent.componentVersionId,
      effectiveFrom: String(data.effective_from),
      id: String(data.id),
    };
  }

  async resolveEmployeeCompensation(input: {
    asOfDate?: string;
    employeeId: string;
    employmentProfileId?: string;
    salaryPackageRef?: string | null;
  }): Promise<HrEmployeeCompensationResolution & { employmentProfileId: string | null; salaryPackageLabel: string | null }> {
    const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
    const profile = input.employmentProfileId
      ? {
          effectiveFrom: asOfDate,
          employeeId: input.employeeId,
          id: input.employmentProfileId,
          salaryPackageRef: input.salaryPackageRef ?? null,
        }
      : await this.loadActiveEmploymentProfile(input.employeeId);

    if (!profile) {
      return {
        allowanceTotal: 0,
        basicSalaryAmount: null,
        basicSalaryFromPackage: null,
        basicSalaryOverride: null,
        basicSalarySource: null,
        conflict: false,
        conflictMessage: null,
        employmentProfileId: null,
        hourlyRate: null,
        lines: [],
        missingCompensation: true,
        packageAllowanceTotal: 0,
        resolvedMonthlyTotal: 0,
        salaryPackageLabel: null,
      };
    }

    const [packageLines, overrideRecord, salaryPackageLabel, basicComponent] = await Promise.all([
      this.loadPackageLines(profile.salaryPackageRef),
      this.loadBasicSalaryOverride(profile.id, asOfDate),
      this.loadSalaryPackageLabel(profile.salaryPackageRef),
      this.resolveBasicSalaryComponentVersion(),
    ]);

    const resolved = resolveEmployeeCompensation({
      basicOverride: overrideRecord
        ? {
            amount: overrideRecord.amount,
            componentCode: basicComponent.code,
            componentName: basicComponent.name,
            componentVersionId: overrideRecord.componentVersionId,
            earningOrDeduction: basicComponent.earningOrDeduction,
            includedInGrossSalary: basicComponent.includedInGrossSalary,
            insurable: basicComponent.insurable,
            taxable: basicComponent.taxable,
          }
        : null,
      packageLines,
    });

    return {
      ...resolved,
      employmentProfileId: profile.id,
      salaryPackageLabel,
    };
  }

  private async loadSalaryPackageLabel(salaryPackageVersionId: string | null): Promise<string | null> {
    if (!salaryPackageVersionId) return null;

    const { data } = await this.supabase
      .from("hr_salary_package_versions")
      .select("version_no, effective_from, hr_salary_packages!inner(name, code)")
      .eq("id", salaryPackageVersionId)
      .eq("tenant_id", this.context.tenantId)
      .maybeSingle();

    if (!data) return null;
    const pkg = data.hr_salary_packages as { code?: string; name?: string } | { code?: string; name?: string }[];
    const packageRow = Array.isArray(pkg) ? pkg[0] : pkg;
    return `${packageRow?.name ?? packageRow?.code ?? "Package"} v${data.version_no} (${data.effective_from})`;
  }

  async assertNoBasicSalaryConflictForProfile(employmentProfileId: string, salaryPackageRef: string | null): Promise<void> {
    const override = await this.loadBasicSalaryOverride(employmentProfileId);
    if (!override || override.amount <= 0) return;
    if (!salaryPackageRef) return;

    const hasPackageBasic = await this.packageVersionHasBasicSalaryLine(salaryPackageRef);
    if (hasPackageBasic) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: HR_BASIC_SALARY_CONFLICT_MESSAGE,
      });
    }
  }

  async assertNoBasicSalaryConflictForPackageAssignment(employeeId: string, salaryPackageVersionId: string): Promise<void> {
    const profile = await this.loadActiveEmploymentProfile(employeeId);
    if (!profile) return;

    const override = await this.loadBasicSalaryOverride(profile.id);
    if (!override || override.amount <= 0) return;

    const hasPackageBasic = await this.packageVersionHasBasicSalaryLine(salaryPackageVersionId);
    if (hasPackageBasic) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: HR_BASIC_SALARY_CONFLICT_MESSAGE,
      });
    }
  }

  async assertNoBasicSalaryConflictForPackageLine(
    salaryPackageVersionId: string,
    componentVersionId: string,
  ): Promise<void> {
    const { data } = await this.supabase
      .from("hr_compensation_component_versions")
      .select("id, hr_compensation_components!inner(hr_compensation_categories!inner(category_key))")
      .eq("id", componentVersionId)
      .maybeSingle();

    const version = data as {
      hr_compensation_components?: { hr_compensation_categories?: { category_key?: string } | { category_key?: string }[] };
    } | null;
    const categories = version?.hr_compensation_components?.hr_compensation_categories;
    const categoryKey = Array.isArray(categories) ? readCategoryKey(categories[0]) : readCategoryKey(categories);
    if (categoryKey !== "basic_salary") return;

    const { data: profiles } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("salary_package_ref", salaryPackageVersionId)
      .eq("status", "active")
      .is("deleted_at", null);

    for (const profile of profiles ?? []) {
      const override = await this.loadBasicSalaryOverride(String(profile.id));
      if (override && override.amount > 0) {
        throw new ApplicationError({
          code: "VALIDATION_ERROR",
          message: HR_BASIC_SALARY_CONFLICT_MESSAGE,
        });
      }
    }
  }

  async upsertBasicSalaryOverride(input: {
    basicSalary: number;
    effectiveFrom?: string;
    employeeId: string;
    reason?: string | null;
  }): Promise<void> {
    const profile = await this.loadActiveEmploymentProfile(input.employeeId);
    if (!profile) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee must have an active employment profile." });
    }

    await this.assertNoBasicSalaryConflictForProfile(profile.id, profile.salaryPackageRef);

    const basicComponent = await this.resolveBasicSalaryComponentVersion();
    const effectiveFrom = input.effectiveFrom ?? profile.effectiveFrom ?? new Date().toISOString().slice(0, 10);
    const existing = await this.loadBasicSalaryOverride(profile.id, effectiveFrom);

    if (existing) {
      const { error } = await this.supabase
        .from("hr_employee_compensation_overrides")
        .update({
          amount: input.basicSalary,
          reason: input.reason ?? null,
          updated_by: this.context.userId,
        })
        .eq("id", existing.id)
        .eq("tenant_id", this.context.tenantId);

      if (error) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update basic salary override.", cause: error });
      }

      await recordAuditEvent({
        action: HR_COMPENSATION_AUDIT_ACTIONS.overrideCreated,
        category: "data-access",
        context: this.context,
        entityId: existing.id,
        entityType: "hr_employee_compensation_overrides",
        metadata: { amount: input.basicSalary, employeeId: input.employeeId, previousAmount: existing.amount },
        module: "hr",
      });
      return;
    }

    const { data, error } = await this.supabase
      .from("hr_employee_compensation_overrides")
      .insert({
        amount: input.basicSalary,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        component_version_id: basicComponent.componentVersionId,
        created_by: this.context.userId,
        effective_from: effectiveFrom,
        employment_profile_id: profile.id,
        metadata: {
          does_not_mutate_package_or_component: true,
          foundation_only: false,
          runtime_calculation_implemented: true,
        },
        override_type: "amount",
        reason: input.reason ?? null,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save basic salary override.", cause: error });
    }

    await recordAuditEvent({
      action: HR_COMPENSATION_AUDIT_ACTIONS.overrideCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_employee_compensation_overrides",
      metadata: { amount: input.basicSalary, employeeId: input.employeeId },
      module: "hr",
    });
  }

  async clearBasicSalaryOverride(employeeId: string): Promise<void> {
    const profile = await this.loadActiveEmploymentProfile(employeeId);
    if (!profile) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee must have an active employment profile." });
    }

    const existing = await this.loadBasicSalaryOverride(profile.id);
    if (!existing) return;

    const { error } = await this.supabase
      .from("hr_employee_compensation_overrides")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: this.context.userId,
        status: "archived",
        updated_by: this.context.userId,
      })
      .eq("id", existing.id)
      .eq("tenant_id", this.context.tenantId);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not clear basic salary override.", cause: error });
    }

    await recordAuditEvent({
      action: HR_COMPENSATION_AUDIT_ACTIONS.overrideExpired,
      category: "data-access",
      context: this.context,
      entityId: existing.id,
      entityType: "hr_employee_compensation_overrides",
      metadata: { amount: existing.amount, employeeId },
      module: "hr",
    });
  }
}

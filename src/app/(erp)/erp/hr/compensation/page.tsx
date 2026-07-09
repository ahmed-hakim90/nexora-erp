import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrDisplayLabel, formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrCompensationWorkspace } from "../_components/hr-compensation-workspace";
import { HrShell } from "../_components/hr-shell";

function readJoinedComponent(row: unknown): { code: string; name: string } {
  if (!row || typeof row !== "object") return { code: "COMPONENT", name: "Component" };
  const component = (row as { hr_compensation_components?: unknown }).hr_compensation_components;
  if (Array.isArray(component)) {
    const first = component[0];
    if (first && typeof first === "object") {
      return {
        code: String((first as { code?: string }).code ?? "COMPONENT"),
        name: String((first as { name?: string }).name ?? "Component"),
      };
    }
  }
  if (component && typeof component === "object") {
    return {
      code: String((component as { code?: string }).code ?? "COMPONENT"),
      name: String((component as { name?: string }).name ?? "Component"),
    };
  }
  return { code: "COMPONENT", name: "Component" };
}

function readJoinedComponentVersion(row: unknown): { component: { code: string; name: string }; versionNo: number } {
  if (!row || typeof row !== "object") {
    return { component: { code: "COMPONENT", name: "Component" }, versionNo: 1 };
  }
  const version = (row as { hr_compensation_component_versions?: unknown }).hr_compensation_component_versions;
  const versionRow = Array.isArray(version) ? version[0] : version;
  if (!versionRow || typeof versionRow !== "object") {
    return { component: { code: "COMPONENT", name: "Component" }, versionNo: 1 };
  }
  return {
    component: readJoinedComponent(versionRow),
    versionNo: Number((versionRow as { version_no?: number }).version_no ?? 1),
  };
}

export default async function HrCompensationPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const activeTab = params.tab ?? (params.create === "1" ? "components" : "packages");
  const selectedPackageVersionId = params.packageVersion ?? "";

  const [
    packagesResult,
    componentsResult,
    categoriesResult,
    packageVersionsResult,
    assignmentsResult,
    componentVersionsResult,
    packageLinesResult,
  ] = await Promise.all([
    supabase
      .from("hr_salary_packages")
      .select("id, code, name, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name")
      .limit(50),
    supabase
      .from("hr_compensation_components")
      .select("id, code, name, status, category_id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name")
      .limit(50),
    supabase.from("hr_compensation_categories").select("id, category_key, label").is("deleted_at", null),
    supabase
      .from("hr_salary_package_versions")
      .select("id, salary_package_id, version_no, effective_from, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(100),
    supabase
      .from("hr_employment_profiles")
      .select("id, employee_id, salary_package_ref, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .not("salary_package_ref", "is", null)
      .is("deleted_at", null)
      .limit(50),
    supabase
      .from("hr_compensation_component_versions")
      .select("id, version_no, effective_from, component_id, hr_compensation_components!inner(code, name)")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .limit(200),
    supabase
      .from("hr_salary_package_lines")
      .select(
        "id, amount_override, display_order, salary_package_version_id, status, hr_compensation_component_versions!inner(version_no, hr_compensation_components!inner(code, name))",
      )
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .limit(200),
  ]);

  const categoryLabels = new Map((categoriesResult.data ?? []).map((row) => [String(row.id), String(row.label)]));
  const packageNames = new Map((packagesResult.data ?? []).map((row) => [String(row.id), String(row.name)]));

  const latestVersionByPackage = new Map<string, string>();
  for (const row of packageVersionsResult.data ?? []) {
    const packageId = String(row.salary_package_id);
    if (!latestVersionByPackage.has(packageId)) {
      latestVersionByPackage.set(packageId, String(row.id));
    }
  }

  const packageRecords = (packagesResult.data ?? []).map((row) => ({
    code: formatHrDisplayLabel(row.code, "Package"),
    id: String(row.id),
    latestVersionId: latestVersionByPackage.get(String(row.id)) ?? null,
    name: formatHrDisplayLabel(row.name, "Package"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const componentRecords = (componentsResult.data ?? []).map((row) => ({
    category: formatHrDisplayLabel(categoryLabels.get(String(row.category_id)), "Category"),
    code: formatHrDisplayLabel(row.code, "Component"),
    id: String(row.id),
    name: formatHrDisplayLabel(row.name, "Component"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const categoryOptions = (categoriesResult.data ?? []).map((row) => ({
    categoryKey: String(row.category_key),
    id: String(row.id),
    label: String(row.label),
  }));

  const versionOptions = (packageVersionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: `${packageNames.get(String(row.salary_package_id)) ?? "Package"} v${row.version_no} (${row.effective_from})`,
    packageId: String(row.salary_package_id),
  }));

  const componentVersionOptions = (componentVersionsResult.data ?? []).map((row) => {
    const component = readJoinedComponent(row);
    return {
      id: String(row.id),
      label: `${component.code} — ${component.name} (v${Number(row.version_no ?? 1)})`,
    };
  });

  const packageLineRecords = (packageLinesResult.data ?? []).map((row) => {
    const joined = readJoinedComponentVersion(row);
    return {
      amount: Number(row.amount_override ?? 0),
      componentCode: joined.component.code,
      componentName: joined.component.name,
      componentVersion: joined.versionNo,
      displayOrder: Number(row.display_order ?? 0),
      id: String(row.id),
      packageVersionId: String(row.salary_package_version_id),
      status: formatHrStatusLabel(String(row.status)),
    };
  });

  const employeeIds = [...new Set((assignmentsResult.data ?? []).map((row) => String(row.employee_id)))];
  const employeeNames = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of employees ?? []) employeeNames.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
  }

  const assignmentRecords = (assignmentsResult.data ?? []).map((row) => ({
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    employeeId: String(row.employee_id),
    id: String(row.id),
    packageRef: String(row.salary_package_ref),
  }));

  const resolvedPackageVersionId =
    selectedPackageVersionId || versionOptions[0]?.id || "";

  return (
    <HrShell activeKey="compensation">
      <HrCompensationWorkspace
        activeTab={activeTab}
        assignmentRecords={assignmentRecords}
        categoryOptions={categoryOptions}
        componentRecords={componentRecords}
        componentVersionOptions={componentVersionOptions}
        highlightCreate={params.create === "1"}
        packageLineRecords={packageLineRecords}
        packageRecords={packageRecords}
        selectedPackageVersionId={resolvedPackageVersionId}
        versionOptions={versionOptions}
      />
    </HrShell>
  );
}

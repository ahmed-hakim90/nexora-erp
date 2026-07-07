import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  archiveCompensationComponentAction,
  archiveSalaryPackageAction,
  assignEmployeeSalaryPackageAction,
  createCompensationComponentAction,
  createSalaryPackageAction,
} from "@/features/hr/routes/actions/hr-compensation.actions";
import { formatHrDisplayLabel, formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrCompensationPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const activeTab = params.tab ?? (params.create === "1" ? "components" : "packages");

  const [packagesResult, componentsResult, categoriesResult, packageVersionsResult, assignmentsResult] = await Promise.all([
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
  ]);

  const categoryLabels = new Map((categoriesResult.data ?? []).map((row) => [String(row.id), String(row.label)]));
  const packageNames = new Map((packagesResult.data ?? []).map((row) => [String(row.id), String(row.name)]));

  const packageRecords = (packagesResult.data ?? []).map((row) => ({
    code: formatHrDisplayLabel(row.code, "Package"),
    id: String(row.id),
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

  const versionOptions = (packageVersionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: `${packageNames.get(String(row.salary_package_id)) ?? "Package"} v${row.version_no} (${row.effective_from})`,
  }));

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

  return (
    <HrShell activeKey="compensation">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Salary packages, compensation components, and employee salary assignments."
          help={resolveHrPageHelp("compensation")}
          title="Compensation / التعويضات"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <a className={`rounded-md border px-3 py-2 text-sm ${activeTab === "packages" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`} href="/erp/hr/compensation?tab=packages">
            Salary Packages
          </a>
          <a className={`rounded-md border px-3 py-2 text-sm ${activeTab === "components" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`} href="/erp/hr/compensation?tab=components">
            Components
          </a>
          <a className={`rounded-md border px-3 py-2 text-sm ${activeTab === "assignments" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`} href="/erp/hr/compensation?tab=assignments">
            Employee Assignments
          </a>
        </div>

        {activeTab === "components" ? (
          <div className="space-y-4">
            <form action={createCompensationComponentAction} className={`grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-5 ${params.create === "1" ? "border-accent ring-1 ring-accent" : ""}`}>
              <Input name="code" placeholder="Code (e.g. HOUSING)" required />
              <Input name="name" placeholder="Component name" required />
              <select className={nativeSelectClassName} defaultValue="basic_salary" name="categoryKey">
                {(categoriesResult.data ?? []).map((cat) => (
                  <option key={String(cat.id)} value={String(cat.category_key)}>
                    {String(cat.label)}
                  </option>
                ))}
              </select>
              <Input min="0" name="defaultAmount" placeholder="Default amount" step="0.01" type="number" />
              <Button type="submit" variant="primary">
                Add Component
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Code", key: "code", render: (r) => r.code },
                { header: "Name", key: "name", render: (r) => r.name },
                { header: "Category", key: "category", render: (r) => r.category },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (r) => (
                    <form action={archiveCompensationComponentAction.bind(null, r.id)}>
                      <Button size="sm" type="submit" variant="secondary">
                        Archive
                      </Button>
                    </form>
                  ),
                },
              ]}
              emptyMessage="No compensation components yet."
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={componentRecords}
            />
          </div>
        ) : null}

        {activeTab === "packages" ? (
          <div className="space-y-4">
            <form action={createSalaryPackageAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-4">
              <Input name="code" placeholder="Package code" required />
              <Input name="name" placeholder="Package name" required />
              <DatePicker name="effectiveFrom" placeholder="Effective from" required />
              <Button type="submit" variant="primary">
                Add Package
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Code", key: "code", render: (r) => r.code },
                { header: "Name", key: "name", render: (r) => r.name },
                { header: "Status", key: "status", render: (r) => r.status },
                {
                  header: "Actions",
                  key: "actions",
                  render: (r) => (
                    <form action={archiveSalaryPackageAction.bind(null, r.id)}>
                      <Button size="sm" type="submit" variant="secondary">
                        Archive
                      </Button>
                    </form>
                  ),
                },
              ]}
              emptyMessage="No salary packages yet."
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={packageRecords}
            />
          </div>
        ) : null}

        {activeTab === "assignments" ? (
          <div className="space-y-4">
            <form action={assignEmployeeSalaryPackageAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
              <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
              <select className={nativeSelectClassName} name="salaryPackageVersionId" required>
                <option value="">Salary package version</option>
                {versionOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="primary">
                Assign Package
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: "Employee", key: "employee", render: (r) => r.employee },
                { header: "Package Version", key: "pkg", render: (r) => r.packageRef },
              ]}
              emptyMessage="No employee salary assignments yet."
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={assignmentRecords}
              rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: "View profile" }]}
            />
          </div>
        ) : null}
      </PageContainer>
    </HrShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  archiveCompensationComponentAction,
  archiveSalaryPackageAction,
  archiveSalaryPackageLineAction,
  assignEmployeeSalaryPackageAction,
  createCompensationComponentAction,
  createSalaryPackageAction,
  createSalaryPackageLineAction,
  updateSalaryPackageLineAction,
} from "@/features/hr/routes/actions/hr-compensation.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  EnterpriseDataTable,
  EntityLookup,
  Input,
  DatePicker,
  nativeSelectClassName,
  secondaryButtonLinkClassName,
  useTranslations,
} from "@/shared/ui";

import { buildHrSectionHref, HrSectionWorkspace, resolveHrSectionTab } from "./hr-section-workspace";

export type HrCompensationPackageRecord = {
  code: string;
  id: string;
  latestVersionId: string | null;
  name: string;
  status: string;
};

export type HrCompensationComponentRecord = {
  category: string;
  code: string;
  id: string;
  name: string;
  status: string;
};

export type HrCompensationAssignmentRecord = {
  employee: string;
  employeeId: string;
  id: string;
  packageRef: string;
};

export type HrCompensationCategoryOption = {
  categoryKey: string;
  id: string;
  label: string;
};

export type HrCompensationVersionOption = {
  id: string;
  label: string;
  packageId: string;
};

export type HrCompensationComponentVersionOption = {
  id: string;
  label: string;
};

export type HrCompensationPackageLineRecord = {
  amount: number;
  componentCode: string;
  componentName: string;
  componentVersion: number;
  displayOrder: number;
  id: string;
  packageVersionId: string;
  status: string;
};

const COMPENSATION_TABS = ["packages", "components", "assignments"] as const;

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function HrCompensationWorkspace({
  activeTab: activeTabProp,
  assignmentRecords,
  categoryOptions,
  componentRecords,
  componentVersionOptions,
  highlightCreate,
  packageLineRecords,
  packageRecords,
  selectedPackageVersionId,
  versionOptions,
}: Readonly<{
  activeTab: string;
  assignmentRecords: readonly HrCompensationAssignmentRecord[];
  categoryOptions: readonly HrCompensationCategoryOption[];
  componentRecords: readonly HrCompensationComponentRecord[];
  componentVersionOptions: readonly HrCompensationComponentVersionOption[];
  highlightCreate?: boolean;
  packageLineRecords: readonly HrCompensationPackageLineRecord[];
  packageRecords: readonly HrCompensationPackageRecord[];
  selectedPackageVersionId: string;
  versionOptions: readonly HrCompensationVersionOption[];
}>) {
  const t = useTranslations();
  const router = useRouter();
  const activeTab = resolveHrSectionTab(activeTabProp, COMPENSATION_TABS, "packages");
  const href = (tab: string, extra?: Record<string, string | undefined>) =>
    buildHrSectionHref("/erp/hr/compensation", { tab, ...extra });

  const navItems = [
    { href: href("packages"), key: "packages", label: t("hr.compensation.tab.packages") },
    { href: href("components"), key: "components", label: t("hr.compensation.tab.components") },
    { href: href("assignments"), key: "assignments", label: t("hr.compensation.tab.assignments") },
  ] as const;

  const filteredPackageLines = packageLineRecords.filter((row) => row.packageVersionId === selectedPackageVersionId);
  const packageLineTotal = filteredPackageLines.reduce((sum, row) => sum + row.amount, 0);
  const selectedVersionLabel =
    versionOptions.find((option) => option.id === selectedPackageVersionId)?.label ?? t("hr.compensation.packageVersionSelect");

  return (
    <HrSectionWorkspace
      activeTab={activeTab}
      description={t("hr.compensation.description")}
      help={resolveHrPageHelp("compensation")}
      navItems={navItems}
      summaryMetrics={[
        {
          helper: t("hr.compensation.kpi.packages.helper"),
          href: href("packages"),
          label: t("hr.compensation.kpi.packages"),
          value: packageRecords.length,
        },
        {
          helper: t("hr.compensation.kpi.components.helper"),
          href: href("components"),
          label: t("hr.compensation.kpi.components"),
          value: componentRecords.length,
        },
        {
          helper: t("hr.compensation.kpi.packageLines.helper"),
          href: href("packages", { packageVersion: selectedPackageVersionId || undefined }),
          label: t("hr.compensation.kpi.packageLines"),
          value: packageLineRecords.length,
        },
        {
          helper: t("hr.compensation.kpi.assignments.helper"),
          href: href("assignments"),
          label: t("hr.compensation.kpi.assignments"),
          value: assignmentRecords.length,
        },
      ]}
      title={t("hr.compensation.title")}
      workspaceKey="compensation"
    >
      {activeTab === "components" ? (
        <div className="space-y-4">
          <form
            action={createCompensationComponentAction}
            className={`grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3 xl:grid-cols-5 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}
          >
            <Input name="code" placeholder={t("hr.compensation.codeExample")} required />
            <Input name="name" placeholder={t("hr.compensation.componentName")} required />
            <select className={nativeSelectClassName} defaultValue="basic_salary" name="categoryKey">
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.categoryKey}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Input min="0" name="defaultAmount" placeholder={t("hr.compensation.defaultAmount")} step="0.01" type="number" />
            <Button type="submit" variant="primary">
              {t("hr.compensation.addComponent")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.code"), key: "code", render: (r) => r.code },
              { header: t("hr.common.name"), key: "name", render: (r) => r.name },
              { header: t("hr.common.category"), key: "category", render: (r) => r.category },
              { header: t("hr.common.status"), key: "status", render: (r) => r.status },
              {
                header: t("hr.common.actions"),
                key: "actions",
                render: (r) => (
                  <form action={archiveCompensationComponentAction.bind(null, r.id)}>
                    <Button size="sm" type="submit" variant="secondary">
                      {t("hr.common.archive")}
                    </Button>
                  </form>
                ),
              },
            ]}
            emptyMessage={t("hr.compensation.emptyComponents")}
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={componentRecords}
          />
        </div>
      ) : null}

      {activeTab === "packages" ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <form action={createSalaryPackageAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3 xl:grid-cols-4">
              <Input name="code" placeholder={t("hr.compensation.packageCode")} required />
              <Input name="name" placeholder={t("hr.compensation.packageName")} required />
              <DatePicker name="effectiveFrom" placeholder={t("hr.common.effectiveFrom")} required />
              <Button type="submit" variant="primary">
                {t("hr.compensation.addPackage")}
              </Button>
            </form>
            <EnterpriseDataTable
              columns={[
                { header: t("hr.common.code"), key: "code", render: (r) => r.code },
                { header: t("hr.common.name"), key: "name", render: (r) => r.name },
                { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                {
                  header: t("hr.common.actions"),
                  key: "actions",
                  render: (r) => (
                    <div className="flex flex-wrap gap-2">
                      {r.latestVersionId ? (
                        <Link
                          className={secondaryButtonLinkClassName}
                          href={href("packages", { packageVersion: r.latestVersionId })}
                        >
                          {t("hr.compensation.manageLines")}
                        </Link>
                      ) : null}
                      <form action={archiveSalaryPackageAction.bind(null, r.id)}>
                        <Button size="sm" type="submit" variant="secondary">
                          {t("hr.common.archive")}
                        </Button>
                      </form>
                    </div>
                  ),
                },
              ]}
              emptyMessage={t("hr.compensation.emptyPackages")}
              getRowId={(r) => r.id}
              pagination={{ mode: "cursor", pageSize: 50 }}
              records={packageRecords}
            />
          </div>

          <section className="space-y-4 rounded-lg border bg-[hsl(var(--surface))] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-medium">{t("hr.compensation.packageLinesTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("hr.compensation.packageLinesDescription")}</p>
              </div>
              <div className="min-w-[280px]">
                <label className="mb-1 block text-sm font-medium">{t("hr.compensation.packageVersionSelect")}</label>
                <select
                  className={nativeSelectClassName}
                  onChange={(event) => {
                    router.push(href("packages", { packageVersion: event.target.value }));
                  }}
                  value={selectedPackageVersionId}
                >
                  {versionOptions.length === 0 ? (
                    <option value="">{t("hr.compensation.emptyPackages")}</option>
                  ) : (
                    versionOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {selectedPackageVersionId ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("hr.compensation.packageLinesSelected")}: <span className="font-medium text-foreground">{selectedVersionLabel}</span>
                </p>
                <form
                  action={createSalaryPackageLineAction}
                  className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-3 xl:grid-cols-4"
                >
                  <input name="salaryPackageVersionId" type="hidden" value={selectedPackageVersionId} />
                  <select className={nativeSelectClassName} name="componentVersionId" required>
                    <option value="">{t("hr.compensation.componentVersionSelect")}</option>
                    {componentVersionOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    min="0"
                    name="amount"
                    placeholder={t("hr.compensation.lineAmount")}
                    required
                    step="0.01"
                    type="number"
                  />
                  <Button disabled={componentVersionOptions.length === 0} type="submit" variant="primary">
                    {t("hr.compensation.addPackageLine")}
                  </Button>
                </form>
                <EnterpriseDataTable
                  columns={[
                    {
                      header: t("hr.compensation.column.component"),
                      key: "component",
                      render: (r) => `${r.componentCode} — ${r.componentName}`,
                    },
                    {
                      header: t("hr.common.amount"),
                      key: "amount",
                      render: (r) => (
                        <form action={updateSalaryPackageLineAction} className="flex items-center gap-2">
                          <input name="lineId" type="hidden" value={r.id} />
                          <Input
                            className="max-w-[160px]"
                            defaultValue={r.amount}
                            min="0"
                            name="amount"
                            step="0.01"
                            type="number"
                          />
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.save")}
                          </Button>
                        </form>
                      ),
                    },
                    { header: t("hr.common.status"), key: "status", render: (r) => r.status },
                    {
                      header: t("hr.common.actions"),
                      key: "actions",
                      render: (r) => (
                        <form action={archiveSalaryPackageLineAction.bind(null, r.id)}>
                          <Button size="sm" type="submit" variant="secondary">
                            {t("hr.common.archive")}
                          </Button>
                        </form>
                      ),
                    },
                  ]}
                  emptyMessage={t("hr.compensation.emptyPackageLines")}
                  getRowId={(r) => r.id}
                  pagination={{ mode: "cursor", pageSize: 50 }}
                  records={filteredPackageLines}
                />
                <div className="flex justify-end rounded-md border bg-muted/30 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{t("hr.compensation.packageLinesTotal")}:</span>
                  <span className="ms-2 font-semibold">{formatAmount(packageLineTotal)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("hr.compensation.packageLinesNoVersion")}</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <div className="space-y-4">
          <form action={assignEmployeeSalaryPackageAction} className="grid gap-3 rounded-lg border bg-[hsl(var(--surface))] p-4 md:grid-cols-3">
            <EntityLookup label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
            <select className={nativeSelectClassName} name="salaryPackageVersionId" required>
              <option value="">{t("hr.compensation.packageVersionSelect")}</option>
              {versionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="primary">
              {t("hr.compensation.assignPackage")}
            </Button>
          </form>
          <EnterpriseDataTable
            columns={[
              { header: t("hr.common.employee"), key: "employee", render: (r) => r.employee },
              { header: t("hr.compensation.column.packageVersion"), key: "pkg", render: (r) => r.packageRef },
            ]}
            emptyMessage={t("hr.compensation.emptyAssignments")}
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={assignmentRecords}
            rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
          />
        </div>
      ) : null}
    </HrSectionWorkspace>
  );
}

import { BarChart3 } from "lucide-react";

import {
  ReconciliationRegister,
} from "../../_components/foundation-workspaces";
import { reconciliationItems } from "../../foundation-ux-catalog";
import { createErpShellChrome, resolveErpRuntimeContext } from "../../erp-shell-model";
import {
  AppShell,
  DocumentLifecycleBar,
  FacetedFilterBar,
  ImportExportActions,
  PageContainer,
  PageContent,
  PageHeader,
  StatusChip,
} from "@/shared/ui";

const reportGroups = [
  {
    key: "finance",
    title: "Finance Reports",
    reports: ["Chart of Accounts Listing", "Fiscal Calendar", "Currency Register", "Tax Definition Register", "Dimension Coverage"],
  },
  {
    key: "inventory",
    title: "Inventory Reports",
    reports: ["Stock on Hand", "Stock Movements", "Transfer Register", "Adjustment Register", "Reorder Rules", "Lot & Serial Trace"],
  },
  {
    key: "manufacturing",
    title: "Manufacturing Reports",
    reports: ["Daily Production Report", "Plan Achievement", "Worker Achievement", "Line Achievement", "Product Achievement", "Scrap/Rework/Downtime"],
  },
] as const;

export default async function EnterpriseReportsPage() {
  const runtime = await resolveErpRuntimeContext();

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Reports" }]}
      workspace={{ key: "reports", name: "Reports", icon: <BarChart3 className="size-4" /> }}
      workspaceNav={[
        { key: "reports", label: "Reports", href: "/erp/reports", isActive: true },
        { key: "import", label: "Import", href: "/erp/reports#import" },
        { key: "export", label: "Export", href: "/erp/reports#export" },
      ]}
    >
      <PageContainer>
        <PageHeader
          description="Report shells are designed against platform reporting/export contracts. They filter by tenant, company, branch, locale, and permissions."
          title="Enterprise Reports & Import/Export"
        >
          <ImportExportActions />
        </PageHeader>
        <PageContent>
          <div className="space-y-4">
            <DocumentLifecycleBar
              steps={[
                { key: "filter", label: "Filter", state: "complete" },
                { key: "preview", label: "Preview", state: "current" },
                { key: "export", label: "Export", state: "pending" },
                { key: "print", label: "Print", state: "pending" },
              ]}
            />
            <FacetedFilterBar
              filters={[
                { key: "company", label: "Company", value: runtime.companyName },
                { key: "branch", label: "Branch", value: runtime.branchName },
                { key: "period", label: "Period", value: "Current" },
                { key: "locale", label: "Locale", value: "EN / AR ready" },
              ]}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              {reportGroups.map((group) => (
                <section className="rounded-lg border bg-[hsl(var(--surface))] p-4" key={group.key}>
                  <h2 className="font-medium">{group.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.reports.map((report) => (
                      <StatusChip key={report} status={report} tone="accent" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
          <ReconciliationRegister items={reconciliationItems} />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

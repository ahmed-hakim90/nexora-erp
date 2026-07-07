import { BarChart3 } from "lucide-react";

import {
  CapabilityContributionSection,
  CapabilitySummaryCards,
} from "../_components/platform-capability-panels";
import {
  ReconciliationRegister,
} from "../../_components/foundation-workspaces";
import { reconciliationItems } from "../../foundation-ux-catalog";
import { createErpShellChrome, createErpShellSnapshot } from "../../erp-shell-model";
import { requirePlatformCapabilityAccess } from "../../erp-platform-capability.server";
import {
  AppShell,
  DocumentLifecycleBar,
  FacetedFilterBar,
  ImportExportActions,
  PageContainer,
  PageContent,
  PageHeader,
} from "@/shared/ui";
import { buildAppCapabilityPlatformModel } from "@/shared/workspace/public-api";

export default async function EnterpriseReportsPage() {
  const { runtime } = await requirePlatformCapabilityAccess("reports");
  const model = buildAppCapabilityPlatformModel(createErpShellSnapshot(runtime).manifests);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Reports" }]}
      workspace={{ key: "reports", name: "Reports", icon: <BarChart3 className="size-4" /> }}
      workspaceNav={[
        { key: "reports", label: "Reports", href: "/erp/reports", isActive: true },
        { key: "dashboard", label: "Dashboard", href: "/erp/dashboard" },
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
            <CapabilitySummaryCards model={model} />
            <CapabilityContributionSection
              description="Report contracts declared by accepted apps and exposed through the platform report catalog."
              emptyMessage="No report contributions are declared by the accepted apps yet."
              items={model.reports}
              title="Report Contributions"
            />
            <CapabilityContributionSection
              description="Print contracts attached to report and document output surfaces."
              emptyMessage="No print contributions are declared by the accepted apps yet."
              items={model.prints}
              title="Print Contributions"
            />
          </div>
          <ReconciliationRegister items={reconciliationItems} />
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

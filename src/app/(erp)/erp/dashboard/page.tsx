import { LayoutDashboard } from "lucide-react";

import {
  CapabilityContributionSection,
  CapabilitySummaryCards,
} from "../_components/platform-capability-panels";
import { createErpShellChrome, createErpShellSnapshot } from "../../erp-shell-model";
import { requirePlatformCapabilityAccess } from "../../erp-platform-capability.server";
import {
  AppShell,
  PageContainer,
  PageContent,
  PageHeader,
} from "@/shared/ui";
import { buildAppCapabilityPlatformModel } from "@/shared/workspace/public-api";

export default async function DashboardPage() {
  const { runtime } = await requirePlatformCapabilityAccess("dashboard");
  const model = buildAppCapabilityPlatformModel(createErpShellSnapshot(runtime).manifests);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Dashboard" }]}
      workspace={{ key: "dashboard", name: "Dashboard", icon: <LayoutDashboard className="size-4" /> }}
      workspaceNav={[
        { key: "dashboard", label: "Dashboard", href: "/erp/dashboard", isActive: true },
        { key: "reports", label: "Reports", href: "/erp/reports" },
        { key: "settings", label: "Settings", href: "/erp/settings" },
      ]}
    >
      <PageContainer>
        <PageHeader
          description="Dashboard surfaces discover widgets and templates from app manifests. The platform owns the dashboard shell; apps own their domain widgets and permissions."
          title="Platform Dashboard Catalog"
        />
        <PageContent>
          <div className="space-y-5">
            <CapabilitySummaryCards model={model} />
            <CapabilityContributionSection
              description="Dashboard contracts declared by accepted business apps."
              emptyMessage="No dashboard contributions are declared by the accepted apps yet."
              items={model.dashboards}
              title="Dashboard Contributions"
            />
          </div>
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

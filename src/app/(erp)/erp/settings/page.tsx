import { Settings } from "lucide-react";

import {
  AppReadinessSection,
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

export default async function SettingsPage() {
  const { runtime } = await requirePlatformCapabilityAccess("settings");
  const model = buildAppCapabilityPlatformModel(createErpShellSnapshot(runtime).manifests);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[
        { href: "/erp", label: "Apps", messageKey: "shell.apps.label" },
        { label: "Settings", messageKey: "shell.settings.tooltip" },
      ]}
      workspace={{ key: "settings", name: "Settings", icon: <Settings className="size-4" /> }}
      workspaceNav={[
        { key: "settings", label: "Settings", href: "/erp/settings", isActive: true },
        { key: "flags", label: "Feature Flags", href: "/erp/feature-flags" },
        { key: "dashboard", label: "Dashboard", href: "/erp/dashboard" },
      ]}
    >
      <PageContainer>
        <PageHeader
          description="Settings are centralized by tenant, company, branch, app, and user scope. Apps contribute setting contracts through their manifests while the platform owns the management surface."
          title="Platform Settings"
        />
        <PageContent>
          <div className="space-y-5">
            <CapabilitySummaryCards model={model} />
            <CapabilityContributionSection
              description="App setting contracts available for a central settings workspace."
              emptyMessage="No app settings are declared by the accepted apps yet."
              items={model.settings}
              title="App Setting Contributions"
            />
            <AppReadinessSection items={model.readiness} />
          </div>
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

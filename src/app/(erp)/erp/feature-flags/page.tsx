import { Flag } from "lucide-react";

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

export default async function FeatureFlagsPage() {
  const { runtime } = await requirePlatformCapabilityAccess("featureFlags");
  const model = buildAppCapabilityPlatformModel(createErpShellSnapshot(runtime).manifests);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[
        { href: "/erp", label: "Apps", messageKey: "shell.apps.label" },
        { label: "Feature Flags" },
      ]}
      workspace={{ key: "feature-flags", name: "Feature Flags", icon: <Flag className="size-4" /> }}
      workspaceNav={[
        { key: "flags", label: "Flags", href: "/erp/feature-flags", isActive: true },
        { key: "settings", label: "Settings", href: "/erp/settings" },
        { key: "notifications", label: "Notifications", href: "/erp/notifications" },
      ]}
    >
      <PageContainer>
        <PageHeader
          description="Feature flags are the staged rollout gates that apps declare in their manifests. Runtime context now carries the accepted platform flags into navigation and workspace access checks."
          title="Feature Flags"
        />
        <PageContent>
          <div className="space-y-5">
            <CapabilitySummaryCards model={model} />
            <CapabilityContributionSection
              description="Flags collected from manifest-level gates, route gates, navigation gates, and capability gates."
              emptyMessage="No feature flag gates are declared by the accepted apps yet."
              items={model.featureFlags}
              title="Declared Feature Gates"
            />
          </div>
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

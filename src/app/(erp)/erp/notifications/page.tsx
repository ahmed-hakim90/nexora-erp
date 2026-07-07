import { Bell } from "lucide-react";

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

export default async function NotificationsPage() {
  const { runtime } = await requirePlatformCapabilityAccess("notifications");
  const model = buildAppCapabilityPlatformModel(createErpShellSnapshot(runtime).manifests);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Notifications" }]}
      workspace={{ key: "notifications", name: "Notifications", icon: <Bell className="size-4" /> }}
      workspaceNav={[
        { key: "notifications", label: "Notifications", href: "/erp/notifications", isActive: true },
        { key: "flags", label: "Feature Flags", href: "/erp/feature-flags" },
        { key: "settings", label: "Settings", href: "/erp/settings" },
      ]}
    >
      <PageContainer>
        <PageHeader
          description="Notification contracts are declared by apps, then mapped by the platform to preferences, templates, durable delivery, and in-app inbox surfaces."
          title="Notification Contracts"
        />
        <PageContent>
          <div className="space-y-5">
            <CapabilitySummaryCards model={model} />
            <CapabilityContributionSection
              description="Notification hooks declared in app manifests. Delivery runtime remains owned by the platform notification engine."
              emptyMessage="No notification contributions are declared by the accepted apps yet."
              items={model.notifications}
              title="Notification Contributions"
            />
          </div>
        </PageContent>
      </PageContainer>
    </AppShell>
  );
}

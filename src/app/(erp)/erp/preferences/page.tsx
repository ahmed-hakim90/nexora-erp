import { SlidersHorizontal } from "lucide-react";

import { createErpShellChrome } from "../../erp-shell-model";
import { requirePlatformCapabilityAccess } from "../../erp-platform-capability.server";
import { PreferencesWorkspace } from "./preferences-workspace";
import { AppShell, PageContainer } from "@/shared/ui";
import { loadCurrentWorkspacePreferences } from "@/shared/workspace/preferences.server";

export default async function PreferencesPage() {
  const [{ runtime }, initialPreferences] = await Promise.all([
    requirePlatformCapabilityAccess("preferences"),
    loadCurrentWorkspacePreferences(),
  ]);

  return (
    <AppShell
      {...createErpShellChrome(undefined, runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Preferences" }]}
      workspace={{ key: "preferences", name: "Preferences", icon: <SlidersHorizontal className="size-4" /> }}
      workspaceNav={[
        { key: "preferences", label: "Preferences", href: "/erp/preferences", isActive: true },
        { key: "settings", label: "Settings", href: "/erp/settings" },
      ]}
    >
      <PageContainer>
        <PreferencesWorkspace initialPreferences={initialPreferences} />
      </PageContainer>
    </AppShell>
  );
}

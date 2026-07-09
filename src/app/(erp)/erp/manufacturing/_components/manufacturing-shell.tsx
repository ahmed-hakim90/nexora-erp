import type { ReactNode } from "react";
import { Factory } from "lucide-react";

import { MANUFACTURING_PERMISSIONS, MANUFACTURING_RESOURCE_LIST } from "@/features/manufacturing/public-api";
import { AppShell } from "@/shared/ui";

import { resolveErpShellRuntime } from "../../../erp-security.server";
import { createErpShellChrome } from "../../../erp-shell-model";
import { ErpGlobalSearchSlot } from "../../_components/erp-global-search-slot";

const manufacturingItems = [
  { key: "overview", label: "Overview", href: "/erp/manufacturing", group: "overview" as const },
  { key: "documentation", label: "Documentation", href: "/erp/manufacturing/documentation", group: "overview" as const },
  { key: "daily-reports", label: "DPR", fullLabel: "Daily Production Report", href: "/erp/manufacturing/daily-reports", group: "operations" as const },
  { key: "targets", label: "Targets", href: "/erp/manufacturing/targets", group: "operations" as const },
  { key: "reports", label: "Reports", fullLabel: "Reports & KPIs", href: "/erp/manufacturing/reports", group: "reports" as const },
  ...MANUFACTURING_RESOURCE_LIST.map((resource) => ({
    key: resource.key,
    label: resource.title
      .replace("Manufacturing Products", "Products")
      .replace("Production Lines", "Lines")
      .replace("Work Centers", "Centers"),
    fullLabel: resource.title,
    href: resource.basePath,
    group: "master-data" as const,
  })),
];

export async function ManufacturingShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpShellRuntime({
    appKey: "manufacturing",
    permission: MANUFACTURING_PERMISSIONS.view,
  });

  return (
    <AppShell
      {...createErpShellChrome("manufacturing", runtime)}
      breadcrumbs={[
        { label: "Apps", href: "/erp", messageKey: "shell.apps.label" },
        { label: "Manufacturing", href: "/erp/manufacturing", messageKey: "apps.manufacturing" },
      ]}
      globalSearchSlot={<ErpGlobalSearchSlot activePath="/erp/manufacturing" runtime={runtime} />}
      workspace={{ key: "manufacturing", name: "Manufacturing", icon: <Factory className="size-4" /> }}
      workspaceNav={manufacturingItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

import type { ReactNode } from "react";
import { Factory } from "lucide-react";

import { MANUFACTURING_RESOURCE_LIST } from "@/features/manufacturing/public-api";
import { AppShell } from "@/shared/ui";

import { createErpShellChrome, resolveErpRuntimeContext } from "../../../erp-shell-model";

const manufacturingItems = [
  { key: "overview", label: "Overview", href: "/erp/manufacturing" },
  { key: "documentation", label: "Documentation", href: "/erp/manufacturing/documentation" },
  { key: "daily-reports", label: "DPR", fullLabel: "Daily Production Report", href: "/erp/manufacturing/daily-reports" },
  { key: "targets", label: "Targets", href: "/erp/manufacturing/targets" },
  { key: "reports", label: "Reports", fullLabel: "Reports & KPIs", href: "/erp/manufacturing/reports" },
  ...MANUFACTURING_RESOURCE_LIST.map((resource) => ({
    key: resource.key,
    label: resource.title
      .replace("Manufacturing Products", "Products")
      .replace("Production Lines", "Lines")
      .replace("Work Centers", "Centers"),
    fullLabel: resource.title,
    href: resource.basePath,
  })),
];

export async function ManufacturingShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpRuntimeContext();

  return (
    <AppShell
      {...createErpShellChrome("manufacturing", runtime)}
      breadcrumbs={[{ label: "Apps", href: "/erp" }, { label: "Manufacturing", href: "/erp/manufacturing" }]}
      workspace={{ key: "manufacturing", name: "Manufacturing", icon: <Factory className="size-4" /> }}
      workspaceNav={manufacturingItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

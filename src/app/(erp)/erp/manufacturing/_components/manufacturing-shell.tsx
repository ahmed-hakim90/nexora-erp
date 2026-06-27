import type { ReactNode } from "react";

import { MANUFACTURING_RESOURCE_LIST } from "@/features/manufacturing/public-api";
import { AppShell } from "@/shared/ui";

const manufacturingItems = [
  { key: "overview", label: "Overview", href: "/erp/manufacturing" },
  ...MANUFACTURING_RESOURCE_LIST.map((resource) => ({
    key: resource.key,
    label: resource.title,
    href: resource.basePath,
  })),
];

export function ManufacturingShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  return (
    <AppShell
      activeWorkspaceKey="erp"
      breadcrumbs={[{ label: "ERP Workspace", href: "/erp" }, { label: "Manufacturing" }]}
      sidebarGroups={[
        {
          key: "manufacturing",
          label: "Manufacturing",
          items: manufacturingItems.map((item) => ({ ...item, isActive: item.key === activeKey })),
        },
      ]}
      workspaceOptions={[{ key: "erp", label: "ERP Workspace" }]}
    >
      {children}
    </AppShell>
  );
}

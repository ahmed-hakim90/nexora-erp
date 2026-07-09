import type { ReactNode } from "react";
import { IdCard } from "lucide-react";

import { HR_NAV_ITEMS, HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveHrActiveNavKey } from "@/features/hr/navigation/hr-navigation";
import { AppShell } from "@/shared/ui";

import { resolveErpShellRuntime } from "../../../erp-security.server";
import { createErpShellChrome } from "../../../erp-shell-model";
import { ErpGlobalSearchSlot } from "../../_components/erp-global-search-slot";

export async function HrShell({
  activeKey,
  children,
  pathname = "/erp/hr",
}: Readonly<{
  activeKey?: string;
  children: ReactNode;
  pathname?: string;
}>) {
  const runtime = await resolveErpShellRuntime({
    appKey: "hr",
    permission: HR_PERMISSIONS.view,
  });

  const resolvedActiveKey = activeKey ?? resolveHrActiveNavKey(pathname);

  return (
    <AppShell
      {...createErpShellChrome("hr", runtime)}
      breadcrumbs={[
        { label: "Apps", href: "/erp", messageKey: "shell.apps.label" },
        { label: "HR", href: "/erp/hr", messageKey: "apps.hr" },
      ]}
      globalSearchSlot={<ErpGlobalSearchSlot activePath={pathname} runtime={runtime} />}
      homeHref="/erp"
      workspace={{ key: "hr", name: "HR", icon: <IdCard className="size-4" /> }}
      workspaceNav={HR_NAV_ITEMS.map((item) => ({
        fullLabel: item.fullLabel,
        group: item.group,
        href: item.href,
        isActive: item.key === resolvedActiveKey,
        key: item.key,
        label: item.label,
        labelAr: item.labelAr,
        mobileLabel: item.mobileLabel,
        priority: item.priority,
      }))}
    >
      {children}
    </AppShell>
  );
}

import type { ReactNode } from "react";
import { Landmark } from "lucide-react";

import { AppShell } from "@/shared/ui";
import { FINANCE_ENTITIES, FINANCE_PERMISSIONS } from "@/features/finance/public-api";

import { resolveErpShellRuntime } from "../../../erp-security.server";
import { createErpShellChrome } from "../../../erp-shell-model";
import { ErpGlobalSearchSlot } from "../../_components/erp-global-search-slot";

const financeNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/erp/finance", group: "overview" as const },
  { key: "documentation", label: "Documentation", href: "/erp/finance/documentation", group: "overview" as const },
  { key: "chart-of-accounts", label: FINANCE_ENTITIES["chart-of-accounts"].title, href: FINANCE_ENTITIES["chart-of-accounts"].basePath, group: "master-data" as const },
  { key: "account-types", label: FINANCE_ENTITIES["account-types"].title, href: FINANCE_ENTITIES["account-types"].basePath, group: "master-data" as const },
  { key: "journals", label: FINANCE_ENTITIES.journals.title, href: FINANCE_ENTITIES.journals.basePath, group: "master-data" as const },
  { key: "fiscal-years", label: FINANCE_ENTITIES["fiscal-years"].title, href: FINANCE_ENTITIES["fiscal-years"].basePath, group: "master-data" as const },
  { key: "fiscal-periods", label: FINANCE_ENTITIES["fiscal-periods"].title, href: FINANCE_ENTITIES["fiscal-periods"].basePath, group: "master-data" as const },
  { key: "currencies", label: FINANCE_ENTITIES.currencies.title, href: FINANCE_ENTITIES.currencies.basePath, group: "master-data" as const },
  { key: "taxes", label: FINANCE_ENTITIES.taxes.title, href: FINANCE_ENTITIES.taxes.basePath, group: "master-data" as const },
  { key: "payment-terms", label: FINANCE_ENTITIES["payment-terms"].title, href: FINANCE_ENTITIES["payment-terms"].basePath, group: "master-data" as const },
  { key: "cost-centers", label: FINANCE_ENTITIES["cost-centers"].title, href: FINANCE_ENTITIES["cost-centers"].basePath, group: "master-data" as const },
  { key: "dimensions", label: FINANCE_ENTITIES.dimensions.title, href: FINANCE_ENTITIES.dimensions.basePath, group: "master-data" as const },
  { key: "reports", label: "Reports Readiness", href: "/erp/finance/reports", group: "reports" as const },
];

export async function FinanceShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpShellRuntime({
    appKey: "finance",
    permission: FINANCE_PERMISSIONS.accountsView,
  });

  return (
    <AppShell
      {...createErpShellChrome("finance", runtime)}
      breadcrumbs={[
        { label: "Apps", href: "/erp", messageKey: "shell.apps.label" },
        { label: "Finance", href: "/erp/finance", messageKey: "apps.finance" },
      ]}
      globalSearchSlot={<ErpGlobalSearchSlot activePath="/erp/finance" runtime={runtime} />}
      workspace={{ key: "finance", name: "Finance", icon: <Landmark className="size-4" /> }}
      workspaceNav={financeNavItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

import type { ReactNode } from "react";
import { Landmark } from "lucide-react";

import { AppShell } from "@/shared/ui";
import { FINANCE_ENTITIES } from "@/features/finance/public-api";

import { createErpShellChrome, resolveErpRuntimeContext } from "../../../erp-shell-model";

const financeNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/erp/finance" },
  { key: "documentation", label: "Documentation", href: "/erp/finance/documentation" },
  { key: "chart-of-accounts", label: FINANCE_ENTITIES["chart-of-accounts"].title, href: FINANCE_ENTITIES["chart-of-accounts"].basePath },
  { key: "account-types", label: FINANCE_ENTITIES["account-types"].title, href: FINANCE_ENTITIES["account-types"].basePath },
  { key: "journals", label: FINANCE_ENTITIES.journals.title, href: FINANCE_ENTITIES.journals.basePath },
  { key: "fiscal-years", label: FINANCE_ENTITIES["fiscal-years"].title, href: FINANCE_ENTITIES["fiscal-years"].basePath },
  { key: "fiscal-periods", label: FINANCE_ENTITIES["fiscal-periods"].title, href: FINANCE_ENTITIES["fiscal-periods"].basePath },
  { key: "currencies", label: FINANCE_ENTITIES.currencies.title, href: FINANCE_ENTITIES.currencies.basePath },
  { key: "taxes", label: FINANCE_ENTITIES.taxes.title, href: FINANCE_ENTITIES.taxes.basePath },
  { key: "payment-terms", label: FINANCE_ENTITIES["payment-terms"].title, href: FINANCE_ENTITIES["payment-terms"].basePath },
  { key: "cost-centers", label: FINANCE_ENTITIES["cost-centers"].title, href: FINANCE_ENTITIES["cost-centers"].basePath },
  { key: "dimensions", label: FINANCE_ENTITIES.dimensions.title, href: FINANCE_ENTITIES.dimensions.basePath },
  { key: "reports", label: "Reports Readiness", href: "/erp/finance/reports" },
];

export async function FinanceShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpRuntimeContext();

  return (
    <AppShell
      {...createErpShellChrome("finance", runtime)}
      breadcrumbs={[{ label: "Apps", href: "/erp" }, { label: "Finance", href: "/erp/finance" }]}
      workspace={{ key: "finance", name: "Finance", icon: <Landmark className="size-4" /> }}
      workspaceNav={financeNavItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

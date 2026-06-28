import type { ReactNode } from "react";
import { Database } from "lucide-react";

import { AppShell } from "@/shared/ui";

import { createErpShellChrome, resolveErpRuntimeContext } from "../../../erp-shell-model";

const masterDataItems = [
  { key: "products", label: "Products", href: "/erp/master-data/products" },
  { key: "product-categories", label: "Product Categories", href: "/erp/master-data/product-categories" },
  { key: "units", label: "Units", href: "/erp/master-data/units" },
  { key: "brands", label: "Brands", href: "/erp/master-data/brands" },
  { key: "warehouses", label: "Warehouses", href: "/erp/master-data/warehouses" },
  { key: "warehouse-locations", label: "Warehouse Locations", href: "/erp/master-data/warehouse-locations" },
  { key: "customers", label: "Customers", href: "/erp/master-data/customers" },
  { key: "suppliers", label: "Suppliers", href: "/erp/master-data/suppliers" },
  { key: "price-lists", label: "Price Lists", href: "/erp/master-data/price-lists" },
  { key: "tax-profiles", label: "Tax Profiles", href: "/erp/master-data/tax-profiles" },
];

export async function MasterDataShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpRuntimeContext();

  return (
    <AppShell
      {...createErpShellChrome("master-data", runtime)}
      breadcrumbs={[{ label: "Apps", href: "/erp" }, { label: "Master Data", href: "/erp/master-data" }]}
      workspace={{ key: "master-data", name: "Master Data", icon: <Database className="size-4" /> }}
      workspaceNav={masterDataItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

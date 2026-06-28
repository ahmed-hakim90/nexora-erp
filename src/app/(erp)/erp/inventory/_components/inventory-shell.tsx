import type { ReactNode } from "react";
import { Boxes } from "lucide-react";

import { AppShell } from "@/shared/ui";

import { createErpShellChrome, resolveErpRuntimeContext } from "../../../erp-shell-model";

const inventoryItems = [
  { key: "overview", label: "Overview", href: "/erp/inventory" },
  { key: "documentation", label: "Documentation", href: "/erp/inventory/documentation" },
  { key: "products", label: "Products", href: "/erp/inventory/products" },
  { key: "variants", label: "Variants", href: "/erp/inventory/variants" },
  { key: "categories", label: "Categories", href: "/erp/inventory/categories" },
  { key: "uom-categories", label: "UOM Categories", href: "/erp/inventory/uom-categories" },
  { key: "uoms", label: "Units of Measure", href: "/erp/inventory/uoms" },
  { key: "warehouses", label: "Warehouses", href: "/erp/inventory/warehouses" },
  { key: "locations", label: "Locations", href: "/erp/inventory/locations" },
  { key: "lots", label: "Lots", href: "/erp/inventory/lots" },
  { key: "serials", label: "Serial Numbers", href: "/erp/inventory/serials" },
  { key: "reorder-rules", label: "Reorder Rules", href: "/erp/inventory/reorder-rules" },
  { key: "events", label: "Event Definitions", href: "/erp/inventory/events" },
  { key: "endpoints", label: "Endpoints", href: "/erp/inventory/endpoints" },
  { key: "routes", label: "Routes", href: "/erp/inventory/routes" },
  { key: "messages", label: "Messages", href: "/erp/inventory/messages" },
  { key: "stockLedger", label: "Stock Ledger", href: "/erp/inventory/stock-ledger" },
  { key: "stockBalances", label: "Stock Balances", href: "/erp/inventory/stock-balances" },
  { key: "postingBatches", label: "Posting Batches", href: "/erp/inventory/posting-batches" },
  { key: "transactions", label: "Transactions", href: "/erp/inventory/transactions" },
  { key: "stockAdjustment", label: "Stock Adjustment", href: "/erp/inventory/stock-adjustment/new" },
  { key: "warehouseTransfer", label: "Warehouse Transfer", href: "/erp/inventory/warehouse-transfer/new" },
  { key: "goodsReceipt", label: "Goods Receipt", href: "/erp/inventory/goods-receipt/new" },
  { key: "goodsIssue", label: "Goods Issue", href: "/erp/inventory/goods-issue/new" },
  { key: "cycleCount", label: "Cycle Count", href: "/erp/inventory/cycle-count/new" },
];

export async function InventoryShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpRuntimeContext();

  return (
    <AppShell
      {...createErpShellChrome("inventory", runtime)}
      breadcrumbs={[{ label: "Apps", href: "/erp" }, { label: "Inventory", href: "/erp/inventory" }]}
      workspace={{ key: "inventory", name: "Inventory", icon: <Boxes className="size-4" /> }}
      workspaceNav={inventoryItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

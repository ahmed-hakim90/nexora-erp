import type { ReactNode } from "react";
import { Boxes } from "lucide-react";

import { INVENTORY_PERMISSIONS } from "@/features/inventory/public-api";
import { AppShell } from "@/shared/ui";

import { resolveErpShellRuntime } from "../../../erp-security.server";
import { createErpShellChrome } from "../../../erp-shell-model";
import { ErpGlobalSearchSlot } from "../../_components/erp-global-search-slot";

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
  { key: "handling-unit-types", label: "HU Types", href: "/erp/inventory/handling-unit-types" },
  { key: "handling-units", label: "Handling Units", href: "/erp/inventory/handling-units" },
  { key: "handling-unit-contents", label: "HU Contents", href: "/erp/inventory/handling-unit-contents" },
  { key: "lots", label: "Lots", href: "/erp/inventory/lots" },
  { key: "serials", label: "Serial Numbers", href: "/erp/inventory/serials" },
  { key: "document-foundation", label: "Document Foundation", href: "/erp/inventory/document-foundation" },
  { key: "ledger", label: "Inventory Ledger", href: "/erp/inventory/ledger" },
  { key: "reservations", label: "Reservations", href: "/erp/inventory/reservations" },
  { key: "reorder-rules", label: "Reorder Rules", href: "/erp/inventory/reorder-rules" },
  { key: "events", label: "Event Definitions", href: "/erp/inventory/events" },
  { key: "endpoints", label: "Endpoints", href: "/erp/inventory/endpoints" },
  { key: "routes", label: "Routes", href: "/erp/inventory/routes" },
  { key: "messages", label: "Messages", href: "/erp/inventory/messages" },
  { key: "stockLedger", label: "Stock Ledger (Legacy)", href: "/erp/inventory/stock-ledger" },
  { key: "stockBalances", label: "Stock Balances", href: "/erp/inventory/stock-balances" },
  { key: "postingBatches", label: "Posting Batches", href: "/erp/inventory/posting-batches" },
  { key: "transactions", label: "Transactions", href: "/erp/inventory/transactions" },
  { key: "warehouseExecution", label: "Warehouse Execution", href: "/erp/inventory/warehouse" },
  { key: "stockAdjustment", label: "Stock Adjustment", href: "/erp/inventory/stock-adjustment/new" },
  { key: "warehouseTransfer", label: "Warehouse Transfer", href: "/erp/inventory/warehouse/warehouse-transfer" },
  { key: "goodsReceipt", label: "Goods Receipt", href: "/erp/inventory/warehouse/goods-receipt" },
  { key: "goodsIssue", label: "Goods Issue", href: "/erp/inventory/warehouse/goods-issue" },
  { key: "cycleCount", label: "Cycle Count", href: "/erp/inventory/warehouse/cycle-count" },
];

export async function InventoryShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  const runtime = await resolveErpShellRuntime({
    appKey: "inventory",
    permission: INVENTORY_PERMISSIONS.productsView,
  });

  return (
    <AppShell
      {...createErpShellChrome("inventory", runtime)}
      breadcrumbs={[
        { label: "Apps", href: "/erp", messageKey: "shell.apps.label" },
        { label: "Inventory", href: "/erp/inventory", messageKey: "apps.inventory" },
      ]}
      globalSearchSlot={<ErpGlobalSearchSlot activePath="/erp/inventory" runtime={runtime} />}
      workspace={{ key: "inventory", name: "Inventory", icon: <Boxes className="size-4" /> }}
      workspaceNav={inventoryItems.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      {children}
    </AppShell>
  );
}

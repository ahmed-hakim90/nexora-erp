import type { ReactNode } from "react";

import { AppShell } from "@/shared/ui";

const inventoryItems = [
  { key: "overview", label: "Overview", href: "/erp/inventory" },
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

export function InventoryShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: string;
  children: ReactNode;
}>) {
  return (
    <AppShell
      activeWorkspaceKey="erp"
      breadcrumbs={[{ label: "ERP Workspace", href: "/erp" }, { label: "Inventory" }]}
      sidebarGroups={[
        {
          key: "inventory",
          label: "Inventory",
          items: inventoryItems.map((item) => ({ ...item, isActive: item.key === activeKey })),
        },
      ]}
      workspaceOptions={[{ key: "erp", label: "ERP Workspace" }]}
    >
      {children}
    </AppShell>
  );
}

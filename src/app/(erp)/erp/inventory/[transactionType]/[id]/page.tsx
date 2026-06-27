import { getInventoryTransaction } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryShell } from "../../_components/inventory-shell";
import { getTransactionTypeConfig, InventoryTransactionDetailPage } from "../../_components/transaction-pages";

export default async function InventoryTransactionDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ id: string; transactionType: string }>;
}>) {
  const { id, transactionType } = await params;
  const config = getTransactionTypeConfig(transactionType);
  const detail = await getInventoryTransaction(id);

  return (
    <InventoryShell activeKey={config.activeKey}>
      <InventoryTransactionDetailPage detail={detail} />
    </InventoryShell>
  );
}

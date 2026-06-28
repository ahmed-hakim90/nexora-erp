import { isInventoryFoundationResourceKey } from "@/features/inventory/public-api";
import { getInventoryFoundationRecord } from "@/features/inventory/routes/loaders/inventory-foundation.loader";
import { getInventoryTransaction } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryFoundationDetailPage } from "../../_components/inventory-foundation-pages";
import { InventoryShell } from "../../_components/inventory-shell";
import { getTransactionTypeConfig, InventoryTransactionDetailPage } from "../../_components/transaction-pages";

export default async function InventoryTransactionDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ id: string; transactionType: string }>;
}>) {
  const { id, transactionType } = await params;

  if (isInventoryFoundationResourceKey(transactionType)) {
    const detail = await getInventoryFoundationRecord(transactionType, id);

    return (
      <InventoryShell activeKey={transactionType}>
        <InventoryFoundationDetailPage descriptor={detail.descriptor} lookups={detail.lookups} record={detail.record} />
      </InventoryShell>
    );
  }

  const config = getTransactionTypeConfig(transactionType);
  const detail = await getInventoryTransaction(id);

  return (
    <InventoryShell activeKey={config.activeKey}>
      <InventoryTransactionDetailPage detail={detail} />
    </InventoryShell>
  );
}

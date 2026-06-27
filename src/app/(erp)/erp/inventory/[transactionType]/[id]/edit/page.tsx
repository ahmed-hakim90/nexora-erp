import { getInventoryTransaction } from "@/features/inventory/routes/loaders/inventory.loader";

import { InventoryShell } from "../../../_components/inventory-shell";
import { getTransactionTypeConfig, InventoryTransactionFormPage } from "../../../_components/transaction-pages";

export default async function EditInventoryTransactionPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; transactionType: string }>;
}>) {
  const { id, transactionType } = await params;
  const config = getTransactionTypeConfig(transactionType);
  const detail = await getInventoryTransaction(id);

  return (
    <InventoryShell activeKey={config.activeKey}>
      <InventoryTransactionFormPage detail={detail} mode="edit" slug={transactionType} />
    </InventoryShell>
  );
}

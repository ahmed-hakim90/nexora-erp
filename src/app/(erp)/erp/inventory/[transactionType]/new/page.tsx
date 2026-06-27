import { InventoryShell } from "../../_components/inventory-shell";
import { getTransactionTypeConfig, InventoryTransactionFormPage } from "../../_components/transaction-pages";

export default async function NewInventoryTransactionPage({
  params,
}: Readonly<{
  params: Promise<{ transactionType: string }>;
}>) {
  const { transactionType } = await params;
  const config = getTransactionTypeConfig(transactionType);

  return (
    <InventoryShell activeKey={config.activeKey}>
      <InventoryTransactionFormPage mode="create" slug={transactionType} />
    </InventoryShell>
  );
}

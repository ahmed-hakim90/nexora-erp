import { redirect } from "next/navigation";

import { getInventoryFoundationEntity, isInventoryFoundationResourceKey } from "@/features/inventory/public-api";
import { getTransactionTypeConfig } from "../../_components/transaction-pages";

export default async function NewInventoryTransactionPage({
  params,
}: Readonly<{
  params: Promise<{ transactionType: string }>;
}>) {
  const { transactionType } = await params;

  if (isInventoryFoundationResourceKey(transactionType)) {
    const descriptor = getInventoryFoundationEntity(transactionType);
    redirect(`${descriptor.basePath}?create=1`);
  }

  getTransactionTypeConfig(transactionType);
  redirect(`/erp/inventory/transactions?create=${transactionType}`);
}

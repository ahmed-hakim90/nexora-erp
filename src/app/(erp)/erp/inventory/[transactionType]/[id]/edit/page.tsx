import { redirect } from "next/navigation";

import { isInventoryFoundationResourceKey } from "@/features/inventory/public-api";
import { getInventoryFoundationEntity } from "@/features/inventory/public-api";

import { getTransactionTypeConfig } from "../../../_components/transaction-pages";

export default async function EditInventoryTransactionPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; transactionType: string }>;
}>) {
  const { id, transactionType } = await params;

  if (isInventoryFoundationResourceKey(transactionType)) {
    const descriptor = getInventoryFoundationEntity(transactionType);
    redirect(`${descriptor.basePath}?edit=${encodeURIComponent(id)}`);
  }

  getTransactionTypeConfig(transactionType);
  redirect(`/erp/inventory/transactions?transactionType=${transactionType}&edit=${encodeURIComponent(id)}`);
}

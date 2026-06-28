import { notFound } from "next/navigation";

import { isInventoryFoundationResourceKey } from "@/features/inventory/public-api";
import { getInventoryFoundationRecord, loadInventoryFoundationWorkspace } from "@/features/inventory/routes/loaders/inventory-foundation.loader";

import { InventoryFoundationListPage } from "../_components/inventory-foundation-pages";
import { InventoryShell } from "../_components/inventory-shell";

export default async function InventoryFoundationResourcePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ transactionType: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const { transactionType } = await params;
  if (!isInventoryFoundationResourceKey(transactionType)) notFound();

  const queryParams = (await searchParams) ?? {};
  const workspace = await loadInventoryFoundationWorkspace(transactionType, queryParams);
  let selectedRecord = queryParams.edit ? workspace.records.find((record) => String(record.id) === queryParams.edit) : undefined;
  if (queryParams.edit && !selectedRecord) {
    const detail = await getInventoryFoundationRecord(transactionType, queryParams.edit);
    selectedRecord = detail.record;
  }
  const closeHref = (() => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value && key !== "create" && key !== "edit") next.set(key, value);
    }
    const query = next.toString();
    return query ? `${workspace.descriptor.basePath}?${query}` : workspace.descriptor.basePath;
  })();

  return (
    <InventoryShell activeKey={transactionType}>
      <InventoryFoundationListPage closeHref={closeHref} query={queryParams} selectedRecord={selectedRecord} workspace={workspace} />
    </InventoryShell>
  );
}

import Link from "next/link";

import { formatLotLabel } from "@/features/inventory/public-api";
import { getInventoryLotRecord, loadInventoryLotsWorkspace } from "@/features/inventory/routes/loaders/inventory-lots.loader";
import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { LotRecordModalLauncher } from "./lot-record-panel";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/inventory/lots?${query}` : "/erp/inventory/lots";
}

export default async function InventoryLotsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const workspace = await loadInventoryLotsWorkspace(params);
  let selectedLot = params.edit ? workspace.records.find((record) => record.id === params.edit) : undefined;
  if (params.edit && !selectedLot) {
    selectedLot = (await getInventoryLotRecord(params.edit)) ?? undefined;
  }
  const closeHref = buildHref(params, { create: null, edit: null });

  return (
    <InventoryShell activeKey="lots">
      <PageContainer>
        <PageHeader
          description="Lot and batch identity foundation. No quantities, balances, movements, or reservations are stored here."
          title="Lots"
        >
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { create: "1", edit: null })}>
              Create Lot
            </Link>
          </PageActions>
        </PageHeader>
        <PageContent>
          <EnterpriseDataTable
            columns={[
              {
                header: "Lot",
                key: "label",
                render: (record) => formatLotLabel({
                  lifecycleState: record.lifecycleState,
                  lotNumber: record.lotNumber,
                  productName: record.productLabel.split(" — ").slice(1).join(" — ") || record.productLabel,
                  qcStatus: record.qcStatus,
                  sourceType: record.sourceType,
                }),
              },
              { header: "Source", key: "sourceType", render: (record) => record.sourceType.replaceAll("_", " ") },
              { header: "QC", key: "qcStatus", render: (record) => record.qcStatus.replaceAll("_", " ") },
              { header: "Lifecycle", key: "lifecycleState", render: (record) => record.lifecycleState.replaceAll("_", " ") },
              { header: "Expiry", key: "expiryDate", render: (record) => record.expiryDate ?? "-" },
              {
                header: "Actions",
                key: "actions",
                render: (record) => (
                  <Link className="text-sm underline" href={buildHref(params, { edit: record.id, create: null })}>
                    Edit
                  </Link>
                ),
              },
            ]}
            emptyMessage="No lots found."
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", nextCursor: workspace.nextCursor, pageSize: workspace.pageSize }}
            records={workspace.records}
          />
        </PageContent>
        {params.create ? (
          <LotRecordModalLauncher autoOpen closeHref={closeHref} mode="create" workspace={workspace} />
        ) : null}
        {selectedLot ? (
          <LotRecordModalLauncher autoOpen closeHref={closeHref} lot={selectedLot} mode="edit" workspace={workspace} />
        ) : null}
      </PageContainer>
    </InventoryShell>
  );
}

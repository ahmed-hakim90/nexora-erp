import Link from "next/link";

import { loadInventoryLedgerWorkspace } from "@/features/inventory/routes/loaders/inventory-ledger.loader";
import { DateRangeFilterInput, EnterpriseDataTable, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) next.set(key, value);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/inventory/ledger?${query}` : "/erp/inventory/ledger";
}

function formatLabel(value: string | null | undefined) {
  return value && value.length > 0 ? value : "-";
}

export default async function InventoryLedgerPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const workspace = await loadInventoryLedgerWorkspace(params);

  return (
    <InventoryShell activeKey="ledger">
      <PageContainer>
        <PageHeader
          description="Read-only immutable inventory ledger history. Entries are append-only and corrected through reversal entries only."
          title="Inventory Ledger"
        />
        <PageContent>
          <div className="space-y-4">
          <form className="grid gap-3 rounded-lg border p-4 md:grid-cols-4" method="get">
            <label className="block space-y-1 text-sm">
              <span>Search</span>
              <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.search ?? ""} name="search" placeholder="Document, correlation, movement" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Movement Type</span>
              <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.movementType ?? ""} name="movementType" placeholder="goods_receipt" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Business Module</span>
              <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.businessModule ?? ""} name="businessModule" placeholder="inventory" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Correlation ID</span>
              <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.correlationId ?? ""} name="correlationId" />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span>Date range</span>
              <DateRangeFilterInput defaultValueFrom={params.fromDate ?? ""} defaultValueTo={params.toDate ?? ""} nameFrom="fromDate" nameTo="toDate" />
            </label>
            <div className="flex items-end gap-2 md:col-span-2">
              <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">Apply Filters</button>
              <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/ledger">Reset</Link>
            </div>
          </form>

          <EnterpriseDataTable
            columns={[
              {
                header: "Posted",
                key: "postingTimestamp",
                render: (record) => new Date(record.postingTimestamp).toLocaleString(),
              },
              {
                header: "Movement",
                key: "movement",
                render: (record) => `${record.movementType.replaceAll("_", " ")} · ${record.movementDirection}`,
              },
              {
                header: "Object",
                key: "object",
                render: (record) => record.objectLabelSnapshot
                  ?? record.serialLabel
                  ?? record.lotLabel
                  ?? record.productLabel
                  ?? record.handlingUnitLabel
                  ?? record.inventoryObjectType.replaceAll("_", " "),
              },
              {
                header: "Warehouse / Location",
                key: "location",
                render: (record) => `${formatLabel(record.warehouseLabel)} / ${formatLabel(record.locationLabel)}`,
              },
              {
                header: "Document",
                key: "document",
                render: (record) => record.documentNumberSnapshot ?? record.documentType,
              },
              { header: "Delta", key: "quantityDelta", render: (record) => String(record.quantityDelta) },
              { header: "Status", key: "inventoryStatus", render: (record) => formatLabel(record.inventoryStatus) },
              { header: "Event", key: "eventType", render: (record) => record.eventType },
              { header: "Module", key: "businessModule", render: (record) => record.businessModule },
              { header: "Correlation", key: "correlationId", render: (record) => record.correlationId },
            ]}
            emptyMessage="No inventory ledger entries yet. Ledger history is append-only and will appear after posting runtime is enabled."
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", nextCursor: workspace.nextCursor, pageSize: workspace.pageSize }}
            records={workspace.records}
          />
          {workspace.nextCursor ? (
            <div className="flex justify-end">
              <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { cursor: workspace.nextCursor })}>Next Page</Link>
            </div>
          ) : null}
          </div>
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}

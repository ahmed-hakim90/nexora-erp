import Link from "next/link";

import { loadInventoryReservationsWorkspace } from "@/features/inventory/routes/loaders/inventory-reservations.loader";
import { EnterpriseDataTable, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) next.set(key, value);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/inventory/reservations?${query}` : "/erp/inventory/reservations";
}

function formatLabel(value: string | null | undefined) {
  return value && value.length > 0 ? value : "-";
}

export default async function InventoryReservationsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const workspace = await loadInventoryReservationsWorkspace(params);

  return (
    <InventoryShell activeKey="reservations">
      <PageContainer>
        <PageHeader
          description="Manage inventory reservation demand against projected availability. Reservations do not change physical stock or post to the ledger."
          title="Inventory Reservations"
        />
        <PageContent>
          <div className="space-y-4">
            <form className="grid gap-3 rounded-lg border p-4 md:grid-cols-4" method="get">
              <label className="block space-y-1 text-sm">
                <span>Search</span>
                <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.search ?? ""} name="search" placeholder="Reservation number, document, correlation" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Source Module</span>
                <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.sourceModule ?? ""} name="sourceModule" placeholder="sales" />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Demand Status</span>
                <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={params.demandStatus ?? ""} name="demandStatus" placeholder="reserved" />
              </label>
              <div className="flex items-end gap-2">
                <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" type="submit">Apply Filters</button>
                <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/reservations">Reset</Link>
              </div>
            </form>

            <EnterpriseDataTable
              columns={[
                { header: "Reservation", key: "reservationNumber", render: (record) => record.reservationNumber },
                { header: "Source Module", key: "sourceModule", render: (record) => record.sourceModule.replaceAll("_", " ") },
                { header: "Status", key: "demandStatus", render: (record) => formatLabel(record.demandStatus ?? record.status) },
                { header: "Requested", key: "requestedQuantity", render: (record) => String(record.requestedQuantity) },
                { header: "Reserved", key: "reservedQuantity", render: (record) => String(record.reservedQuantity) },
                { header: "Shortage", key: "shortageQuantity", render: (record) => String(record.shortageQuantity) },
                { header: "Priority", key: "priority", render: (record) => String(record.priority) },
                { header: "Expires", key: "expiresAt", render: (record) => record.expiresAt ? new Date(record.expiresAt).toLocaleString() : "-" },
                { header: "Source Document", key: "document", render: (record) => formatLabel(record.sourceDocumentReference ?? record.sourceDocumentType) },
                { header: "Correlation", key: "correlationId", render: (record) => record.correlationId },
              ]}
              emptyMessage="No inventory reservations yet. Reservation demand is allocated against projected availability only."
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

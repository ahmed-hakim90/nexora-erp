import Link from "next/link";

import { formatSerialLabel } from "@/features/inventory/public-api";
import { getInventorySerialRecord, loadInventorySerialsWorkspace } from "@/features/inventory/routes/loaders/inventory-serials.loader";
import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { SerialRecordModalLauncher } from "./serial-record-panel";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) next.set(key, value);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/inventory/serials?${query}` : "/erp/inventory/serials";
}

export default async function InventorySerialsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const workspace = await loadInventorySerialsWorkspace(params);
  let selectedSerial = params.edit ? workspace.records.find((record) => record.id === params.edit) : undefined;
  if (params.edit && !selectedSerial) selectedSerial = (await getInventorySerialRecord(params.edit)) ?? undefined;
  const closeHref = buildHref(params, { create: null, edit: null });

  return (
    <InventoryShell activeKey="serials">
      <PageContainer>
        <PageHeader description="Serial Engine identity foundation. No quantities, movements, generation runtime, or warranty/service runtime." title="Serial Numbers">
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { create: "1", edit: null })}>Create Serial</Link>
          </PageActions>
        </PageHeader>
        <PageContent>
          <EnterpriseDataTable
            columns={[
              {
                header: "Serial",
                key: "label",
                render: (record) => formatSerialLabel({
                  lifecycleState: record.lifecycleState,
                  lotNumber: record.lotLabel,
                  productName: record.productLabel.split(" — ").slice(1).join(" — ") || record.productLabel,
                  serialNumber: record.serialNumber,
                  serialSource: record.serialSource,
                }),
              },
              { header: "Source", key: "serialSource", render: (record) => record.serialSource.replaceAll("_", " ") },
              { header: "Lifecycle", key: "lifecycleState", render: (record) => record.lifecycleState.replaceAll("_", " ") },
              { header: "Verification", key: "verificationStatus", render: (record) => record.verificationStatus.replaceAll("_", " ") },
              {
                header: "Actions",
                key: "actions",
                render: (record) => <Link className="text-sm underline" href={buildHref(params, { edit: record.id, create: null })}>Edit</Link>,
              },
            ]}
            emptyMessage="No serial numbers found."
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", nextCursor: workspace.nextCursor, pageSize: workspace.pageSize }}
            records={workspace.records}
          />
        </PageContent>
        {params.create ? <SerialRecordModalLauncher autoOpen closeHref={closeHref} mode="create" workspace={workspace} /> : null}
        {selectedSerial ? <SerialRecordModalLauncher autoOpen closeHref={closeHref} mode="edit" serial={selectedSerial} workspace={workspace} /> : null}
      </PageContainer>
    </InventoryShell>
  );
}

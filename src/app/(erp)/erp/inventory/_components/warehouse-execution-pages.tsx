import Link from "next/link";

import { INVENTORY_PERMISSIONS } from "@/features/inventory/public-api";
import { createInventoryCatalogLookupService } from "@/features/inventory/routes/service-factory";
import type { WarehouseFlowKey } from "@/platform/operator-experience/warehouse-execution";
import { WAREHOUSE_EXECUTION_FLOWS } from "@/platform/operator-experience/warehouse-execution";
import { PageContainer, PageContent, PageHeader } from "@/shared/ui";
import { WarehouseScanReadinessPanel } from "@/shared/ui/operator-experience/warehouse-scan-readiness-panel";
import { WarehouseScannerWorkspace } from "@/shared/ui/operator-experience/warehouse-scanner-workspace";

import { requireErpRouteAccess } from "../../../erp-security.server";
import { InventoryShell } from "./inventory-shell";

export async function loadWarehouseExecutionCatalog() {
  const service = await createInventoryCatalogLookupService();
  return service.loadWarehouseExecutionCatalog();
}

export function isWarehouseFlowKey(value: string): value is WarehouseFlowKey {
  return value in WAREHOUSE_EXECUTION_FLOWS;
}

export async function WarehouseExecutionHubPage() {
  await requireErpRouteAccess({
    appKey: "inventory",
    permission: INVENTORY_PERMISSIONS.movementsView,
  });
  const flows = Object.values(WAREHOUSE_EXECUTION_FLOWS);
  return (
    <InventoryShell activeKey="warehouseExecution">
      <PageContainer>
        <PageHeader description="Scanner-first warehouse tasks for goods receipt, issue, transfer, and cycle count." title="Warehouse Execution" />
        <PageContent>
          <div className="grid gap-3 md:grid-cols-2">
            {flows.map((flow) => (
              <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href={`/erp/inventory/warehouse/${flow.key}`} key={flow.key}>
                {flow.label}
                <p className="mt-1 text-sm font-normal text-muted-foreground">{flow.description}</p>
              </Link>
            ))}
            <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href="/erp/inventory/warehouse/scan/product">
              Product Scan
            </Link>
            <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href="/erp/inventory/warehouse/scan/location">
              Location Scan
            </Link>
            <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href="/erp/inventory/warehouse/scan/lot">
              Lot Scan
            </Link>
            <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href="/erp/inventory/warehouse/scan/serial">
              Serial Scan
            </Link>
            <Link className="min-h-14 rounded-2xl border bg-[hsl(var(--surface))] p-4 text-base font-medium shadow-sm transition hover:border-[hsl(var(--accent))]" href="/erp/inventory/warehouse/scan/document">
              Document Scan
            </Link>
          </div>
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}

export async function WarehouseFlowExecutionPage({ flowKey }: Readonly<{ flowKey: WarehouseFlowKey }>) {
  const [{ context, runtime }, catalog] = await Promise.all([
    requireErpRouteAccess({
      appKey: "inventory",
      permission: INVENTORY_PERMISSIONS.transactionCreate,
    }),
    loadWarehouseExecutionCatalog(),
  ]);
  const flow = WAREHOUSE_EXECUTION_FLOWS[flowKey];
  const defaultWarehouse = catalog.warehouses[0];

  return (
    <InventoryShell activeKey="warehouseExecution">
      <PageContainer>
        <PageHeader description={flow.description} title={flow.label} />
        <PageContent>
          <WarehouseScannerWorkspace
            branchId={context.branchId}
            branchName={runtime.branchName}
            catalog={catalog}
            companyId={context.companyId}
            companyName={runtime.companyName}
            defaultWarehouseId={defaultWarehouse?.id ?? null}
            defaultWarehouseLabel={defaultWarehouse?.label ?? null}
            flowKey={flowKey}
          />
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}

export async function WarehouseScanReadinessPage({ target }: Readonly<{ target: "product" | "location" | "lot" | "serial" | "document" }>) {
  await requireErpRouteAccess({
    appKey: "inventory",
    permission: INVENTORY_PERMISSIONS.movementsView,
  });
  const catalog = await loadWarehouseExecutionCatalog();
  const labels: Record<typeof target, string> = {
    document: "Document Scan",
    location: "Location Scan",
    lot: "Lot Scan",
    product: "Product Scan",
    serial: "Serial Scan",
  };

  return (
    <InventoryShell activeKey="warehouseExecution">
      <PageContainer>
        <PageHeader description="Scan readiness check with operator-safe feedback and recent scan history." title={labels[target]} />
        <PageContent>
          <WarehouseScanReadinessPanel catalog={catalog} target={target} />
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}

import Link from "next/link";
import Image from "next/image";

import {
  loadInventoryProductsWorkspace,
  type InventoryProductRecord,
  type InventoryProductWorkspaceData,
} from "@/features/inventory/routes/loaders/inventory-products.loader";
import { Button, EnterpriseDataTable, PageActions, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { ProductRecordModalLauncher } from "./product-record-panel";

const statusOptions = ["draft", "active", "inactive", "locked", "archived"] as const;
const onlineStatusOptions = ["draft", "ready", "published", "hidden", "archived"] as const;
const kindOptions = ["stockable", "consumable", "service", "asset", "rental", "kit"] as const;
const trackingOptions = ["none", "quantity_only", "lot", "serial", "lot_serial"] as const;
const densityOptions = ["Comfortable", "Compact", "Spacious"] as const;
const sortOptions = [
  { label: "Last updated", value: "updated" },
  { label: "Product name", value: "name" },
  { label: "SKU", value: "sku" },
  { label: "Status", value: "status" },
] as const;

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
  return query ? `/erp/inventory/products?${query}` : "/erp/inventory/products";
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value ?? 0);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function productInitials(product: Pick<InventoryProductRecord, "name" | "sku">) {
  const fromName = product.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return (fromName || product.sku.slice(0, 2)).toUpperCase();
}

function buildProductKpis(records: readonly InventoryProductRecord[]) {
  const active = records.filter((record) => record.status === "active").length;
  const inactive = records.filter((record) => record.status === "inactive" || record.status === "archived").length;
  const tracked = records.filter((record) => record.trackingMode !== "none" || record.hasLotTracking || record.hasSerialTracking).length;
  const packaged = records.filter((record) => record.packagingInnerBoxQty || record.packagingCartonQty || record.packagingPalletCartonQty).length;
  const warrantyReady = records.filter((record) => record.warrantyEligible).length;

  return [
    { label: "Total Products", value: records.length, detail: `${records.length} loaded in this view` },
    { label: "Active Products", value: active, detail: "Available for operations" },
    { label: "Tracked Products", value: tracked, detail: "Quantity, lot, serial, or lot + serial policy" },
    { label: "Packaged Products", value: packaged, detail: "Inner box, carton, or pallet policy" },
    { label: "Warranty Ready", value: warrantyReady, detail: "Metadata prepared for future warranty" },
    { label: "Inactive Products", value: inactive, detail: "Inactive or archived" },
  ] as const;
}

export default async function InventoryProductsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let data: InventoryProductWorkspaceData = {
    branches: [],
    categories: [],
    currencies: [],
    locations: [],
    nextCursor: null,
    pageSize: 25,
    records: [],
    subcategories: [],
    suppliers: [],
    taxDefinitions: [],
    uoms: [],
    warehouses: [],
  };
  let errorMessage: string | undefined;

  try {
    data = await loadInventoryProductsWorkspace(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load inventory products.";
  }

  const selectedProduct = params.edit ? data.records.find((product) => product.id === params.edit) : undefined;
  const selectedIndex = selectedProduct ? data.records.findIndex((product) => product.id === selectedProduct.id) : -1;
  const previousProduct = selectedIndex > 0 ? data.records[selectedIndex - 1] : undefined;
  const nextProduct = selectedIndex >= 0 ? data.records[selectedIndex + 1] : undefined;
  const closeHref = buildHref(params, { create: null, edit: null });
  const kpis = buildProductKpis(data.records);

  return (
    <InventoryShell activeKey="products">
      <PageContainer className="max-w-[100rem]">
        <PageHeader
          description={`${data.records.length} products loaded. Manage product master definitions, tracking policy, packaging policy, inventory behavior contracts, warranty metadata, and search readiness.`}
          title="Product Master"
        >
          <PageActions>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
              href={buildHref(params, { create: "1", edit: null })}
            >
              New Product
            </Link>
            <button className="rounded-md border px-3 py-2 text-sm" type="button">Import</button>
            <button className="rounded-md border px-3 py-2 text-sm" type="button">Export</button>
          </PageActions>
        </PageHeader>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <article className="rounded-md border bg-[hsl(var(--surface))] p-4" key={kpi.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{formatNumber(kpi.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p>
            </article>
          ))}
        </section>

        <PageFilters>
          <form className="grid gap-3 lg:grid-cols-[minmax(16rem,2fr)_repeat(5,minmax(9rem,1fr))] xl:grid-cols-[minmax(18rem,2fr)_repeat(7,minmax(9rem,1fr))]" action="/erp/inventory/products">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={params.search ?? ""}
              name="search"
              placeholder="Search SKU, barcode, internal name, commercial name, keywords"
            />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.categoryId ?? ""} name="categoryId">
              <option value="">All categories</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.productKind ?? ""} name="productKind">
              <option value="">All product types</option>
              {kindOptions.map((kind) => (
                <option key={kind} value={kind}>{formatLabel(kind)}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.status ?? ""} name="status">
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.trackingMode ?? ""} name="trackingMode">
              <option value="">All tracking modes</option>
              {trackingOptions.map((mode) => (
                <option key={mode} value={mode}>{formatLabel(mode)}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.warehouseId ?? ""} name="warehouseId">
              <option value="">All warehouses</option>
              {data.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.label}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.onlineStatus ?? ""} name="onlineStatus">
              <option value="">All online statuses</option>
              {onlineStatusOptions.map((status) => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.sort ?? "updated"} name="sort">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.density ?? "Comfortable"} name="density">
              {densityOptions.map((density) => (
                <option key={density} value={density}>{density}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.stockable === "true"} name="stockable" type="checkbox" value="true" /> Stockable</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasVariants === "true"} name="hasVariants" type="checkbox" value="true" /> Variants</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasLotTracking === "true"} name="hasLotTracking" type="checkbox" value="true" /> Lot</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasSerialTracking === "true"} name="hasSerialTracking" type="checkbox" value="true" /> Serial</label>
            <Button type="submit" variant="primary">
              Apply Filters
            </Button>
            <Link className="rounded-md border px-3 py-2 text-center text-sm" href="/erp/inventory/products">Reset</Link>
          </form>
        </PageFilters>

        <PageContent>
          <EnterpriseDataTable<InventoryProductRecord>
            columns={[
              { key: "image", header: "Image", render: (record) => record.coverImageUrl ? <Image alt={record.name} className="size-10 rounded-md border object-cover" height={40} src={record.coverImageUrl} width={40} /> : <div className="grid size-10 place-items-center rounded-md border bg-[hsl(var(--muted))] text-xs font-semibold text-muted-foreground">{productInitials(record)}</div> },
              { key: "sku", header: "SKU", render: (record) => <span className="font-mono text-xs font-semibold">{record.sku}</span> },
              { key: "name", header: "Product Name", render: (record) => (
                <div className="min-w-44">
                  <Link className="font-medium text-[hsl(var(--accent))] hover:underline" href={buildHref(params, { edit: record.id })}>{record.name}</Link>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{record.description ?? record.onlineTitle ?? "No description"}</p>
                </div>
              ) },
              { key: "category", header: "Category", render: (record) => record.categoryLabel ?? "—" },
              { key: "kind", header: "Type", render: (record) => formatLabel(record.productKind) },
              { key: "uom", header: "Base UOM", render: (record) => record.baseUomLabel ?? "—" },
              { key: "tracking", header: "Tracking", render: (record) => formatLabel(record.trackingMode) },
              { key: "packaging", header: "Packaging", render: (record) => record.packagingPalletCartonQty ? `Pallet (${record.packagingPalletCartonQty} cartons)` : record.packagingCartonQty ? `Carton (${record.packagingCartonQty})` : record.packagingInnerBoxQty ? `Inner Box (${record.packagingInnerBoxQty})` : "Loose Units" },
              { key: "inventoryPolicy", header: "Inventory Policy", render: (record) => [record.requiresReservation ? "Reservation" : null, record.requiresQcBeforeRelease ? "QC" : null, record.allowNegativeStock ? "Negative stock" : null, record.cycleCountClass ? `Class ${record.cycleCountClass}` : null].filter(Boolean).join(" / ") || "Standard" },
              { key: "warranty", header: "Warranty", render: (record) => record.warrantyEligible ? `${record.warrantyDurationDays ?? "Configured"} days` : "Not eligible" },
              { key: "status", header: "Status", render: (record) => <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{formatLabel(record.status)}</span> },
              { key: "updated", header: "Updated", render: (record) => new Date(record.updatedAt).toLocaleDateString() },
            ]}
            bulkActions={[
              { key: "archive", label: "Archive selected", isDisabled: true },
              { key: "export-selected", label: "Export selected", isDisabled: true },
            ]}
            columnVisibilityControls={<button className="rounded-md border px-3 py-2 text-sm" type="button">Column Chooser</button>}
            emptyMessage="No products match this view. Create a product or reset filters to review the full product catalog."
            errorMessage={errorMessage}
            exportAction={<button className="rounded-md border px-3 py-2 text-sm" type="button">Export</button>}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: data.pageSize, nextCursor: data.nextCursor }}
            printAction={<button className="rounded-md border px-3 py-2 text-sm" type="button">Print Label</button>}
            records={data.records}
            rowActions={(record) => [
              { key: "open", label: "Open", href: buildHref(params, { edit: record.id }) },
              { key: "duplicate", label: "Duplicate", isDisabled: true },
              { key: "policy", label: "Review Policy", href: buildHref(params, { edit: record.id }) },
            ]}
            savedViews={[
              { key: "all", label: "All Products", isActive: !params.status && !params.hasLotTracking && !params.hasSerialTracking },
              { key: "active", label: "Active", isActive: params.status === "active" },
              { key: "tracked", label: "Tracked", isActive: params.hasLotTracking === "true" || params.hasSerialTracking === "true" },
              { key: "variants", label: "Variants", isActive: params.hasVariants === "true" },
            ]}
            state={{
              activeSavedViewKey: params.view,
              filters: [
                params.categoryId ? { key: "category", label: "Category", value: data.categories.find((category) => category.id === params.categoryId)?.label ?? "Selected" } : null,
                params.productKind ? { key: "type", label: "Type", value: params.productKind } : null,
                params.status ? { key: "status", label: "Status", value: params.status } : null,
                params.onlineStatus ? { key: "onlineStatus", label: "Online", value: params.onlineStatus } : null,
                params.trackingMode ? { key: "tracking", label: "Tracking", value: params.trackingMode } : null,
              ].filter((filter): filter is { key: string; label: string; value: string } => filter !== null),
              globalSearch: params.search,
              sorting: [{ columnKey: params.sort ?? "updated", direction: "desc" }],
            }}
          />
        </PageContent>

        {data.nextCursor ? (
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { cursor: data.nextCursor })}>
              Next Page
            </Link>
          </PageActions>
        ) : null}

        {selectedProduct ? (
          <ProductRecordModalLauncher
            autoOpen
            closeHref={closeHref}
            data={data}
            nextHref={nextProduct ? buildHref(params, { edit: nextProduct.id }) : undefined}
            previousHref={previousProduct ? buildHref(params, { edit: previousProduct.id }) : undefined}
            product={selectedProduct}
          />
        ) : null}

        {params.create ? (
          <ProductRecordModalLauncher autoOpen closeHref={closeHref} data={data} />
        ) : null}
      </PageContainer>
    </InventoryShell>
  );
}

import Link from "next/link";
import Image from "next/image";

import {
  loadInventoryProductsWorkspace,
  type InventoryProductRecord,
  type InventoryProductWorkspaceData,
} from "@/features/inventory/routes/loaders/inventory-products.loader";
import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";
import { ProductRecordModalLauncher } from "./product-record-panel";

const statusOptions = ["draft", "active", "inactive", "locked", "archived"] as const;
const onlineStatusOptions = ["draft", "ready", "published", "hidden", "archived"] as const;
const kindOptions = ["stockable", "consumable", "service", "asset", "rental", "kit"] as const;
const trackingOptions = ["none", "lot", "serial"] as const;
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

  return (
    <InventoryShell activeKey="products">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Define internal, inventory, pricing-readiness, online, media, and audit data for canonical inventory products."
          title="Product Master"
        >
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { create: "1", edit: null })}>
              New Product
            </Link>
          </PageActions>
        </PageHeader>

        <PageFilters>
          <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-6" action="/erp/inventory/products">
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={params.search ?? ""}
              name="search"
              placeholder="Search SKU, barcode, name, online title, category"
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
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.status ?? ""} name="status">
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.onlineStatus ?? ""} name="onlineStatus">
              <option value="">All online statuses</option>
              {onlineStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.trackingMode ?? ""} name="trackingMode">
              <option value="">All tracking modes</option>
              {trackingOptions.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.stockable === "true"} name="stockable" type="checkbox" value="true" /> Stockable</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.sellable === "true"} name="sellable" type="checkbox" value="true" /> Sellable</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.purchasable === "true"} name="purchasable" type="checkbox" value="true" /> Purchasable</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasVariants === "true"} name="hasVariants" type="checkbox" value="true" /> Has variants</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasSerialTracking === "true"} name="hasSerialTracking" type="checkbox" value="true" /> Has serial</label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><input defaultChecked={params.hasLotTracking === "true"} name="hasLotTracking" type="checkbox" value="true" /> Has lot</label>
            <button className="rounded-md border bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))]" type="submit">
              Apply Filters
            </button>
          </form>
        </PageFilters>

        <PageContent>
          <EnterpriseDataTable<InventoryProductRecord>
            columns={[
              { key: "image", header: "Image", render: (record) => record.coverImageUrl ? <Image alt={record.name} className="size-10 rounded-md border object-cover" height={40} src={record.coverImageUrl} width={40} /> : <div className="grid size-10 place-items-center rounded-md border bg-[hsl(var(--muted))] text-xs text-muted-foreground">No img</div> },
              { key: "sku", header: "SKU", render: (record) => record.sku },
              { key: "barcode", header: "Barcode", render: (record) => record.barcode ?? "—" },
              { key: "name", header: "Name", render: (record) => record.name },
              { key: "category", header: "Category", render: (record) => record.categoryLabel ?? "—" },
              { key: "kind", header: "Type", render: (record) => record.productKind },
              { key: "uom", header: "Base UOM", render: (record) => record.baseUomLabel ?? "—" },
              { key: "stockable", header: "Stockable", render: (record) => record.isStockable ? "Yes" : "No" },
              { key: "sellable", header: "Sellable", render: (record) => record.isSellable ? "Yes" : "No" },
              { key: "purchasable", header: "Purchasable", render: (record) => record.isPurchasable ? "Yes" : "No" },
              { key: "online", header: "Online Visible", render: (record) => record.isOnlineVisible ? "Yes" : "No" },
              { key: "status", header: "Status", render: (record) => record.status },
              { key: "updated", header: "Updated", render: (record) => new Date(record.updatedAt).toLocaleDateString() },
            ]}
            emptyMessage="No inventory products found. Create the first product with a real UOM to activate this workspace."
            errorMessage={errorMessage}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: data.pageSize, nextCursor: data.nextCursor }}
            records={data.records}
            rowActions={(record) => [
              { key: "read", label: "Read", href: buildHref(params, { edit: record.id }) },
              { key: "edit", label: "Edit", href: buildHref(params, { edit: record.id }) },
            ]}
            state={{
              filters: [
                params.categoryId ? { key: "category", label: "Category", value: data.categories.find((category) => category.id === params.categoryId)?.label ?? "Selected" } : null,
                params.productKind ? { key: "type", label: "Type", value: params.productKind } : null,
                params.status ? { key: "status", label: "Status", value: params.status } : null,
                params.onlineStatus ? { key: "onlineStatus", label: "Online", value: params.onlineStatus } : null,
                params.trackingMode ? { key: "tracking", label: "Tracking", value: params.trackingMode } : null,
              ].filter((filter): filter is { key: string; label: string; value: string } => filter !== null),
              globalSearch: params.search,
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

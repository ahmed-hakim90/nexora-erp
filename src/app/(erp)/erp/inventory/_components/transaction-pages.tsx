import type { ReactNode } from "react";
import Link from "next/link";

import { ApplicationError } from "@/core/errors";
import {
  cancelInventoryTransactionAction,
  createInventoryTransactionAction,
  postInventoryTransactionAction,
  reverseInventoryTransactionAction,
  submitInventoryTransactionAction,
  updateInventoryTransactionAction,
} from "@/features/inventory/routes/actions/inventory-transactions.actions";
import type {
  InventoryTransactionDetail,
  InventoryTransactionType,
} from "@/features/inventory/public-api";
import { INVENTORY_PERMISSIONS } from "@/features/inventory/public-api";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { EntityLookup, EnterpriseDataTable, FieldGroup, FormGrid, FormSection, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader } from "@/shared/ui";

export const TRANSACTION_TYPE_CONFIGS: Record<
  string,
  { activeKey: string; title: string; type: InventoryTransactionType; description: string }
> = {
  "cycle-count": {
    activeKey: "cycleCount",
    description: "Record counted quantity. Differences become stock adjustments only when explicitly posted.",
    title: "Cycle Count",
    type: "cycle_count",
  },
  "goods-issue": {
    activeKey: "goodsIssue",
    description: "Decrease stock from a source warehouse location through the posting ledger.",
    title: "Goods Issue",
    type: "goods_issue",
  },
  "goods-receipt": {
    activeKey: "goodsReceipt",
    description: "Increase stock into a destination warehouse location through the posting ledger.",
    title: "Goods Receipt",
    type: "goods_receipt",
  },
  "stock-adjustment": {
    activeKey: "stockAdjustment",
    description: "Increase or decrease stock for a required reason through controlled adjustment posting.",
    title: "Stock Adjustment",
    type: "stock_adjustment",
  },
  "warehouse-transfer": {
    activeKey: "warehouseTransfer",
    description: "Move stock between locations with paired out and in entries in the same posting batch.",
    title: "Warehouse Transfer",
    type: "warehouse_transfer",
  },
};

function valueToText(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type LookupOption = Readonly<{ id: string; label: string }>;
type TransactionLookups = Readonly<{
  branches: readonly LookupOption[];
  locations: readonly LookupOption[];
  products: readonly LookupOption[];
  units: readonly LookupOption[];
  warehouses: readonly LookupOption[];
}>;

export async function loadTransactionLookups(): Promise<TransactionLookups> {
  const context = await resolveBranchRequestContext("erp");
  await Promise.all([
    requirePermission({ context, permission: INVENTORY_PERMISSIONS.productsView }),
    requirePermission({ context, permission: INVENTORY_PERMISSIONS.uomsView }),
    requirePermission({ context, permission: INVENTORY_PERMISSIONS.warehousesView }),
    requirePermission({ context, permission: INVENTORY_PERMISSIONS.locationsView }),
  ]);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [branchResult, productResult, unitResult, warehouseResult, locationResult] = await Promise.all([
    supabase.from("branches").select("id, code, name").eq("tenant_id", context.tenantId).is("deleted_at", null).order("name", { ascending: true }),
    supabase.from("inventory_products").select("id, sku, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name", { ascending: true }),
    supabase.from("inventory_uoms").select("id, uom_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name", { ascending: true }),
    supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("branch_id", context.branchId).is("deleted_at", null).order("name", { ascending: true }),
    supabase.from("inventory_locations").select("id, location_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("branch_id", context.branchId).is("deleted_at", null).order("name", { ascending: true }),
  ]);

  for (const [result, message] of [
    [branchResult, "Could not load branch lookup."],
    [productResult, "Could not load product lookup."],
    [unitResult, "Could not load UOM lookup."],
    [warehouseResult, "Could not load warehouse lookup."],
    [locationResult, "Could not load location lookup."],
  ] as const) {
    if (result.error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }

  return {
    branches: (branchResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.code as string} — ${row.name as string}` })),
    locations: (locationResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.location_key as string} — ${row.name as string}` })),
    products: (productResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.sku as string} — ${row.name as string}` })),
    units: (unitResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.uom_key as string} — ${row.name as string}` })),
    warehouses: (warehouseResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.warehouse_key as string} — ${row.name as string}` })),
  };
}

function labelFor(options: readonly LookupOption[], value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  return options.find((option) => option.id === text)?.label ?? text;
}

export function transactionSlugFor(type: InventoryTransactionType) {
  return type.replaceAll("_", "-");
}

export function getTransactionTypeConfig(slug: string) {
  const config = TRANSACTION_TYPE_CONFIGS[slug];
  if (!config) throw new Error("Unsupported inventory transaction type.");
  return config;
}

export async function InventoryTransactionFormPage({
  detail,
  mode,
  slug,
}: Readonly<{
  detail?: InventoryTransactionDetail;
  mode: "create" | "edit";
  slug: string;
}>) {
  const config = getTransactionTypeConfig(slug);
  const transaction = detail?.transaction;
  const line = detail?.lines[0];
  const cycleLine = detail?.cycleCountLines[0];
  const lookups = await loadTransactionLookups();
  const action =
    mode === "create"
      ? createInventoryTransactionAction.bind(null, config.type)
      : updateInventoryTransactionAction.bind(null, transaction?.id ?? "", config.type);

  return (
    <PageContainer>
      <PageHeader description={config.description} title={`${mode === "create" ? "Create" : "Edit"} ${config.title}`} />
      <PageForm action={action} title={config.title}>
        <FormSection description="Minimal Sprint 10 document shell and first line. Add more lines through the service layer as the workflow grows." title="Document">
          <FormGrid>
            <FieldGroup isRequired label="Branch">
              <EntityLookup label="Select branch" name="branchId" options={lookups.branches} required value={transaction?.branchId ?? ""} />
            </FieldGroup>
            <FieldGroup isRequired label="Title">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={transaction?.title ?? config.title} name="title" required type="text" />
            </FieldGroup>
            <FieldGroup label="Date">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={transaction?.transactionDate ?? ""} name="transactionDate" type="date" />
            </FieldGroup>
            <FieldGroup isRequired={config.type === "stock_adjustment"} label="Reason">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={transaction?.reason ?? ""} name="reason" required={config.type === "stock_adjustment"} type="text" />
            </FieldGroup>
          </FormGrid>
        </FormSection>
        <FormSection description="Warehouse/location IDs are validated server-side against tenant, branch, and product scope." title="Movement">
          <FormGrid>
            <FieldGroup label="Source Warehouse">
              <EntityLookup label="Select source warehouse" name="sourceWarehouseId" options={lookups.warehouses} value={line?.sourceWarehouseId ?? transaction?.sourceWarehouseId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Source Location">
              <EntityLookup label="Select source location" name="sourceLocationId" options={lookups.locations} value={line?.sourceLocationId ?? transaction?.sourceLocationId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Destination Warehouse">
              <EntityLookup label="Select destination warehouse" name="destinationWarehouseId" options={lookups.warehouses} value={line?.destinationWarehouseId ?? transaction?.destinationWarehouseId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Destination Location">
              <EntityLookup label="Select destination location" name="destinationLocationId" options={lookups.locations} value={line?.destinationLocationId ?? transaction?.destinationLocationId ?? ""} />
            </FieldGroup>
          </FormGrid>
        </FormSection>
        <FormSection description="Sprint 10 keeps the UI simple with one editable line; services and tables support durable workflow controls." title="Line">
          <FormGrid>
            <FieldGroup isRequired label="Product">
              <EntityLookup label="Select product" name="productId" options={lookups.products} required value={line?.productId ?? cycleLine?.productId ?? ""} />
            </FieldGroup>
            <FieldGroup isRequired label="Unit">
              <EntityLookup label="Select unit" name="unitId" options={lookups.units} required value={line?.unitId ?? cycleLine?.unitId ?? ""} />
            </FieldGroup>
            {config.type === "stock_adjustment" ? (
              <FieldGroup isRequired label="Quantity Delta">
                <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.quantityDelta ?? ""} name="quantityDelta" required step="0.000001" type="number" />
              </FieldGroup>
            ) : (
              <FieldGroup isRequired={config.type !== "cycle_count"} label="Quantity">
                <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.quantity ?? ""} name="quantity" required={config.type !== "cycle_count"} step="0.000001" type="number" />
              </FieldGroup>
            )}
            {config.type === "cycle_count" ? (
              <>
                <FieldGroup isRequired label="Expected Quantity">
                  <input className="w-full rounded-md border px-3 py-2" defaultValue={cycleLine?.expectedQuantity ?? ""} name="expectedQuantity" required step="0.000001" type="number" />
                </FieldGroup>
                <FieldGroup isRequired label="Counted Quantity">
                  <input className="w-full rounded-md border px-3 py-2" defaultValue={cycleLine?.countedQuantity ?? ""} name="countedQuantity" required step="0.000001" type="number" />
                </FieldGroup>
              </>
            ) : null}
            <FieldGroup label="Unit Cost">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.unitCost ?? 0} name="unitCost" min="0" step="0.000001" type="number" />
            </FieldGroup>
          </FormGrid>
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save Draft
          </button>
          <Link className="rounded-md border px-3 py-2 text-sm" href="/erp/inventory/transactions">
            Cancel
          </Link>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export async function InventoryTransactionDetailPage({ detail }: Readonly<{ detail: InventoryTransactionDetail }>) {
  const transaction = detail.transaction;
  const config = getTransactionTypeConfig(transactionSlugFor(transaction.transactionType));
  const lookups = await loadTransactionLookups();
  const relationLabels: Record<string, readonly LookupOption[]> = {
    branchId: lookups.branches,
    destinationLocationId: lookups.locations,
    destinationWarehouseId: lookups.warehouses,
    productId: lookups.products,
    sourceLocationId: lookups.locations,
    sourceWarehouseId: lookups.warehouses,
    unitId: lookups.units,
  };

  return (
    <PageContainer>
      <PageHeader description={config.description} title={`${config.title} Detail`}>
        <PageActions>
          {transaction.status === "draft" ? (
            <a className="rounded-md border px-3 py-2 text-sm" href={`/erp/inventory/${transactionSlugFor(transaction.transactionType)}/${transaction.id}/edit`}>
              Edit
            </a>
          ) : null}
        </PageActions>
      </PageHeader>
      <PageContent>
        <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            {Object.entries(transaction).map(([key, value]) => (
              <div className="rounded-md border p-3" key={key}>
                <dt className="font-medium">{key}</dt>
                <dd className="mt-1 text-muted-foreground">{relationLabels[key] ? labelFor(relationLabels[key], value) : valueToText(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={[
            { key: "lineNumber", header: "Line", render: (record) => valueToText(record.lineNumber) },
            { key: "productId", header: "Product", render: (record) => labelFor(lookups.products, record.productId) },
            { key: "unitId", header: "Unit", render: (record) => labelFor(lookups.units, record.unitId) },
            { key: "quantity", header: "Quantity", render: (record) => valueToText(record.quantity ?? record.quantityDelta) },
          ]}
          emptyMessage="No transaction lines found."
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: detail.lines.length || 1, nextCursor: null }}
          records={detail.lines as readonly Record<string, unknown>[]}
        />
        <LifecycleActions detail={detail} />
      </PageContent>
      <PageFooter>Posting and reversal actions call server services only; quantity changes flow through StockPostingService.</PageFooter>
    </PageContainer>
  );
}

function LifecycleActions({ detail }: Readonly<{ detail: InventoryTransactionDetail }>) {
  const id = detail.transaction.id;
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="text-sm font-medium">Lifecycle Actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {detail.transaction.status === "draft" ? (
          <form action={submitInventoryTransactionAction.bind(null, id)}>
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
              Submit
            </button>
          </form>
        ) : null}
        {["draft", "submitted"].includes(detail.transaction.status) ? (
          <form action={cancelInventoryTransactionAction.bind(null, id)}>
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
              Cancel
            </button>
          </form>
        ) : null}
        {detail.transaction.status === "submitted" ? (
          <form action={postInventoryTransactionAction.bind(null, id)} className="flex gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" name="idempotencyKey" placeholder="Posting idempotency key" required type="text" />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
              Post
            </button>
          </form>
        ) : null}
        {detail.transaction.status === "posted" ? (
          <form action={reverseInventoryTransactionAction.bind(null, id)} className="flex gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" name="idempotencyKey" placeholder="Reversal idempotency key" required type="text" />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
              Reverse
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

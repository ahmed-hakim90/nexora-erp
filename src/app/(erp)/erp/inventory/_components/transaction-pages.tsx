import type { ReactNode } from "react";
import Link from "next/link";

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
import { EnterpriseDataTable, FieldGroup, FormGrid, FormSection, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader } from "@/shared/ui";

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

export function transactionSlugFor(type: InventoryTransactionType) {
  return type.replaceAll("_", "-");
}

export function getTransactionTypeConfig(slug: string) {
  const config = TRANSACTION_TYPE_CONFIGS[slug];
  if (!config) throw new Error("Unsupported inventory transaction type.");
  return config;
}

export function InventoryTransactionFormPage({
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
            <FieldGroup isRequired label="Branch ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={transaction?.branchId ?? ""} name="branchId" required type="text" />
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
            <FieldGroup label="Source Warehouse ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.sourceWarehouseId ?? transaction?.sourceWarehouseId ?? ""} name="sourceWarehouseId" type="text" />
            </FieldGroup>
            <FieldGroup label="Source Location ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.sourceLocationId ?? transaction?.sourceLocationId ?? ""} name="sourceLocationId" type="text" />
            </FieldGroup>
            <FieldGroup label="Destination Warehouse ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.destinationWarehouseId ?? transaction?.destinationWarehouseId ?? ""} name="destinationWarehouseId" type="text" />
            </FieldGroup>
            <FieldGroup label="Destination Location ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.destinationLocationId ?? transaction?.destinationLocationId ?? ""} name="destinationLocationId" type="text" />
            </FieldGroup>
          </FormGrid>
        </FormSection>
        <FormSection description="Sprint 10 keeps the UI simple with one editable line; services and tables support durable workflow controls." title="Line">
          <FormGrid>
            <FieldGroup isRequired label="Product ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.productId ?? cycleLine?.productId ?? ""} name="productId" required type="text" />
            </FieldGroup>
            <FieldGroup isRequired label="Unit ID">
              <input className="w-full rounded-md border px-3 py-2" defaultValue={line?.unitId ?? cycleLine?.unitId ?? ""} name="unitId" required type="text" />
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

export function InventoryTransactionDetailPage({ detail }: Readonly<{ detail: InventoryTransactionDetail }>) {
  const transaction = detail.transaction;
  const config = getTransactionTypeConfig(transactionSlugFor(transaction.transactionType));

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
                <dd className="mt-1 text-muted-foreground">{valueToText(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={[
            { key: "lineNumber", header: "Line", render: (record) => valueToText(record.lineNumber) },
            { key: "productId", header: "Product", render: (record) => valueToText(record.productId) },
            { key: "unitId", header: "Unit", render: (record) => valueToText(record.unitId) },
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

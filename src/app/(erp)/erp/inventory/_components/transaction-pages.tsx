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
import { createInventoryCatalogLookupService } from "@/features/inventory/routes/service-factory";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import {
  createOxRuntimeContext,
  resolveOxSmartDefaults,
  type OxWizardState,
} from "@/platform/operator-experience/public-api";
import { Button, DatePicker, EntityLookup, EnterpriseDataTable, FieldGroup, FormGrid, OperatorContextBar, OperatorProgressiveSection, OperatorWizardProgress, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader, ScannerInputFrame, SmartDefaultsSummary } from "@/shared/ui";

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

export async function loadTransactionLookups() {
  const service = await createInventoryCatalogLookupService();
  return service.loadTransactionLookups();
}

function labelFor(options: readonly LookupOption[], value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  return options.find((option) => option.id === text)?.label ?? "Selected record";
}

function hiddenIdempotencyKey(prefix: string, id: string) {
  return `${prefix}:${id}:${Date.now()}`;
}

function transactionWizardState(type: InventoryTransactionType): OxWizardState {
  const labels: Record<InventoryTransactionType, string> = {
    cycle_count: "Count",
    goods_issue: "Issue",
    goods_receipt: "Receive",
    stock_adjustment: "Adjust",
    warehouse_transfer: "Transfer",
  };

  return {
    activeStepKey: "line",
    canSaveDraft: true,
    canSubmit: false,
    progressPercent: 33,
    steps: [
      { canSaveDraft: true, description: "Confirm branch, date, and purpose.", key: "document", label: "Document", requiredFieldNames: ["branchId", "title"], state: "complete", validationScope: "step" },
      { canSaveDraft: true, description: "Scan or select product, location, and quantity.", key: "line", label: labels[type], requiredFieldNames: ["productId", "unitId"], state: "current", validationScope: "step" },
      { canSaveDraft: false, description: "Review before posting.", key: "review", label: "Review", requiredFieldNames: [], state: "pending", validationScope: "task" },
    ],
    wizardKey: `inventory.${type}.operator-wizard`,
  };
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
  const context = await resolveBranchRequestContext("erp");
  const oxContext = createOxRuntimeContext({
    branchId: context.branchId,
    companyId: context.companyId,
    experience: "erp",
    roleKey: "warehouse-keeper",
    tenantId: context.tenantId,
    warehouseId: transaction?.destinationWarehouseId ?? transaction?.sourceWarehouseId ?? null,
  });
  const defaults = resolveOxSmartDefaults(
    [
      {
        confidence: "high",
        contextKey: "branchId",
        fieldName: "branchId",
        key: "inventory.default-branch",
        label: "Branch",
        requiresConfirmation: false,
        source: "context",
      },
      {
        confidence: "high",
        contextKey: "transactionDate",
        fieldName: "transactionDate",
        key: "inventory.default-date",
        label: "Transaction date",
        requiresConfirmation: true,
        source: "context",
      },
    ],
    oxContext,
    transaction ? { branchId: transaction.branchId, transactionDate: transaction.transactionDate } : {},
  );
  const action =
    mode === "create"
      ? createInventoryTransactionAction.bind(null, config.type)
      : updateInventoryTransactionAction.bind(null, transaction?.id ?? "", config.type);

  return (
    <PageContainer>
      <OperatorContextBar context={oxContext} />
      <PageHeader description={config.description} title={`${mode === "create" ? "Create" : "Edit"} ${config.title}`} />
      <OperatorWizardProgress state={transactionWizardState(config.type)} />
      <SmartDefaultsSummary defaults={defaults} />
      <PageForm action={action} title={config.title}>
        <OperatorProgressiveSection category="essential" description="Confirm the document context. Branch and date are inherited from your current workspace." title="Essential Document Details">
          <FormGrid>
            <FieldGroup isRequired label="Branch">
              <EntityLookup label="Select branch" name="branchId" providerKey="platform.branches.lookup" required value={transaction?.branchId ?? context.branchId} />
            </FieldGroup>
            <FieldGroup isRequired label="Title">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={transaction?.title ?? config.title} name="title" required type="text" />
            </FieldGroup>
            <FieldGroup label="Date">
              <DatePicker defaultValue={transaction?.transactionDate ?? oxContext.transactionDate} name="transactionDate" />
            </FieldGroup>
            <FieldGroup isRequired={config.type === "stock_adjustment"} label="Reason">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={transaction?.reason ?? ""} name="reason" required={config.type === "stock_adjustment"} type="text" />
            </FieldGroup>
          </FormGrid>
        </OperatorProgressiveSection>
        <OperatorProgressiveSection category="essential" description="Scan locations where possible, then confirm source and destination." title="Movement">
          <ScannerInputFrame label="Location, transfer, or document scan" placeholder="Scan location, transfer document, or type code" />
          <FormGrid>
            <FieldGroup label="Source Warehouse">
              <EntityLookup label="Select source warehouse" name="sourceWarehouseId" providerKey="inventory.warehouses.lookup" value={line?.sourceWarehouseId ?? transaction?.sourceWarehouseId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Source Location">
              <EntityLookup label="Select source location" name="sourceLocationId" providerKey="inventory.locations.lookup" value={line?.sourceLocationId ?? transaction?.sourceLocationId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Destination Warehouse">
              <EntityLookup label="Select destination warehouse" name="destinationWarehouseId" providerKey="inventory.warehouses.lookup" value={line?.destinationWarehouseId ?? transaction?.destinationWarehouseId ?? ""} />
            </FieldGroup>
            <FieldGroup label="Destination Location">
              <EntityLookup label="Select destination location" name="destinationLocationId" providerKey="inventory.locations.lookup" value={line?.destinationLocationId ?? transaction?.destinationLocationId ?? ""} />
            </FieldGroup>
          </FormGrid>
        </OperatorProgressiveSection>
        <OperatorProgressiveSection category="essential" description="Scan the product first, then confirm the quantity." title="Line Entry">
          <ScannerInputFrame label="Product, serial, or lot scan" placeholder="Scan barcode, lot, serial, or type SKU" />
          <FormGrid>
            <FieldGroup isRequired label="Product">
              <EntityLookup label="Select product" name="productId" providerKey="inventory.products.lookup" required value={line?.productId ?? cycleLine?.productId ?? ""} />
            </FieldGroup>
            <FieldGroup isRequired label="Unit">
              <EntityLookup label="Select unit" name="unitId" providerKey="inventory.uoms.lookup" required value={line?.unitId ?? cycleLine?.unitId ?? ""} />
            </FieldGroup>
            {config.type === "stock_adjustment" ? (
              <FieldGroup isRequired label="Quantity Delta">
                <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={line?.quantityDelta ?? ""} name="quantityDelta" required step="0.000001" type="number" />
              </FieldGroup>
            ) : (
              <FieldGroup isRequired={config.type !== "cycle_count"} label="Quantity">
                <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={line?.quantity ?? ""} name="quantity" required={config.type !== "cycle_count"} step="0.000001" type="number" />
              </FieldGroup>
            )}
            {config.type === "cycle_count" ? (
              <>
                <FieldGroup isRequired label="Expected Quantity">
                  <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={cycleLine?.expectedQuantity ?? ""} name="expectedQuantity" required step="0.000001" type="number" />
                </FieldGroup>
                <FieldGroup isRequired label="Counted Quantity">
                  <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={cycleLine?.countedQuantity ?? ""} name="countedQuantity" required step="0.000001" type="number" />
                </FieldGroup>
              </>
            ) : null}
          </FormGrid>
        </OperatorProgressiveSection>
        <OperatorProgressiveSection category="advanced" title="Advanced Costing Details">
          <FormGrid>
            <FieldGroup label="Unit Cost">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={line?.unitCost ?? 0} name="unitCost" min="0" step="0.000001" type="number" />
            </FieldGroup>
          </FormGrid>
        </OperatorProgressiveSection>
        <PageActions>
          <Button className="min-h-12" type="submit" variant="primary">
            Save Draft
          </Button>
          <Link className="min-h-12 rounded-md border px-4 py-3 text-sm" href="/erp/inventory/transactions">
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
  const [lookups, context] = await Promise.all([loadTransactionLookups(), resolveBranchRequestContext("erp")]);
  const oxContext = createOxRuntimeContext({
    branchId: context.branchId,
    companyId: context.companyId,
    experience: "erp",
    roleKey: "warehouse-keeper",
    tenantId: context.tenantId,
    warehouseId: transaction.destinationWarehouseId ?? transaction.sourceWarehouseId ?? null,
  });
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
      <OperatorContextBar context={oxContext} />
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
          <form action={postInventoryTransactionAction.bind(null, id)}>
            <input name="idempotencyKey" type="hidden" value={hiddenIdempotencyKey("inventory-post", id)} />
            <Button className="min-h-12" type="submit" variant="primary">
              Post
            </Button>
          </form>
        ) : null}
        {detail.transaction.status === "posted" ? (
          <form action={reverseInventoryTransactionAction.bind(null, id)}>
            <input name="idempotencyKey" type="hidden" value={hiddenIdempotencyKey("inventory-reverse", id)} />
            <button className="min-h-12 rounded-md border px-4 py-2 text-sm" type="submit">
              Reverse
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

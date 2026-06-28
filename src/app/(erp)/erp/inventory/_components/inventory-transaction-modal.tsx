"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  createInventoryTransactionAction,
  updateInventoryTransactionAction,
} from "@/features/inventory/routes/actions/inventory-transactions.actions";
import type { InventoryTransactionDetail, InventoryTransactionType } from "@/features/inventory/public-api";
import { EntityLookup, FieldGroup, FormGrid, RecordFormDialog, RecordFormSection } from "@/shared/ui";

import type { TRANSACTION_TYPE_CONFIGS } from "./transaction-pages";

type LookupOption = Readonly<{ id: string; label: string }>;
type TransactionLookups = Readonly<{
  branches: readonly LookupOption[];
  locations: readonly LookupOption[];
  products: readonly LookupOption[];
  units: readonly LookupOption[];
  warehouses: readonly LookupOption[];
}>;
type TransactionConfig = (typeof TRANSACTION_TYPE_CONFIGS)[string] & { slug: string; type: InventoryTransactionType };

export function InventoryTransactionModalLauncher({
  autoOpen,
  closeHref,
  config,
  detail,
  label,
  lookups,
  trigger,
}: Readonly<{
  autoOpen?: boolean;
  closeHref?: string;
  config: TransactionConfig;
  detail?: InventoryTransactionDetail;
  label?: string;
  lookups: TransactionLookups;
  trigger?: ReactNode;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [isDirty, setIsDirty] = useState(false);
  const formId = useId();
  const transaction = detail?.transaction;
  const line = detail?.lines[0];
  const cycleLine = detail?.cycleCountLines[0];
  const title = `${transaction ? "Edit" : "Create"} ${config.title}`;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return (
    <RecordFormDialog
      actions={<button className="rounded-md border px-3 py-2 text-sm" form={formId} type="submit">Save Draft</button>}
      isDirty={isDirty}
      onOpenChange={handleOpenChange}
      open={open}
      status={<span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{String(transaction?.status ?? "draft")}</span>}
      subtitle="Minimal Inventory transaction document shell and first line."
      title={title}
      trigger={autoOpen ? undefined : trigger ?? <button className="rounded-md border px-3 py-2 text-sm" type="button">{label ?? title}</button>}
    >
      <RecordFormSection>
        <form
          action={transaction ? updateInventoryTransactionAction.bind(null, transaction.id, config.type) : createInventoryTransactionAction.bind(null, config.type)}
          className="space-y-5"
          id={formId}
          onInput={() => setIsDirty(true)}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Document</h3>
            <FormGrid>
              <FieldGroup isRequired label="Branch">
                <EntityLookup label="Select branch" name="branchId" options={lookups.branches} required value={transaction?.branchId ?? ""} />
              </FieldGroup>
              <FieldGroup isRequired label="Title">
                <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={transaction?.title ?? config.title} name="title" required type="text" />
              </FieldGroup>
              <FieldGroup label="Date">
                <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={transaction?.transactionDate ?? ""} name="transactionDate" type="date" />
              </FieldGroup>
              <FieldGroup isRequired={config.type === "stock_adjustment"} label="Reason">
                <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={transaction?.reason ?? ""} name="reason" required={config.type === "stock_adjustment"} type="text" />
              </FieldGroup>
            </FormGrid>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Movement</h3>
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
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Line</h3>
            <FormGrid>
              <FieldGroup isRequired label="Product">
                <EntityLookup label="Select product" name="productId" options={lookups.products} required value={line?.productId ?? cycleLine?.productId ?? ""} />
              </FieldGroup>
              <FieldGroup isRequired label="Unit">
                <EntityLookup label="Select unit" name="unitId" options={lookups.units} required value={line?.unitId ?? cycleLine?.unitId ?? ""} />
              </FieldGroup>
              {config.type === "stock_adjustment" ? (
                <FieldGroup isRequired label="Quantity Delta">
                  <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={line?.quantityDelta ?? ""} name="quantityDelta" required step="0.000001" type="number" />
                </FieldGroup>
              ) : (
                <FieldGroup isRequired={config.type !== "cycle_count"} label="Quantity">
                  <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={line?.quantity ?? ""} name="quantity" required={config.type !== "cycle_count"} step="0.000001" type="number" />
                </FieldGroup>
              )}
              {config.type === "cycle_count" ? (
                <>
                  <FieldGroup isRequired label="Expected Quantity">
                    <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={cycleLine?.expectedQuantity ?? ""} name="expectedQuantity" required step="0.000001" type="number" />
                  </FieldGroup>
                  <FieldGroup isRequired label="Counted Quantity">
                    <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={cycleLine?.countedQuantity ?? ""} name="countedQuantity" required step="0.000001" type="number" />
                  </FieldGroup>
                </>
              ) : null}
              <FieldGroup label="Unit Cost">
                <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30" defaultValue={line?.unitCost ?? 0} name="unitCost" min="0" step="0.000001" type="number" />
              </FieldGroup>
            </FormGrid>
          </section>
        </form>
      </RecordFormSection>
    </RecordFormDialog>
  );
}

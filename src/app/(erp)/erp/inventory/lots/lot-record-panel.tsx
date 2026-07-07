"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DatePickerField,
  EntityLookup,
  RecordFormDialog,
  RecordFormSection,
  Tabs,
  fieldA11yProps,
} from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";
import {
  archiveInventoryLotAction,
  createInventoryLotAction,
  updateInventoryLotAction,
} from "@/features/inventory/routes/actions/inventory-lots.actions";
import type { InventoryLotRecord, InventoryLotWorkspaceData } from "@/features/inventory/routes/loaders/inventory-lots.loader";

const statusOptions = ["draft", "active", "inactive", "locked", "archived"] as const;
const sourceTypeOptions = ["supplier", "manufacturing", "repack", "return", "adjustment", "internal", "import"] as const;
const qcStatusOptions = ["not_required", "pending", "passed", "failed", "hold", "released"] as const;
const lifecycleOptions = ["draft", "active", "qc_pending", "qc_hold", "released", "blocked", "consumed", "expired", "archived"] as const;
const lotCodeConfig = { prefix: "LOT", scope: "company" } as const;

function objectToLines(value: Readonly<Record<string, unknown>> | undefined) {
  if (!value) return "";
  return Object.entries(value).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).join("\n");
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
  required,
}: Readonly<{
  defaultValue?: string;
  label: string;
  name: string;
  options: readonly string[];
  required?: boolean;
}>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <select
        className="w-full rounded-md border bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
        required={required}
        {...fieldA11yProps(name)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  readOnly,
  required,
  type = "text",
}: Readonly<{
  defaultValue?: string;
  label: string;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  type?: string;
}>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className="w-full rounded-md border bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
        readOnly={readOnly}
        required={required}
        type={type}
        {...fieldA11yProps(name)}
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
  rows = 4,
}: Readonly<{
  defaultValue?: string;
  label: string;
  name: string;
  rows?: number;
}>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <textarea
        className="w-full rounded-md border bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
        rows={rows}
        {...fieldA11yProps(name)}
      />
    </label>
  );
}

function CheckboxField({
  defaultChecked,
  label,
  name,
}: Readonly<{
  defaultChecked?: boolean;
  label: string;
  name: string;
}>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" value="true" />
      <span>{label}</span>
    </label>
  );
}

export function LotRecordModalLauncher({
  autoOpen,
  closeHref,
  lot,
  mode,
  workspace,
}: Readonly<{
  autoOpen?: boolean;
  closeHref: string;
  lot?: InventoryLotRecord;
  mode: "create" | "edit";
  workspace: InventoryLotWorkspaceData;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen ?? false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("general");
  const productVariants = workspace.variants.filter((variant) => !lot?.productId || variant.productId === lot.productId);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "create") {
        await createInventoryLotAction(formData);
      } else if (lot) {
        await updateInventoryLotAction(lot.id, formData);
      }
      setOpen(false);
      router.push(closeHref);
      router.refresh();
    });
  }

  return (
    <RecordFormDialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) router.push(closeHref);
      }}
      open={open}
      subtitle="Lot identity foundation only. Quantities, balances, and movements are handled by later engines."
      title={mode === "create" ? "Create Lot" : `Edit ${lot?.lotNumber ?? "Lot"}`}
    >
      <form action={handleSubmit} className="space-y-4">
        <RecordFormSection>
          <Tabs
            activeKey={activeTab}
            onValueChange={setActiveTab}
            tabs={[
              {
                content: (
                  <div className="space-y-4">
                    <EntityLookup
                      emptyMessage="Create lot-tracked products first."
                      label="Product"
                      name="productId"
                      options={workspace.products.filter((product) => product.trackingMode === "lot" || product.trackingMode === "lot_serial")}
                      required
                      value={lot?.productId ?? ""}
                    />
                    <EntityLookup
                      emptyMessage="Select a product first."
                      label="Variant"
                      name="productVariantId"
                      options={productVariants}
                      value={lot?.productVariantId ?? ""}
                    />
                    {mode === "edit" ? (
                      <>
                        <input name="lotNumber" type="hidden" value={lot?.lotNumber ?? ""} />
                        <TextField
                          defaultValue={displayBusinessCode(lot?.lotNumber, lotCodeConfig)}
                          label="Lot Number"
                          name="lotNumberDisplay"
                          readOnly
                        />
                      </>
                    ) : (
                      <>
                        <TextField label="Lot Number" name="lotNumber" />
                        <p className="text-sm text-muted-foreground">Leave blank to auto-generate on save.</p>
                      </>
                    )}
                    <TextField defaultValue={lot?.barcode} label="Barcode" name="barcode" required />
                    <SelectField defaultValue={lot?.status ?? "active"} label="Record Status" name="status" options={statusOptions} required />
                    <SelectField defaultValue={lot?.lifecycleState ?? "draft"} label="Lifecycle State" name="lifecycleState" options={lifecycleOptions} required />
                    <TextAreaField defaultValue={lot?.notes ?? ""} label="Notes" name="notes" />
                  </div>
                ),
                key: "general",
                label: "General",
              },
              {
                content: (
                  <div className="space-y-4">
                    <SelectField defaultValue={lot?.sourceType ?? "internal"} label="Source Type" name="sourceType" options={sourceTypeOptions} required />
                    <TextField defaultValue={lot?.sourceReferenceType ?? ""} label="Source Reference Type" name="sourceReferenceType" />
                    <TextField defaultValue={lot?.sourceReferenceId ?? ""} label="Source Reference" name="sourceReferenceId" />
                    <EntityLookup
                      emptyMessage="No supplier parties available."
                      label="Supplier Party"
                      name="supplierPartyId"
                      options={workspace.suppliers}
                      value={lot?.supplierPartyId ?? ""}
                    />
                    <TextField defaultValue={lot?.supplierLotNumber ?? ""} label="Supplier Lot Number" name="supplierLotNumber" />
                    <TextAreaField defaultValue={objectToLines(lot?.sourceMetadata)} label="Source Metadata" name="sourceMetadata" />
                  </div>
                ),
                key: "source",
                label: "Source",
              },
              {
                content: (
                  <div className="space-y-4">
                    <DatePickerField defaultValue={lot?.receivedDate ?? ""} label="Received Date" name="receivedDate" />
                    <DatePickerField defaultValue={lot?.manufacturingDate ?? ""} label="Manufacturing Date" name="manufacturingDate" />
                    <DatePickerField defaultValue={lot?.expiryDate ?? ""} label="Expiry Date" name="expiryDate" />
                  </div>
                ),
                key: "dates",
                label: "Dates",
              },
              {
                content: (
                  <div className="space-y-4">
                    <SelectField defaultValue={lot?.qcStatus ?? "not_required"} label="QC Status" name="qcStatus" options={qcStatusOptions} required />
                    <p className="text-sm text-muted-foreground">QC metadata only. No QC workflow runtime is implemented in this sprint.</p>
                    {lot?.issueBlocked ? <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">This lot is marked unavailable for future issue logic.</p> : null}
                  </div>
                ),
                key: "qc",
                label: "QC",
              },
              {
                content: (
                  <div className="space-y-4">
                    <CheckboxField defaultChecked={lot?.traceabilityReady ?? true} label="Traceability Ready" name="traceabilityReady" />
                    <TextAreaField defaultValue={objectToLines(lot?.qrPayload)} label="QR Payload Metadata" name="qrPayload" />
                    <p className="text-sm text-muted-foreground">Prepared for supplier receipt, production, QC, handling units, serials, shipments, customers, service cases, and recalls.</p>
                  </div>
                ),
                key: "traceability",
                label: "Traceability",
              },
              {
                content: (
                  <p className="text-sm text-muted-foreground">Attachment contracts are registered for future document linking. No file upload runtime in this sprint.</p>
                ),
                key: "attachments",
                label: "Attachments",
              },
              {
                content: (
                  <dl className="grid gap-3 text-sm md:grid-cols-2">
                    <div><dt className="text-muted-foreground">Created</dt><dd>{lot?.createdAt ?? "On save"}</dd></div>
                    <div><dt className="text-muted-foreground">Updated</dt><dd>{lot?.updatedAt ?? "On save"}</dd></div>
                    <div><dt className="text-muted-foreground">Version</dt><dd>{lot?.version ?? 1}</dd></div>
                    <div><dt className="text-muted-foreground">Product Tracking</dt><dd>{lot?.productTrackingMode ?? "From product policy"}</dd></div>
                  </dl>
                ),
                key: "audit",
                label: "Audit",
              },
            ]}
          />
        </RecordFormSection>

        <div className="flex justify-end gap-2 border-t pt-4">
          {mode === "edit" && lot ? (
            <button
              className="rounded-md border px-3 py-2 text-sm"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await archiveInventoryLotAction(lot.id);
                setOpen(false);
                router.push(closeHref);
                router.refresh();
              })}
              type="button"
            >
              Archive
            </button>
          ) : null}
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save Lot"}
          </button>
        </div>
      </form>
    </RecordFormDialog>
  );
}

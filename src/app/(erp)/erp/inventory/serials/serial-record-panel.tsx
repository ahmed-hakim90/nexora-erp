"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { EntityLookup, RecordFormDialog, RecordFormSection, Tabs, fieldA11yProps } from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";
import {
  archiveInventorySerialAction,
  createInventorySerialAction,
  updateInventorySerialAction,
} from "@/features/inventory/routes/actions/inventory-serials.actions";
import type { InventorySerialRecord, InventorySerialWorkspaceData } from "@/features/inventory/routes/loaders/inventory-serials.loader";

const recordStatusOptions = ["draft", "active", "inactive", "locked", "archived"] as const;
const serialSourceOptions = ["nexora_generated", "supplier", "manual", "imported"] as const;
const generationMethodOptions = ["policy_range", "manual_entry", "supplier_import", "bulk_import"] as const;
const lifecycleOptions = ["draft", "generated", "imported", "packed", "available", "reserved", "picked", "shipped", "sold", "returned", "service", "repaired", "scrapped", "revoked", "archived"] as const;
const serialStatusOptions = ["active", "blocked", "damaged", "missing", "duplicate_suspected", "counterfeit_suspected", "archived"] as const;
const verificationOptions = ["not_required", "pending", "valid", "invalid", "suspected_duplicate", "revoked"] as const;
const serialCodeConfig = { prefix: "SER", scope: "company" } as const;

function objectToLines(value: Readonly<Record<string, unknown>> | undefined) {
  if (!value) return "";
  return Object.entries(value).map(([key, entry]) => `${key}: ${String(entry ?? "")}`).join("\n");
}

function SelectField({ defaultValue, label, name, options, required }: Readonly<{ defaultValue?: string; label: string; name: string; options: readonly string[]; required?: boolean }>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <select className="w-full rounded-md border bg-background px-3 py-2" defaultValue={defaultValue} name={name} required={required} {...fieldA11yProps(name)}>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}

function TextField({ defaultValue, label, name, readOnly, required, type = "text" }: Readonly<{ defaultValue?: string; label: string; name: string; readOnly?: boolean; required?: boolean; type?: string }>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input className="w-full rounded-md border bg-background px-3 py-2" defaultValue={defaultValue} name={name} readOnly={readOnly} required={required} type={type} {...fieldA11yProps(name)} />
    </label>
  );
}

function TextAreaField({ defaultValue, label, name, rows = 4 }: Readonly<{ defaultValue?: string; label: string; name: string; rows?: number }>) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <textarea className="w-full rounded-md border bg-background px-3 py-2" defaultValue={defaultValue} name={name} rows={rows} {...fieldA11yProps(name)} />
    </label>
  );
}

function CheckboxField({ defaultChecked, label, name }: Readonly<{ defaultChecked?: boolean; label: string; name: string }>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" value="true" />
      <span>{label}</span>
    </label>
  );
}

export function SerialRecordModalLauncher({
  autoOpen,
  closeHref,
  mode,
  serial,
  workspace,
}: Readonly<{
  autoOpen?: boolean;
  closeHref: string;
  mode: "create" | "edit";
  serial?: InventorySerialRecord;
  workspace: InventorySerialWorkspaceData;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen ?? false);
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const productVariants = workspace.variants.filter((variant) => !serial?.productId || variant.productId === serial.productId);
  const productLots = workspace.lots.filter((lot) => !serial?.productId || lot.productId === serial.productId);
  const serialProducts = workspace.products.filter((product) => product.trackingMode === "serial" || product.trackingMode === "lot_serial");

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (mode === "create") await createInventorySerialAction(formData);
      else if (serial) await updateInventorySerialAction(serial.id, formData);
      setOpen(false);
      router.push(closeHref);
      router.refresh();
    });
  }

  return (
    <RecordFormDialog
      onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) router.push(closeHref); }}
      open={open}
      subtitle="Serial Engine foundation only. No stock movement, generation runtime, QR signing, warranty, or service runtime."
      title={mode === "create" ? "Create Serial" : `Edit ${serial?.serialNumber ?? "Serial"}`}
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
                    <EntityLookup emptyMessage="Create serial-tracked products first." label="Product" name="productId" options={serialProducts} required value={serial?.productId ?? ""} />
                    <EntityLookup emptyMessage="Select a product first." label="Variant" name="productVariantId" options={productVariants} value={serial?.productVariantId ?? ""} />
                    {mode === "edit" ? (
                      <>
                        <input name="serialNumber" type="hidden" value={serial?.serialNumber ?? ""} />
                        <TextField defaultValue={displayBusinessCode(serial?.serialNumber, serialCodeConfig)} label="Serial Number" name="serialNumberDisplay" readOnly />
                      </>
                    ) : (
                      <>
                        <TextField label="Serial Number" name="serialNumber" />
                        <p className="text-sm text-muted-foreground">Leave blank to auto-generate on save.</p>
                      </>
                    )}
                    <TextField defaultValue={serial?.barcode} label="Barcode" name="barcode" required />
                    <SelectField defaultValue={serial?.serialSource ?? "manual"} label="Serial Source" name="serialSource" options={serialSourceOptions} required />
                    <SelectField defaultValue={serial?.generationMethod ?? "manual_entry"} label="Generation Method" name="generationMethod" options={generationMethodOptions} required />
                    <SelectField defaultValue={serial?.lifecycleState ?? "draft"} label="Lifecycle State" name="lifecycleState" options={lifecycleOptions} required />
                    <SelectField defaultValue={serial?.serialStatus ?? "active"} label="Serial Status" name="serialStatus" options={serialStatusOptions} required />
                    <SelectField defaultValue={serial?.status ?? "active"} label="Record Status" name="status" options={recordStatusOptions} required />
                    <TextAreaField defaultValue={serial?.notes ?? ""} label="Notes" name="notes" />
                  </div>
                ),
                key: "general",
                label: "General",
              },
              {
                content: (
                  <div className="space-y-4">
                    <TextAreaField defaultValue={objectToLines(serial?.sourceMetadata)} label="Source Metadata" name="sourceMetadata" />
                    <p className="text-sm text-muted-foreground">Supplier, import, manual audit, and future policy/range metadata only.</p>
                  </div>
                ),
                key: "source",
                label: "Source",
              },
              {
                content: (
                  <div className="space-y-4">
                    <EntityLookup emptyMessage="Create serial policies first." label="Serial Policy" name="policyId" options={workspace.policies.map((policy) => ({ id: policy.id, label: policy.label }))} value={serial?.policyId ?? ""} />
                    <p className="text-sm text-muted-foreground">Product serial policy from Sprint 1 is enforced on save. Engine policies support pattern tokens like {"{PREFIX}"} and {"{NUMBER}"}.</p>
                  </div>
                ),
                key: "policy",
                label: "Policy",
              },
              {
                content: (
                  <div className="space-y-4">
                    <EntityLookup emptyMessage="Select a lot-tracked product first." label="Lot" name="lotId" options={productLots} value={serial?.lotId ?? ""} />
                    <p className="text-sm text-muted-foreground">Required when product tracking is lot_serial.</p>
                  </div>
                ),
                key: "lot",
                label: "Lot",
              },
              {
                content: (
                  <div className="space-y-4">
                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                      <div><dt className="text-muted-foreground">Current Handling Unit</dt><dd>{serial?.handlingUnitLabel ?? "Projection pending"}</dd></div>
                      <div><dt className="text-muted-foreground">Current Warehouse</dt><dd>{serial?.warehouseLabel ?? "Projection pending"}</dd></div>
                      <div><dt className="text-muted-foreground">Current Location</dt><dd>{serial?.locationLabel ?? "Projection pending"}</dd></div>
                      <div><dt className="text-muted-foreground">Current Custodian</dt><dd>{objectToLines(serial?.currentCustodian) || "Projection pending"}</dd></div>
                    </dl>
                    <p className="text-sm text-muted-foreground">Current placement is derived from inventory ledger projections only. Identity records cannot write current-state fields directly.</p>
                  </div>
                ),
                key: "location",
                label: "Location",
              },
              {
                content: (
                  <div className="space-y-4">
                    <SelectField defaultValue={serial?.verificationStatus ?? "not_required"} label="Verification Status" name="verificationStatus" options={verificationOptions} required />
                    <TextField defaultValue={serial?.verificationTokenHash ?? ""} label="Verification Token Hash" name="verificationTokenHash" />
                    <TextAreaField defaultValue={objectToLines(serial?.qrPayload)} label="QR Payload Metadata" name="qrPayload" />
                  </div>
                ),
                key: "verification",
                label: "Verification",
              },
              {
                content: (
                  <div className="space-y-4">
                    <CheckboxField defaultChecked={serial?.warrantyReady ?? false} label="Warranty Ready" name="warrantyReady" />
                    <CheckboxField defaultChecked={serial?.serviceReady ?? false} label="Service Ready" name="serviceReady" />
                    <CheckboxField defaultChecked={serial?.firstActivationReady ?? false} label="First Activation Ready" name="firstActivationReady" />
                    <TextField defaultValue={serial?.soldDocumentReference ?? ""} label="Sold Document Reference" name="soldDocumentReference" />
                    <TextField defaultValue={serial?.serviceCaseReference ?? ""} label="Service Case Reference" name="serviceCaseReference" />
                  </div>
                ),
                key: "warranty",
                label: "Warranty / Service",
              },
              {
                content: (
                  <div className="space-y-4">
                    <CheckboxField defaultChecked={serial?.traceabilityReady ?? true} label="Traceability Ready" name="traceabilityReady" />
                    <p className="text-sm text-muted-foreground">Prepared for HU history, opened carton traceability, and downstream warranty/service links.</p>
                  </div>
                ),
                key: "traceability",
                label: "Traceability",
              },
              {
                content: (
                  <dl className="grid gap-3 text-sm md:grid-cols-2">
                    <div><dt className="text-muted-foreground">Created</dt><dd>{serial?.createdAt ?? "On save"}</dd></div>
                    <div><dt className="text-muted-foreground">Updated</dt><dd>{serial?.updatedAt ?? "On save"}</dd></div>
                    <div><dt className="text-muted-foreground">Product Tracking</dt><dd>{serial?.productTrackingMode ?? "From product policy"}</dd></div>
                    <div><dt className="text-muted-foreground">Current HU</dt><dd>{serial?.handlingUnitLabel ?? "-"}</dd></div>
                  </dl>
                ),
                key: "audit",
                label: "Audit",
              },
            ]}
          />
        </RecordFormSection>

        <div className="flex justify-end gap-2 border-t pt-4">
          {mode === "edit" && serial ? (
            <button className="rounded-md border px-3 py-2 text-sm" disabled={isPending} onClick={() => startTransition(async () => { await archiveInventorySerialAction(serial.id); setOpen(false); router.push(closeHref); router.refresh(); })} type="button">Archive</button>
          ) : null}
          <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" disabled={isPending} type="submit">{isPending ? "Saving..." : "Save Serial"}</button>
        </div>
      </form>
    </RecordFormDialog>
  );
}

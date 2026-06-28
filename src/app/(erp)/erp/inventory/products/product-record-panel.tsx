"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FilePlus2, MoreHorizontal } from "lucide-react";

import {
  AuditActivityTimeline,
  DropdownMenu,
  EntityLookup,
  FieldErrorText,
  FieldWarningText,
  PanelIconButton,
  PanelToolbarGroup,
  RecordFormDialog,
  RecordFormSection,
  RequiredFieldMarker,
  SaveAuditMetadata,
  SaveButtonWithReason,
  SaveStatusIndicator,
  ValidationStatusBadge,
  Tabs,
  buildRecordActivityEvents,
  cn,
  fieldA11yProps,
  fieldErrorId,
  type PlatformFormFieldRule,
  type RecordAuditMetadata,
  type RecordSaveStatus,
  usePlatformFormValidation,
} from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";
import { platform } from "@/platform/client";
import { archiveInventoryProductAction, createInventoryProductAction, updateInventoryProductAction } from "@/features/inventory/routes/actions/inventory-products.actions";
import type { InventoryProductRecord, InventoryProductWorkspaceData } from "@/features/inventory/routes/loaders/inventory-products.loader";

const statusOptions = ["draft", "active", "inactive", "locked", "archived"] as const;
const kindOptions = ["stockable", "consumable", "service", "asset", "rental", "kit"] as const;
const trackingOptions = ["none", "lot", "serial"] as const;
const reservationOptions = ["none", "soft", "hard"] as const;
const onlineStatusOptions = ["draft", "ready", "published", "hidden", "archived"] as const;
const productCodeConfig = { prefix: "PROD", scope: "company" } as const;

const productFieldRules: readonly PlatformFormFieldRule[] = [
  { label: "Product Code", name: "productKey", serverAliases: ["product_key"] },
  { label: "SKU", name: "sku", required: true },
  { label: "Product Name", name: "name", required: true },
  { label: "Product Type", name: "productKind", required: true, serverAliases: ["product_kind"] },
  { label: "Category", name: "categoryId", required: true, serverAliases: ["category_id", "product_category_id"] },
  { label: "Base UOM", name: "baseUomId", required: true, serverAliases: ["base_uom_id"] },
  { label: "Tracking", name: "trackingMode", required: true, serverAliases: ["tracking_mode"] },
  { label: "Reservation", name: "reservationPolicy", required: true, serverAliases: ["reservation_policy"] },
  { label: "Status", name: "status", required: true },
  { label: "Barcode", name: "barcode", serverAliases: ["barcode"] },
  { label: "Online Slug", name: "onlineSlug", serverAliases: ["online_slug"], validate: (value, formData) => formData.get("onlineEnabled") === "on" && value.trim().length === 0 ? "Enter a slug before enabling online visibility." : null },
  { label: "Purchase Price", name: "purchasePrice", validate: nonNegativeField },
  { label: "Retail Price", name: "retailPrice", validate: nonNegativeField },
  { label: "Wholesale Price", name: "wholesalePrice", validate: nonNegativeField },
  { label: "Online Price", name: "onlinePrice", validate: nonNegativeField },
  { label: "Opening Balance", name: "openingBalanceQty", validate: nonNegativeField },
  { label: "Minimum Stock", name: "minimumStockQty", validate: nonNegativeField },
  { label: "Maximum Stock", name: "maximumStockQty", validate: nonNegativeField },
  { label: "Reorder Point", name: "reorderPointQty", validate: (value, formData) => {
    const nonNegativeError = nonNegativeField(value);
    if (nonNegativeError) return nonNegativeError;
    const maximum = Number(formData.get("maximumStockQty") || 0);
    const reorder = Number(value || 0);
    return value.trim() && formData.get("maximumStockQty") && reorder > maximum ? "Reorder point must be less than or equal to maximum stock." : null;
  } },
  { label: "Weight", name: "weight", validate: nonNegativeField },
  { label: "Length", name: "length", validate: nonNegativeField },
  { label: "Width", name: "width", validate: nonNegativeField },
  { label: "Height", name: "height", validate: nonNegativeField },
  { label: "Volume", name: "volume", validate: nonNegativeField },
];

function nonNegativeField(value: string) {
  if (!value.trim()) return null;
  return Number(value) < 0 ? "Use zero or a positive number." : null;
}

type SaveIntent = "Save" | "SaveNew" | "SaveClose";
type ProductRecordModalProps = Readonly<{
  closeHref?: string;
  data: InventoryProductWorkspaceData;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  product?: InventoryProductRecord;
  previousHref?: string;
  nextHref?: string;
  title: string;
  trigger?: ReactNode;
}>;
type ProductRecordModalLauncherProps = Omit<ProductRecordModalProps, "onOpenChange" | "open" | "title" | "trigger"> & Readonly<{ autoOpen?: boolean; label?: string }>;

function auditFromProduct(product?: InventoryProductRecord, saveType?: string): RecordAuditMetadata | null {
  if (!product) return null;
  return { createdAt: product.createdAt, createdBy: product.createdBy, saveType, status: product.status, updatedAt: product.updatedAt, updatedBy: product.updatedBy, version: product.version };
}

export function ProductRecordModalLauncher({ autoOpen, closeHref, label, data, product, previousHref, nextHref }: ProductRecordModalLauncherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const title = product ? `Edit ${product.name}` : "New Product";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && closeHref) router.push(closeHref);
  }

  return (
    <ProductRecordModal
      closeHref={closeHref}
      data={data}
      nextHref={nextHref}
      onOpenChange={handleOpenChange}
      open={open}
      previousHref={previousHref}
      product={product}
      title={title}
      trigger={autoOpen ? undefined : <button className="rounded-md border bg-[hsl(var(--primary))] px-3 py-2 text-sm text-[hsl(var(--primary-foreground))] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]" type="button">{label ?? title}</button>}
    />
  );
}

function ProductRecordModal({ data, onOpenChange, open, product, previousHref, nextHref, title, trigger }: ProductRecordModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<RecordSaveStatus>("idle");
  const [activeTab, setActiveTab] = useState("general");
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProduct, setSavedProduct] = useState<InventoryProductRecord | undefined>(product);
  const localDraftKey = `nexora.modalDraft.inventory.product.${product ? "edit" : "create"}.${product?.id ?? "new"}`;
  const validation = usePlatformFormValidation({ fields: productFieldRules, formRef });
  const auditMetadata = auditFromProduct(savedProduct, saveStatus === "draft-saved" ? "Draft" : saveStatus === "saved" ? "Saved" : undefined);
  const activityEvents = useMemo(() => auditMetadata ? buildRecordActivityEvents(auditMetadata) : [], [auditMetadata]);
  const lifecycleBlocksEditing = ["locked", "archived"].includes(savedProduct?.status ?? product?.status ?? "");
  const saveBlockedByValidation = !validation.isValid;
  const nonValidationSaveDisabledReason = isPending ? "Save is already in progress." : lifecycleBlocksEditing ? "This product lifecycle status does not allow editing." : undefined;
  const saveDisabledReason = nonValidationSaveDisabledReason ?? validation.saveDisabledReason;

  function persistLocalDraft() {
    const form = formRef.current;
    if (!form) return;
    window.localStorage.setItem(localDraftKey, JSON.stringify([...new FormData(form).entries()].map(([key, value]) => [key, String(value)])));
  }

  function restoreLocalDraft() {
    const form = formRef.current;
    const raw = window.localStorage.getItem(localDraftKey);
    if (!form || !raw) return;
    for (const [key, value] of JSON.parse(raw) as [string, string][]) {
      const field = form.elements.namedItem(key);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.value = value;
    }
    setSaveStatus("dirty");
    setIsDirty(true);
    window.requestAnimationFrame(() => validation.validateForm());
  }

  useEffect(() => {
    if (!window.localStorage.getItem(localDraftKey)) return undefined;
    const frame = window.requestAnimationFrame(() => restoreLocalDraft());
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey]);

  function resetChanges() {
    formRef.current?.reset();
    setSaveStatus("idle");
    setIsDirty(false);
    setError(null);
  }

  function submit(intent: SaveIntent) {
    const form = formRef.current;
    if (!form) return;
    setError(null);
    const validationState = validation.validateForm({ focusFirstInvalid: true, revealAll: true });
    if (!validationState.isValid) {
      setSaveStatus("dirty");
      platform.feedback.error("Product form needs attention", { description: validationState.errorList[0]?.message ?? validation.saveDisabledReason ?? "Fix validation errors before saving.", source: "runtime" });
      return;
    }
    if (nonValidationSaveDisabledReason) return;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const formData = new FormData(form);
        const saved = product ? await updateInventoryProductAction(product.id, formData) : await createInventoryProductAction(formData);
        setSavedProduct(saved);
        setSaveStatus("saved");
        setIsDirty(false);
        window.localStorage.removeItem(localDraftKey);
        platform.feedback.success("Product saved", { entity: { id: saved.id, label: saved.name, type: "inventory_product" }, source: "runtime" });
        router.refresh();
        if (intent === "SaveNew") {
          form.reset();
          setSavedProduct(undefined);
        }
        if (intent === "SaveClose") onOpenChange(false);
      } catch (submitError) {
        const issue = validation.setServerError(submitError);
        setError(issue.fieldName === "__server" ? issue.message : null);
        setSaveStatus("failed");
        platform.feedback.error("Product save failed", { description: issue.message, source: "runtime" });
      }
    });
  }

  function archiveProduct() {
    if (!product) return;
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await archiveInventoryProductAction(product.id);
        platform.feedback.success("Product archived", { entity: { id: product.id, label: product.name, type: "inventory_product" }, source: "runtime" });
        router.push("/erp/inventory/products");
        router.refresh();
      } catch (archiveError) {
        const message = archiveError instanceof Error ? archiveError.message : "Could not archive the product.";
        setError(message);
        setSaveStatus("failed");
        platform.feedback.error("Product archive failed", { description: message, source: "runtime" });
      }
    });
  }

  const centerControls = (
    <>
      <PanelIconButton disabled={!previousHref || isPending} label="Go to previous record" onClick={() => previousHref && router.push(previousHref)} tooltip="Go to previous record"><ChevronLeft aria-hidden className="size-4" /></PanelIconButton>
      <PanelIconButton disabled={!nextHref || isPending} label="Go to next record" onClick={() => nextHref && router.push(nextHref)} tooltip="Go to next record"><ChevronRight aria-hidden className="size-4" /></PanelIconButton>
    </>
  );
  const actionControls = (
    <>
      <PanelToolbarGroup>
        <SaveButtonWithReason allowDisabledAttempt={saveBlockedByValidation} disabledReason={saveDisabledReason} isLoading={isPending && saveStatus === "saving"} label="Save" onClick={() => submit("Save")} />
        <PanelIconButton aria-disabled={Boolean(saveDisabledReason) || undefined} className={saveBlockedByValidation ? "opacity-50" : undefined} disabled={Boolean(nonValidationSaveDisabledReason)} label="Save and create another" onClick={() => submit("SaveNew")} tooltip={saveDisabledReason ?? "Save and new"}><FilePlus2 aria-hidden className="size-4" /></PanelIconButton>
      </PanelToolbarGroup>
      <DropdownMenu align="end" items={[
        { key: "save-close", label: "Save & Close", onSelect: () => submit("SaveClose"), disabled: isPending },
        { key: "archive", label: "Archive record", onSelect: archiveProduct, disabled: !product || isPending },
        { key: "cancel", label: "Cancel", onSelect: () => onOpenChange(false), disabled: isPending },
        { key: "reset", label: "Reset changes", onSelect: resetChanges, disabled: isPending },
      ]} trigger={<PanelIconButton label="More actions" tooltip="More actions"><MoreHorizontal aria-hidden className="size-4" /></PanelIconButton>} />
    </>
  );
  const statusBadge = <StatusBadge status={savedProduct?.status ?? product?.status ?? "draft"} />;

  return (
    <RecordFormDialog
      actions={actionControls}
      auditMetadata={<div className="space-y-2"><SaveStatusIndicator status={saveStatus} /><SaveAuditMetadata metadata={auditMetadata} /></div>}
      centerControls={centerControls}
      isDirty={isDirty}
      onOpenChange={onOpenChange}
      open={open}
      size="wide"
      status={<>{statusBadge}<ValidationStatusBadge errorCount={validation.allErrorList.length} isValid={validation.isValid} show={validation.hasValidationAttempted} /></>}
      subtitle="Create or update an inventory product in the current workspace."
      title={title}
      trigger={trigger}
    >
      <div className="space-y-[var(--floating-panel-section-gap)]">
        <RecordFormSection>
          <form className="space-y-4" onBlur={validation.validateOnBlur} onInput={(event) => { setSaveStatus("dirty"); setIsDirty(true); persistLocalDraft(); validation.validateOnInput(event); }} ref={formRef}>
            <Tabs
              activeKey={activeTab}
              onValueChange={setActiveTab}
              tabs={[
                {
                  key: "general",
                  label: "General",
                  content: (
                    <div className="space-y-4">
                      <HelpBlock />
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <ReadOnlyCodeField defaultValue={product?.productKey} label="Product Code" name="productKey" />
                        <Field defaultValue={product?.name} error={validation.errors.name} isRequired label="Product Name" name="name" />
                        <Field defaultValue={product?.nameAr} error={validation.errors.nameAr} label="Arabic Name" name="nameAr" />
                        <Field defaultValue={product?.sku} error={validation.errors.sku} isRequired label="SKU" name="sku" />
                        <Field defaultValue={product?.barcode} error={validation.errors.barcode} label="Barcode" name="barcode" />
                        <SelectField defaultValue={product?.productKind ?? "stockable"} error={validation.errors.productKind} isRequired label="Product Type" name="productKind" options={kindOptions} />
                        <SelectField defaultValue={product?.categoryId ?? product?.productCategoryId} error={validation.errors.categoryId} isRequired label="Category" name="categoryId" options={data.categories} />
                        <SelectField defaultValue={product?.subcategoryId} error={validation.errors.subcategoryId} label="Subcategory" name="subcategoryId" options={data.subcategories} />
                        <Field defaultValue={product?.brand} error={validation.errors.brand} label="Brand" name="brand" />
                        <SelectField defaultValue={product?.supplierPartyId} error={validation.errors.supplierPartyId} label="Supplier" name="supplierPartyId" options={data.suppliers} />
                        <SelectField defaultValue={product?.status ?? "active"} error={validation.errors.status} isRequired label="Status" name="status" options={statusOptions} />
                        <Field defaultValue={product?.shortName} error={validation.errors.shortName} label="Short Name" name="shortName" />
                      </div>
                      <TextareaField defaultValue={product?.description} error={validation.errors.description} label="Internal Description" name="description" />
                      <TextareaField defaultValue={product?.internalNotes} error={validation.errors.internalNotes} label="Internal Notes" name="internalNotes" />
                    </div>
                  ),
                },
                {
                  key: "units",
                  label: "Units",
                  content: (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <SelectField defaultValue={product?.baseUomId} error={validation.errors.baseUomId} isRequired label="Base UOM" name="baseUomId" options={data.uoms} />
                        <SelectField defaultValue={product?.purchaseUomId} error={validation.errors.purchaseUomId} label="Purchase UOM" name="purchaseUomId" options={data.uoms} />
                        <SelectField defaultValue={product?.salesUomId} error={validation.errors.salesUomId} label="Sales UOM" name="salesUomId" options={data.uoms} />
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <table className="w-full min-w-[42rem] text-sm">
                          <thead className="bg-[hsl(var(--muted))]"><tr><th className="p-3 text-start">Unit</th><th className="p-3 text-start">Conversion Factor</th><th className="p-3 text-start">Barcode</th><th className="p-3 text-start">Default Use</th></tr></thead>
                          <tbody>
                            <tr className="border-t"><td className="p-3">Base UOM</td><td className="p-3">1.000000000</td><td className="p-3">{product?.barcode ?? "Uses product barcode"}</td><td className="p-3">Base / Online</td></tr>
                            <tr className="border-t"><td className="p-3">Purchase UOM</td><td className="p-3">1.000000000</td><td className="p-3">Optional child row</td><td className="p-3">Purchase</td></tr>
                            <tr className="border-t"><td className="p-3">Sales UOM</td><td className="p-3">1.000000000</td><td className="p-3">Optional child row</td><td className="p-3">Sales</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "inventory",
                  label: "Inventory",
                  content: (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <SelectField defaultValue={product?.defaultWarehouseId} error={validation.errors.defaultWarehouseId} label="Default Warehouse" name="defaultWarehouseId" options={data.warehouses} />
                      <SelectField defaultValue={product?.defaultLocationId} error={validation.errors.defaultLocationId} label="Default Location" name="defaultLocationId" options={data.locations} />
                      <Field defaultValue={formatNumber(product?.openingBalanceQty ?? 0)} error={validation.errors.openingBalanceQty} label="Opening Balance" name="openingBalanceQty" type="number" />
                      <Field defaultValue={formatNumber(product?.minimumStockQty ?? 0)} error={validation.errors.minimumStockQty} label="Minimum Stock" name="minimumStockQty" type="number" />
                      <Field defaultValue={formatNumber(product?.maximumStockQty)} error={validation.errors.maximumStockQty} label="Maximum Stock" name="maximumStockQty" type="number" />
                      <Field defaultValue={formatNumber(product?.reorderPointQty)} error={validation.errors.reorderPointQty} label="Reorder Point" name="reorderPointQty" type="number" />
                      <SelectField defaultValue={product?.trackingMode ?? "none"} error={validation.errors.trackingMode} isRequired label="Tracking Mode" name="trackingMode" options={trackingOptions} />
                      <SelectField defaultValue={product?.reservationPolicy ?? "soft"} error={validation.errors.reservationPolicy} isRequired label="Reservation Policy" name="reservationPolicy" options={reservationOptions} />
                      <CheckboxField defaultChecked={product?.isStockable ?? true} label="Stockable" name="isStockable" />
                      <CheckboxField defaultChecked={product?.isSellable ?? true} label="Sellable" name="isSellable" />
                      <CheckboxField defaultChecked={product?.isPurchasable ?? true} label="Purchasable" name="isPurchasable" />
                      <CheckboxField defaultChecked={product?.hasVariants ?? false} label="Has variants" name="hasVariants" />
                      <CheckboxField defaultChecked={product?.hasSerialTracking ?? false} label="Has serial tracking" name="hasSerialTracking" />
                      <CheckboxField defaultChecked={product?.hasLotTracking ?? false} label="Has lot tracking" name="hasLotTracking" />
                    </div>
                  ),
                },
                {
                  key: "pricing",
                  label: "Pricing",
                  content: (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <Field defaultValue={formatNumber(product?.purchasePrice ?? 0)} error={validation.errors.purchasePrice} label="Purchase Price" name="purchasePrice" type="number" />
                      <Field defaultValue={formatNumber(product?.retailPrice ?? 0)} error={validation.errors.retailPrice} label="Retail Price" name="retailPrice" type="number" />
                      <Field defaultValue={formatNumber(product?.wholesalePrice ?? 0)} error={validation.errors.wholesalePrice} label="Wholesale Price" name="wholesalePrice" type="number" />
                      <Field defaultValue={formatNumber(product?.onlinePrice ?? 0)} error={validation.errors.onlinePrice} label="Online Price" name="onlinePrice" type="number" />
                      <SelectField defaultValue={product?.currencyId} error={validation.errors.currencyId} label="Currency" name="currencyId" options={data.currencies} />
                      <SelectField defaultValue={product?.taxDefinitionId} error={validation.errors.taxDefinitionId} label="Tax Definition" name="taxDefinitionId" options={data.taxDefinitions} />
                      <CheckboxField defaultChecked={product?.discountAllowed ?? false} label="Discount Allowed" name="discountAllowed" />
                      <CheckboxField defaultChecked={product?.priceIncludesTax ?? false} label="Price Includes Tax" name="priceIncludesTax" />
                      <Field defaultValue={formatNumber(product?.commissionRate ?? 0)} error={validation.errors.commissionRate} label="Commission Rate" name="commissionRate" type="number" />
                    </div>
                  ),
                },
                {
                  key: "physical",
                  label: "Physical / Shipping",
                  content: (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <Field defaultValue={formatNumber(product?.weight)} error={validation.errors.weight} label="Weight" name="weight" type="number" />
                      <Field defaultValue={formatNumber(product?.length)} error={validation.errors.length} label="Length" name="length" type="number" />
                      <Field defaultValue={formatNumber(product?.width)} error={validation.errors.width} label="Width" name="width" type="number" />
                      <Field defaultValue={formatNumber(product?.height)} error={validation.errors.height} label="Height" name="height" type="number" />
                      <Field defaultValue={formatNumber(product?.volume)} error={validation.errors.volume} label="Volume" name="volume" type="number" />
                      <Field defaultValue={product?.shippingClass} error={validation.errors.shippingClass} label="Shipping Class" name="shippingClass" />
                      <Field defaultValue={product?.hsCode} error={validation.errors.hsCode} label="HS Code" name="hsCode" />
                      <Field defaultValue={product?.countryOfOrigin} error={validation.errors.countryOfOrigin} label="Country of Origin" name="countryOfOrigin" />
                    </div>
                  ),
                },
                {
                  key: "online",
                  label: "Online",
                  content: (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <CheckboxField defaultChecked={product?.onlineEnabled ?? false} label="Online Enabled" name="onlineEnabled" />
                        <SelectField defaultValue={product?.onlineStatus ?? "draft"} error={validation.errors.onlineStatus} label="Online Status" name="onlineStatus" options={onlineStatusOptions} />
                        <Field defaultValue={product?.onlineSlug} error={validation.errors.onlineSlug} label="Slug" name="onlineSlug" />
                        <Field defaultValue={product?.onlineTitle} error={validation.errors.onlineTitle} label="Online Title" name="onlineTitle" />
                        <Field defaultValue={product?.seoTitle} error={validation.errors.seoTitle} label="SEO Title" name="seoTitle" />
                        <Field defaultValue={product?.seoDescription} error={validation.errors.seoDescription} label="SEO Description" name="seoDescription" />
                        <Field defaultValue={arrayToText(product?.seoKeywords)} error={validation.errors.seoKeywords} label="SEO Keywords" name="seoKeywords" />
                        <Field defaultValue={product?.ogImageUrl} error={validation.errors.ogImageUrl} label="OG Image URL" name="ogImageUrl" />
                        <Field defaultValue={product?.canonicalUrl} error={validation.errors.canonicalUrl} label="Canonical URL" name="canonicalUrl" />
                        <CheckboxField defaultChecked={product?.isFeatured ?? false} label="Featured" name="isFeatured" />
                        <CheckboxField defaultChecked={product?.isNewArrival ?? false} label="New Arrival" name="isNewArrival" />
                        <CheckboxField defaultChecked={product?.isBestSeller ?? false} label="Best Seller" name="isBestSeller" />
                        <CheckboxField defaultChecked={product?.allowReviews ?? true} label="Allow Reviews" name="allowReviews" />
                        <CheckboxField defaultChecked={product?.allowRatings ?? true} label="Allow Ratings" name="allowRatings" />
                      </div>
                      <TextareaField defaultValue={product?.onlineShortDescription} error={validation.errors.onlineShortDescription} label="Short Description" name="onlineShortDescription" />
                      <TextareaField defaultValue={product?.onlineLongDescription} error={validation.errors.onlineLongDescription} label="Long Description" name="onlineLongDescription" />
                      <TextareaField defaultValue={arrayToText(product?.onlineFeatures)} error={validation.errors.onlineFeatures} label="Features" name="onlineFeatures" />
                      <TextareaField defaultValue={specsToText(product?.onlineSpecifications)} error={validation.errors.onlineSpecifications} label="Specifications" name="onlineSpecifications" />
                      <TextareaField defaultValue={arrayToText(product?.onlinePackageContents)} error={validation.errors.onlinePackageContents} label="Package Contents" name="onlinePackageContents" />
                    </div>
                  ),
                },
                {
                  key: "media",
                  label: "Media",
                  content: (
                    <div className="space-y-4">
                      <Field defaultValue={product?.coverImageUrl} error={validation.errors.coverImageUrl} label="Cover Image" name="coverImageUrl" />
                      <TextareaField defaultValue={arrayToText(product?.galleryUrls)} error={validation.errors.galleryUrls} label="Gallery URLs" name="galleryUrls" />
                      <TextareaField defaultValue={arrayToText(product?.videoUrls)} error={validation.errors.videoUrls} label="Video URLs" name="videoUrls" />
                      <TextareaField defaultValue={arrayToText(product?.manualUrls)} error={validation.errors.manualUrls} label="Manual URLs" name="manualUrls" />
                      <TextareaField defaultValue="" label="Attachments" name="attachmentUrls" />
                    </div>
                  ),
                },
                {
                  key: "audit",
                  label: "Audit",
                  content: (
                    <div className="space-y-3 text-sm">
                      <ReadOnlyAuditField label="Created by" value={product?.createdBy ?? "Not saved yet"} />
                      <ReadOnlyAuditField label="Created at" value={product?.createdAt ? new Date(product.createdAt).toLocaleString() : "Not saved yet"} />
                      <ReadOnlyAuditField label="Updated by" value={product?.updatedBy ?? "Not saved yet"} />
                      <ReadOnlyAuditField label="Updated at" value={product?.updatedAt ? new Date(product.updatedAt).toLocaleString() : "Not saved yet"} />
                      <ReadOnlyAuditField label="Version" value={String(product?.version ?? 1)} />
                      <AuditActivityTimeline events={activityEvents} />
                    </div>
                  ),
                },
              ]}
            />
          </form>
        </RecordFormSection>
        {error ? <p className="rounded-md border border-[hsl(var(--danger))] p-3 text-sm text-[hsl(var(--danger))]" role="alert">{error}</p> : null}
      </div>
    </RecordFormDialog>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <span className="rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">{status}</span>;
}

function arrayToText(value?: readonly string[] | null) {
  return value?.join("\n") ?? "";
}

function specsToText(value?: Record<string, string> | null) {
  return Object.entries(value ?? {}).map(([key, specValue]) => `${key}: ${specValue}`).join("\n");
}

function formatNumber(value?: number | null) {
  return value === null || typeof value === "undefined" ? "" : String(value);
}

function HelpBlock() {
  return (
    <div className="rounded-xl border bg-[hsl(var(--muted))] p-4 text-sm text-muted-foreground">
      <h3 className="font-medium text-foreground">How this works</h3>
      <p className="mt-1">Product master is the shared definition of an item or service before it is used in inventory transactions. Create categories and units first, then add descriptions, flags, pricing readiness, online content, and media here.</p>
      <p className="mt-2">Internal description and notes are for ERP users. Online descriptions, features, specifications, SEO, and visibility control what is ready for e-commerce presentation. Pricing fields prepare purchase, retail, wholesale, and online prices without costing or accounting calculations.</p>
    </div>
  );
}

function ReadOnlyAuditField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 rounded-md border p-3 sm:grid-cols-[10rem_1fr]">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function Field({ defaultValue, error, isRequired, label, name, type = "text" }: Readonly<{ defaultValue?: string | null; error?: string; isRequired?: boolean; label: string; name: string; type?: string }>) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span>
      <input className={cn("w-full rounded-md border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue ?? ""} min={type === "number" ? "0" : undefined} name={name} required={isRequired} step={type === "number" ? "0.000001" : undefined} type={type} {...fieldA11yProps(name, error)} />
      <FieldErrorText id={fieldErrorId(name)}>{error}</FieldErrorText>
    </label>
  );
}

function TextareaField({ defaultValue, error, label, name }: Readonly<{ defaultValue?: string | null; error?: string; label: string; name: string }>) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea className={cn("min-h-24 w-full rounded-md border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue ?? ""} name={name} {...fieldA11yProps(name, error)} />
      <FieldErrorText id={fieldErrorId(name)}>{error}</FieldErrorText>
    </label>
  );
}

function CheckboxField({ defaultChecked, label, name }: Readonly<{ defaultChecked: boolean; label: string; name: string }>) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-within:ring-2 focus-within:ring-[hsl(var(--accent))]">
      <input className="size-4 rounded border" defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function ReadOnlyCodeField({ defaultValue, label, name }: Readonly<{ defaultValue?: string | null; label: string; name: string }>) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} type="hidden" value={defaultValue ?? ""} />
      <input className="w-full rounded-md border bg-[hsl(var(--muted))] px-3 py-2 text-muted-foreground" readOnly type="text" value={defaultValue ? displayBusinessCode(defaultValue, productCodeConfig) : "Auto-generated on save"} />
    </label>
  );
}

function SelectField({ defaultValue, error, isRequired, label, name, options }: Readonly<{ defaultValue?: string | null; error?: string; isRequired?: boolean; label: string; name: string; options: readonly { id: string; label: string; meta?: string }[] | readonly string[] }>) {
  const hasLookupOptions = options.length > 0 && typeof options[0] !== "string";
  if (hasLookupOptions) {
    const lookupOptions = options as readonly { id: string; label: string; meta?: string }[];
    return (
      <label className="space-y-1 text-sm">
        <span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span>
        <EntityLookup emptyMessage="No related records found." error={error} label={isRequired ? "Select..." : "Any"} name={name} options={lookupOptions.map((option) => ({ ...option, subtitle: option.meta }))} placeholder={`Search ${label.toLowerCase()}...`} required={isRequired} value={defaultValue ?? ""} />
      </label>
    );
  }
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}{isRequired ? <RequiredFieldMarker /> : null}</span>
      <select className={cn("w-full rounded-md border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]", error && "border-[hsl(var(--danger))]")} defaultValue={defaultValue ?? ""} name={name} required={isRequired} {...fieldA11yProps(name, error)}>
        {!isRequired ? <option value="">Any</option> : <option value="">Select...</option>}
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.id;
          const optionLabel = typeof option === "string" ? option : `${option.label}${option.meta ? ` (${option.meta})` : ""}`;
          return <option key={value} value={value}>{optionLabel}</option>;
        })}
      </select>
      <FieldErrorText id={fieldErrorId(name)}>{error}</FieldErrorText>
      <FieldWarningText id={`${name}-warning`} />
    </label>
  );
}

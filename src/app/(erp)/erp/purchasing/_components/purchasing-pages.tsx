import type { ReactNode } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import {
  createPurchaseDocumentAction,
  postPurchaseReceiptAction,
  reversePurchaseReceiptAction,
  transitionPurchaseDocumentAction,
} from "@/features/purchasing/routes/actions/purchasing.actions";
import type { PurchaseDocumentDetail, PurchaseDocumentKind, PurchaseStatus } from "@/features/purchasing/public-api";
import { PURCHASING_PERMISSIONS } from "@/features/purchasing/public-api";
import { createPurchasingCatalogLookupService } from "@/features/purchasing/routes/service-factory";
import {
  createOxOperatorError,
  createOxRuntimeContext,
  resolveOxSmartDefaults,
  type OxResolvedDefault,
  type OxWizardState,
} from "@/platform/operator-experience/public-api";
import { AppShell, Button, DatePicker, EnterpriseDataTable, EntityLookup, FieldGroup, FormGrid, OperatorContextBar, OperatorErrorMessage, OperatorProgressiveSection, OperatorWizardProgress, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader, ScannerInputFrame, SmartDefaultsSummary } from "@/shared/ui";

import { createErpShellChrome } from "../../../erp-shell-model";
import { resolveErpShellRuntime } from "../../../erp-security.server";
import { PurchaseDocumentDetailWorkspace } from "./purchase-document-detail-workspace";

export const PURCHASE_PAGE_CONFIGS: Record<string, { kind: PurchaseDocumentKind; title: string; description: string }> = {
  orders: {
    description: "Approved supplier commitments that can later be received through inventory services.",
    kind: "order",
    title: "Purchase Orders",
  },
  receipts: {
    description: "Receipt foundations that post through public inventory transaction services only.",
    kind: "receipt",
    title: "Purchase Receipts",
  },
  requests: {
    description: "Internal demand capture with approval placeholder and document collaboration.",
    kind: "request",
    title: "Purchase Requests",
  },
  rfqs: {
    description: "Supplier quotation requests for purchase planning only.",
    kind: "rfq",
    title: "RFQs",
  },
};

function valueToText(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type LookupOption = Readonly<{ id: string; label: string; meta?: string }>;

async function loadPurchasingLookups() {
  const service = await createPurchasingCatalogLookupService();
  return service.loadPurchasingLookups();
}

function labelFor(options: readonly LookupOption[], value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value);
  return options.find((option) => option.id === text)?.label ?? "Selected record";
}

function hiddenIdempotencyKey(prefix: string, id: string) {
  return `${prefix}:${id}:${Date.now()}`;
}

function purchaseWizardState(kind: PurchaseDocumentKind): OxWizardState {
  return {
    activeStepKey: kind === "receipt" ? "receive" : "document",
    canSaveDraft: true,
    canSubmit: false,
    progressPercent: kind === "receipt" ? 50 : 33,
    steps: [
      { canSaveDraft: true, description: "Confirm branch, title, supplier, and dates.", key: "document", label: "Document", requiredFieldNames: ["branchId", "title"], state: kind === "receipt" ? "complete" : "current", validationScope: "step" },
      { canSaveDraft: true, description: "Scan or select product and quantity.", key: "lines", label: "Lines", requiredFieldNames: ["productId", "quantity"], state: kind === "receipt" ? "complete" : "pending", validationScope: "step" },
      { canSaveDraft: true, description: "Confirm warehouse, location, and receipt source.", key: "receive", label: "Receive", requiredFieldNames: ["purchaseOrderId", "destinationWarehouseId", "destinationLocationId"], state: kind === "receipt" ? "current" : "pending", validationScope: "step" },
      { canSaveDraft: false, description: "Review before submit.", key: "review", label: "Review", requiredFieldNames: [], state: "pending", validationScope: "task" },
    ],
    wizardKey: `purchasing.${kind}.operator-wizard`,
  };
}

export function configForSlug(slug: string) {
  const config = PURCHASE_PAGE_CONFIGS[slug];
  if (!config) throw new Error("Unsupported purchasing document type.");
  return config;
}

export function slugForKind(kind: PurchaseDocumentKind) {
  if (kind === "request") return "requests";
  if (kind === "rfq") return "rfqs";
  if (kind === "order") return "orders";
  return "receipts";
}

export async function PurchasingShell({ activeSlug, children }: Readonly<{ activeSlug: string; children: ReactNode }>) {
  const items = Object.entries(PURCHASE_PAGE_CONFIGS).map(([slug, config]) => ({
    href: `/erp/purchasing/${slug}`,
    isActive: slug === activeSlug,
    key: slug,
    label: config.title,
  }));
  const runtime = await resolveErpShellRuntime({ permission: PURCHASING_PERMISSIONS.view });

  return (
    <AppShell
      {...createErpShellChrome("purchasing", runtime)}
      breadcrumbs={[{ label: "Apps", href: "/erp" }, { label: "Purchasing", href: "/erp/purchasing" }]}
      workspace={{ key: "purchasing", name: "Purchasing", icon: <ShoppingCart className="size-4" /> }}
      workspaceNav={items}
    >
      {children}
    </AppShell>
  );
}

export async function PurchaseDocumentListPage({
  config,
  errorMessage,
  params,
  result,
}: Readonly<{
  config: { kind: PurchaseDocumentKind; title: string; description: string };
  errorMessage?: string;
  params: Record<string, string | undefined>;
  result: { nextCursor: string | null; pageSize: number; records: readonly Record<string, unknown>[] };
}>) {
  const slug = slugForKind(config.kind);
  const lookups = await loadPurchasingLookups();
  const runtime = await resolveErpShellRuntime({ permission: PURCHASING_PERMISSIONS.view });
  const oxContext = createOxRuntimeContext({
    branchId: runtime.branchId,
    branchName: runtime.branchName,
    companyId: runtime.companyId,
    companyName: runtime.companyName,
    experience: "erp",
    roleKey: "purchasing-officer",
    tenantId: runtime.tenantId,
  });
  return (
    <PageContainer>
      <OperatorContextBar context={oxContext} />
      <PageHeader description={config.description} title={config.title}>
        <PageActions>
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/erp/purchasing/${slug}/new`}>
            Create
          </Link>
        </PageActions>
      </PageHeader>
      <PageContent>
        {errorMessage ? (
          <OperatorErrorMessage
            error={createOxOperatorError({
              code: "PURCHASING_LIST_LOAD_FAILED",
              fix: "Refresh the page or narrow the current filters. If the issue continues, contact an administrator.",
              problem: `Could not load ${config.title.toLowerCase()}.`,
              reason: errorMessage,
            })}
          />
        ) : null}
        <EnterpriseDataTable<Record<string, unknown>>
          columns={[
            { key: "title", header: "Title", render: (record) => String(record.title) },
            { key: "status", header: "Status", render: (record) => String(record.status) },
            { key: "supplierId", header: "Supplier", render: (record) => labelFor(lookups.suppliers, record.supplierId) },
            { key: "documentDate", header: "Date", render: (record) => valueToText(record.documentDate) },
            { key: "branchId", header: "Branch", render: (record) => labelFor(lookups.branches, record.branchId) },
          ]}
          emptyMessage={`No ${config.title.toLowerCase()} found.`}
          errorMessage={errorMessage}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
          records={result.records}
          rowActions={(record) => [{ href: `/erp/purchasing/${slug}/${record.id}`, key: "view", label: "View" }]}
          state={{ globalSearch: params.search }}
        />
      </PageContent>
    </PageContainer>
  );
}

export async function PurchaseDocumentFormPage({ config }: Readonly<{ config: { kind: PurchaseDocumentKind; title: string; description: string } }>) {
  const [receiptLookups, runtime] = await Promise.all([
    config.kind === "receipt" ? loadPurchasingLookups() : Promise.resolve(null),
    resolveErpShellRuntime({ permission: PURCHASING_PERMISSIONS.view }),
  ]);
  const oxContext = createOxRuntimeContext({
    branchId: runtime.branchId,
    branchName: runtime.branchName,
    companyId: runtime.companyId,
    companyName: runtime.companyName,
    experience: "erp",
    roleKey: "purchasing-officer",
    tenantId: runtime.tenantId,
  });
  const defaults: readonly OxResolvedDefault[] = resolveOxSmartDefaults(
    [
      {
        confidence: "high",
        contextKey: "branchId",
        fieldName: "branchId",
        key: "purchase.default-branch",
        label: "Branch",
        requiresConfirmation: false,
        source: "context",
      },
      {
        confidence: "high",
        contextKey: "transactionDate",
        fieldName: config.kind === "request" ? "neededBy" : "documentDate",
        key: "purchase.default-date",
        label: config.kind === "request" ? "Needed by" : "Document date",
        requiresConfirmation: true,
        source: "context",
      },
    ],
    oxContext,
  );

  return (
    <PageContainer>
      <OperatorContextBar context={oxContext} />
      <PageHeader description={config.description} title={`Create ${config.title}`} />
      <OperatorWizardProgress state={purchaseWizardState(config.kind)} />
      <SmartDefaultsSummary defaults={defaults} />
      <PageForm action={createPurchaseDocumentAction.bind(null, config.kind)} title={config.title}>
        <OperatorProgressiveSection
          category="essential"
          description="Confirm the purchasing context. Branch is inherited from your current workspace."
          title="Essential Document Details"
        >
          <FormGrid>
            <FieldGroup isRequired label="Branch">
              <EntityLookup label="Select branch" name="branchId" providerKey="platform.branches.lookup" required value={runtime.branchId} />
            </FieldGroup>
            <FieldGroup isRequired label="Title">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" defaultValue={config.title} name="title" required type="text" />
            </FieldGroup>
            {config.kind !== "request" ? (
              <FieldGroup isRequired={config.kind !== "rfq"} label="Supplier">
                <EntityLookup emptyMessage="Create the supplier first, then select it here." label="Select supplier" name="supplierId" providerKey="purchasing.suppliers.lookup" required={config.kind !== "rfq"} />
              </FieldGroup>
            ) : null}
            <FieldGroup label={config.kind === "request" ? "Needed By" : "Document Date"}>
              <DatePicker defaultValue={oxContext.transactionDate} name={config.kind === "request" ? "neededBy" : "documentDate"} />
            </FieldGroup>
            {config.kind === "receipt" ? (
              <>
                <FieldGroup isRequired label="Purchase Order">
                  <EntityLookup emptyMessage="No confirmed purchase orders are ready to receive." label="Select purchase order" name="purchaseOrderId" providerKey="purchasing.documents.lookup" required />
                </FieldGroup>
                <FieldGroup isRequired label="Destination Warehouse">
                  <EntityLookup label="Select warehouse" name="destinationWarehouseId" providerKey="inventory.warehouses.lookup" required />
                </FieldGroup>
                <FieldGroup isRequired label="Destination Location">
                  <EntityLookup label="Select location" name="destinationLocationId" providerKey="inventory.locations.lookup" required />
                </FieldGroup>
              </>
            ) : null}
          </FormGrid>
        </OperatorProgressiveSection>
        <OperatorProgressiveSection
          category="essential"
          description="Scan the product first when possible, then confirm quantity and unit."
          title="Line Entry"
        >
          <ScannerInputFrame label="Product barcode" placeholder="Scan product barcode or type SKU" />
          <FormGrid>
            <FieldGroup isRequired label="Product">
              <EntityLookup label="Select product" name="productId" placeholder="Search SKU, barcode, or product name..." providerKey="inventory.products.lookup" required />
            </FieldGroup>
            <FieldGroup isRequired label="Unit">
              <EntityLookup label="Select unit" name="unitId" providerKey="inventory.uoms.lookup" required />
            </FieldGroup>
            <FieldGroup isRequired label="Quantity">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" min="0.000001" name="quantity" required step="0.000001" type="number" />
            </FieldGroup>
            <FieldGroup label="Unit Price">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" min="0" name="unitPrice" step="0.000001" type="number" />
            </FieldGroup>
            {config.kind === "receipt" ? (
              <FieldGroup isRequired label="Purchase Order Line">
                <EntityLookup label="Select order line" name="purchaseOrderLineId" options={receiptLookups?.purchaseOrderLines ?? []} required />
              </FieldGroup>
            ) : null}
          </FormGrid>
        </OperatorProgressiveSection>
        <OperatorProgressiveSection category="advanced" policy={{ showAdvanced: false }} title="Advanced Details">
          <FormGrid>
            <FieldGroup label="Line Note">
              <input className="min-h-12 w-full rounded-md border px-3 py-2 text-base" name="lineNote" type="text" />
            </FieldGroup>
          </FormGrid>
        </OperatorProgressiveSection>
        <PageActions>
          <Button className="min-h-12" type="submit" variant="primary">
            Save Draft
          </Button>
          <Link className="min-h-12 rounded-md border px-4 py-3 text-sm" href={`/erp/purchasing/${slugForKind(config.kind)}`}>
            Cancel
          </Link>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export async function PurchaseDocumentDetailPage({ detail }: Readonly<{ detail: PurchaseDocumentDetail }>) {
  const { document } = detail;
  const [lookups, runtime] = await Promise.all([
    loadPurchasingLookups(),
    resolveErpShellRuntime({ permission: PURCHASING_PERMISSIONS.view }),
  ]);
  const oxContext = createOxRuntimeContext({
    branchId: runtime.branchId,
    branchName: runtime.branchName,
    companyId: runtime.companyId,
    companyName: runtime.companyName,
    experience: "erp",
    roleKey: "purchasing-officer",
    tenantId: runtime.tenantId,
  });
  return (
    <PageContainer>
      <OperatorContextBar context={oxContext} />
      <PageHeader description="Document collaboration uses Sprint 6 comments, timeline, attachments, and approval placeholder through the document shell." title={document.title} />
      <PageContent>
        <PurchaseDocumentDetailWorkspace canManage={document.status === "draft"} detail={detail} lookups={lookups} />
        <EnterpriseDataTable<Record<string, unknown>>
          columns={[
            { key: "lineNumber", header: "Line", render: (record) => valueToText(record.lineNumber) },
            { key: "productId", header: "Product", render: (record) => labelFor(lookups.products, record.productId) },
            { key: "unitId", header: "Unit", render: (record) => labelFor(lookups.units, record.unitId) },
            { key: "quantity", header: "Quantity", render: (record) => valueToText(record.quantity) },
          ]}
          emptyMessage="No lines found."
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: detail.lines.length || 1, nextCursor: null }}
          records={detail.lines as readonly Record<string, unknown>[]}
        />
        <LifecycleActions detail={detail} />
      </PageContent>
      <PageFooter>Purchasing does not post accounting and does not mutate stock directly.</PageFooter>
    </PageContainer>
  );
}

function LifecycleActions({ detail }: Readonly<{ detail: PurchaseDocumentDetail }>) {
  const { document } = detail;
  const actions = nextActions(document.kind, document.status);
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="text-sm font-medium">Lifecycle Actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((status) => (
          <form action={transitionPurchaseDocumentAction.bind(null, document.kind, document.id, status)} key={status}>
            <button className="rounded-md border px-3 py-2 text-sm capitalize" type="submit">
              {status.replaceAll("_", " ")}
            </button>
          </form>
        ))}
        {document.kind === "receipt" && document.status === "submitted" ? (
          <form action={postPurchaseReceiptAction.bind(null, document.id)}>
            <input name="idempotencyKey" type="hidden" value={hiddenIdempotencyKey("purchase-receipt-post", document.id)} />
            <Button className="min-h-12" type="submit" variant="primary">
              Post Receipt
            </Button>
          </form>
        ) : null}
        {document.kind === "receipt" && document.status === "posted" ? (
          <form action={reversePurchaseReceiptAction.bind(null, document.id)}>
            <input name="idempotencyKey" type="hidden" value={hiddenIdempotencyKey("purchase-receipt-reverse", document.id)} />
            <button className="min-h-12 rounded-md border px-4 py-2 text-sm" type="submit">
              Reverse Receipt
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function nextActions(kind: PurchaseDocumentKind, status: PurchaseStatus): PurchaseStatus[] {
  if (kind === "request" && status === "draft") return ["submitted", "cancelled"];
  if (kind === "request" && status === "submitted") return ["approved", "rejected", "cancelled"];
  if (kind === "request" && ["approved", "rejected"].includes(status)) return ["closed", "cancelled"];
  if (kind === "rfq" && status === "draft") return ["sent", "cancelled"];
  if (kind === "rfq" && status === "sent") return ["quoted", "closed", "cancelled"];
  if (kind === "rfq" && status === "quoted") return ["closed", "cancelled"];
  if (kind === "order" && status === "draft") return ["submitted", "cancelled"];
  if (kind === "order" && status === "submitted") return ["approved", "cancelled"];
  if (kind === "order" && status === "approved") return ["confirmed", "cancelled"];
  if (kind === "order" && ["confirmed", "partially_received"].includes(status)) return ["closed", "cancelled"];
  if (kind === "order" && status === "received") return ["closed"];
  if (kind === "receipt" && status === "draft") return ["submitted", "cancelled"];
  return [];
}

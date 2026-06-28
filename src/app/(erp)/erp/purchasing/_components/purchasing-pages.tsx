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
import { AppShell, EnterpriseDataTable, FieldGroup, FormGrid, FormSection, PageActions, PageContainer, PageContent, PageFooter, PageForm, PageHeader } from "@/shared/ui";

import { createErpShellChrome, resolveErpRuntimeContext } from "../../../erp-shell-model";

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
  const runtime = await resolveErpRuntimeContext();

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

export function PurchaseDocumentListPage({
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
  return (
    <PageContainer>
      <PageHeader description={config.description} title={config.title}>
        <PageActions>
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/erp/purchasing/${slug}/new`}>
            Create
          </Link>
        </PageActions>
      </PageHeader>
      <PageContent>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={[
            { key: "title", header: "Title", render: (record) => String(record.title) },
            { key: "status", header: "Status", render: (record) => String(record.status) },
            { key: "supplierId", header: "Supplier", render: (record) => valueToText(record.supplierId) },
            { key: "documentDate", header: "Date", render: (record) => valueToText(record.documentDate) },
            { key: "branchId", header: "Branch", render: (record) => String(record.branchId) },
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

export function PurchaseDocumentFormPage({ config }: Readonly<{ config: { kind: PurchaseDocumentKind; title: string; description: string } }>) {
  return (
    <PageContainer>
      <PageHeader description={config.description} title={`Create ${config.title}`} />
      <PageForm action={createPurchaseDocumentAction.bind(null, config.kind)} title={config.title}>
        <FormSection description="The document shell is created through Sprint 6 business documents." title="Document">
          <FormGrid>
            <FieldGroup isRequired label="Branch ID">
              <input className="w-full rounded-md border px-3 py-2" name="branchId" required type="text" />
            </FieldGroup>
            <FieldGroup isRequired label="Title">
              <input className="w-full rounded-md border px-3 py-2" name="title" required type="text" />
            </FieldGroup>
            {config.kind !== "request" ? (
              <FieldGroup isRequired={config.kind !== "rfq"} label="Supplier ID">
                <input className="w-full rounded-md border px-3 py-2" name="supplierId" required={config.kind !== "rfq"} type="text" />
              </FieldGroup>
            ) : null}
            <FieldGroup label={config.kind === "request" ? "Needed By" : "Document Date"}>
              <input className="w-full rounded-md border px-3 py-2" name={config.kind === "request" ? "neededBy" : "documentDate"} type="date" />
            </FieldGroup>
            {config.kind === "receipt" ? (
              <>
                <FieldGroup isRequired label="Purchase Order ID">
                  <input className="w-full rounded-md border px-3 py-2" name="purchaseOrderId" required type="text" />
                </FieldGroup>
                <FieldGroup isRequired label="Destination Warehouse ID">
                  <input className="w-full rounded-md border px-3 py-2" name="destinationWarehouseId" required type="text" />
                </FieldGroup>
                <FieldGroup isRequired label="Destination Location ID">
                  <input className="w-full rounded-md border px-3 py-2" name="destinationLocationId" required type="text" />
                </FieldGroup>
              </>
            ) : null}
          </FormGrid>
        </FormSection>
        <FormSection description="Sprint 11 keeps creation to one line while tables and services support multiple lines." title="Line">
          <FormGrid>
            <FieldGroup isRequired label="Product ID">
              <input className="w-full rounded-md border px-3 py-2" name="productId" required type="text" />
            </FieldGroup>
            <FieldGroup isRequired label="Unit ID">
              <input className="w-full rounded-md border px-3 py-2" name="unitId" required type="text" />
            </FieldGroup>
            <FieldGroup isRequired label="Quantity">
              <input className="w-full rounded-md border px-3 py-2" min="0.000001" name="quantity" required step="0.000001" type="number" />
            </FieldGroup>
            <FieldGroup label="Placeholder Unit Price">
              <input className="w-full rounded-md border px-3 py-2" min="0" name="unitPrice" step="0.000001" type="number" />
            </FieldGroup>
            {config.kind === "receipt" ? (
              <FieldGroup isRequired label="Purchase Order Line ID">
                <input className="w-full rounded-md border px-3 py-2" name="purchaseOrderLineId" required type="text" />
              </FieldGroup>
            ) : null}
          </FormGrid>
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save Draft
          </button>
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/erp/purchasing/${slugForKind(config.kind)}`}>
            Cancel
          </Link>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export function PurchaseDocumentDetailPage({ detail }: Readonly<{ detail: PurchaseDocumentDetail }>) {
  const { document } = detail;
  return (
    <PageContainer>
      <PageHeader description="Document collaboration uses Sprint 6 comments, timeline, attachments, and approval placeholder through the document shell." title={document.title} />
      <PageContent>
        <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            {Object.entries(document).map(([key, value]) => (
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
          <form action={postPurchaseReceiptAction.bind(null, document.id)} className="flex gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" name="idempotencyKey" placeholder="Posting idempotency key" required type="text" />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
              Post Receipt
            </button>
          </form>
        ) : null}
        {document.kind === "receipt" && document.status === "posted" ? (
          <form action={reversePurchaseReceiptAction.bind(null, document.id)} className="flex gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" name="idempotencyKey" placeholder="Reversal idempotency key" required type="text" />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">
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

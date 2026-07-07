import {
  INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT,
  INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT,
  INVENTORY_DOCUMENT_LINE_CONTRACT,
  INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT,
  INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS,
  INVENTORY_INVENTORY_STATUSES,
  INVENTORY_OBJECT_REF_CONTRACT,
} from "@/features/inventory/public-api";
import { PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { InventoryShell } from "../_components/inventory-shell";

const documentContracts = Object.values(INVENTORY_FOUNDATION_DOCUMENT_CONTRACTS);

export default function InventoryDocumentFoundationPage() {
  return (
    <InventoryShell activeKey="document-foundation">
      <PageContainer>
        <PageHeader
          description="Inventory document foundation and current-state projection contracts. No ledger runtime, posting, or operational transaction screens."
          title="Document Foundation"
        />
        <PageContent>
          <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Identity vs Current State</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Product, lot, serial, and handling unit records are identity/configuration layers only.
              Current quantity, warehouse, location, handling unit, custodian, availability, reservation, and issued/sold state are derived from inventory ledger projections.
            </p>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-muted-foreground">Projection Writer</dt><dd>{INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.projectionWriter}</dd></div>
              <div><dt className="text-muted-foreground">Identity Owns Current State</dt><dd>{INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.identityOwnsCurrentState ? "Yes" : "No"}</dd></div>
              <div><dt className="text-muted-foreground">Projection Runtime</dt><dd>{INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.projectionRuntimeImplemented ? "Implemented" : "Readiness only"}</dd></div>
              <div><dt className="text-muted-foreground">Ledger Runtime</dt><dd>{INVENTORY_DOCUMENT_ARCHITECTURE_CONTRACT.implementsInventoryLedger ? "Implemented" : "Readiness only"}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Foundation Document Types</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2">Document</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Source Apps</th>
                    <th className="px-2 py-2">Posting</th>
                    <th className="px-2 py-2">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {documentContracts.map((contract) => (
                    <tr className="border-b" key={contract.key}>
                      <td className="px-2 py-2">{contract.label}</td>
                      <td className="px-2 py-2">{contract.documentType}</td>
                      <td className="px-2 py-2">{contract.sourceApps.join(", ")}</td>
                      <td className="px-2 py-2">{contract.postingReadiness ? "Ready" : "N/A"}</td>
                      <td className="px-2 py-2">{contract.ledgerPostingReadiness ? "Ready" : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Inventory Object Ref</h3>
              <p className="mt-2 text-sm text-muted-foreground">Reusable object references for document lines and downstream engines.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {INVENTORY_OBJECT_REF_CONTRACT.objectTypes.map((objectType) => <li key={objectType}>{objectType.replaceAll("_", " ")}</li>)}
              </ul>
            </article>
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Inventory Status Readiness</h3>
              <p className="mt-2 text-sm text-muted-foreground">Status vocabulary for lines and projections. Availability logic is not implemented.</p>
              <p className="mt-3 text-sm">{INVENTORY_INVENTORY_STATUSES.join(" · ")}</p>
            </article>
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Document Lines</h3>
              <p className="mt-2 text-sm text-muted-foreground">Table: {INVENTORY_DOCUMENT_LINE_CONTRACT.lineTable}</p>
              <p className="text-sm">Ledger posting: {INVENTORY_DOCUMENT_LINE_CONTRACT.ledgerPostingImplemented ? "Yes" : "No"}</p>
            </article>
            <article className="rounded-lg border p-4">
              <h3 className="font-semibold">Document Snapshots</h3>
              <p className="mt-2 text-sm text-muted-foreground">Immutable snapshot metadata at document confirmation time.</p>
              <p className="text-sm">Runtime: {INVENTORY_DOCUMENT_SNAPSHOT_CONTRACT.snapshotRuntimeImplemented ? "Implemented" : "Readiness only"}</p>
            </article>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Projection-Only Identity Fields</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium">Serial</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.serialProjectionFields.map((field) => <li key={field}>{field}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium">Handling Unit</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {INVENTORY_CURRENT_STATE_PROJECTION_CONTRACT.handlingUnitProjectionFields.map((field) => <li key={field}>{field}</li>)}
                </ul>
              </div>
            </div>
          </section>
          </div>
        </PageContent>
      </PageContainer>
    </InventoryShell>
  );
}

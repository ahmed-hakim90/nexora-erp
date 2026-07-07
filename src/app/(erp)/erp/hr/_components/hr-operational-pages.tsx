import { resolveHrPageHelp } from "@/features/hr/public-api";
import { HR_CUSTODY_ASSET_TYPES, HR_REPORT_CARDS, HR_REQUEST_TYPES } from "@/features/hr/public-api";
import {
  archiveHrEmployeeDocumentAction,
  createHrCustodyAssignmentAction,
  createHrEmployeeDocumentAction,
  createHrRequestAction,
  transitionHrCustodyAction,
  transitionHrRequestAction,
} from "@/features/hr/routes/actions/hr-operational.actions";
import type { HrCustodyRecord, HrDocumentsWorkspaceData, HrRequestRecord } from "@/features/hr/routes/loaders/hr-operational.loader";
import { listHrDocumentTypeOptions } from "@/features/hr/routes/loaders/hr-operational.loader";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

function ActionButton({ label }: Readonly<{ label: string }>) {
  return (
    <Button size="sm" type="submit" variant="secondary">
      {label}
    </Button>
  );
}

export function HrDocumentsWorkspace({
  data,
  defaultEmployeeId,
  highlightUpload,
}: Readonly<{ data: HrDocumentsWorkspaceData; defaultEmployeeId?: string; highlightUpload?: boolean }>) {
  const documentTypes = listHrDocumentTypeOptions();
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Employee documents with expiry tracking and archive actions."
        help={resolveHrPageHelp("documents")}
        title="Documents / المستندات"
      />
      <div className="space-y-6">
        {defaultEmployeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Filtered to employee. <a className="underline" href="/erp/hr/documents">Show all</a>
          </p>
        ) : null}
        {data.alerts.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-medium">Expiry alerts</h2>
            {data.alerts.map((alert) => (
              <p className={`rounded-md border px-3 py-2 text-sm ${alert.severity === "error" ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/10"}`} key={alert.id}>
                {alert.label}
              </p>
            ))}
          </section>
        ) : (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">No expiring documents right now.</p>
        )}

        <form action={createHrEmployeeDocumentAction} className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5 ${highlightUpload ? "border-accent ring-1 ring-accent" : ""}`}>
          <EntityLookup value={defaultEmployeeId} label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="documentType" required>
            <option value="">Document type</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <Input name="fileName" placeholder="Document title (if no file)" />
          <input accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="text-sm" name="file" type="file" />
          <DatePicker name="expiryDate" placeholder="Expiry date" />
          <Button type="submit" variant="primary">
            Register document
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: "Document", key: "file", render: (record) => record.fileName },
            { header: "Employee", key: "employee", render: (record) => record.employeeLabel },
            { header: "Type", key: "type", render: (record) => record.documentType },
            { header: "Expiry", key: "expiry", render: (record) => record.expiresOn ?? "—" },
            { header: "Status", key: "status", render: (record) => record.status },
            { header: "Preview", key: "preview", render: (record) => (record.previewReady ? "Ready" : "Metadata only") },
            {
              header: "Actions",
              key: "actions",
              render: (record) => (
                <form action={archiveHrEmployeeDocumentAction.bind(null, record.id)}>
                  <ActionButton label="Archive" />
                </form>
              ),
            },
          ]}
          emptyMessage="No employee documents yet."
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 100 }}
          records={data.records}
        />
      </div>
    </PageContainer>
  );
}

export function HrRequestsWorkspace({
  records,
  defaultEmployeeId,
  highlightCreate,
}: Readonly<{ records: readonly HrRequestRecord[]; defaultEmployeeId?: string; highlightCreate?: boolean }>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="HR request hub with submit, approve, reject, return, and cancel actions."
        help={resolveHrPageHelp("requests")}
        title="Requests / الطلبات"
      />
      <div className="space-y-6">
        {defaultEmployeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Filtered to employee. <a className="underline" href="/erp/hr/requests">Show all</a>
          </p>
        ) : null}
        <form action={createHrRequestAction} className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-5 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}>
          <EntityLookup value={defaultEmployeeId} label="Requester" name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="requestType" required>
            <option value="">Request type</option>
            {HR_REQUEST_TYPES.map((type) => (
              <option key={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`} value={`${type.actionType}:${"metadataType" in type ? type.metadataType ?? "" : ""}`}>
                {type.label}
              </option>
            ))}
          </select>
          <DatePicker name="effectiveDate" placeholder="Effective date" required />
          <Input className="md:col-span-2" name="notes" placeholder="Notes" />
          <Button type="submit" variant="primary">
            Create request
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: "Request", key: "request", render: (record) => record.requestLabel },
            { header: "Number", key: "number", render: (record) => record.documentNumber },
            { header: "Requester", key: "employee", render: (record) => record.employeeLabel },
            { header: "Type", key: "type", render: (record) => record.actionType },
            { header: "Status", key: "status", render: (record) => record.status },
            { header: "Created", key: "created", render: (record) => record.createdAt.slice(0, 10) },
            {
              header: "Actions",
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  <form action={transitionHrRequestAction.bind(null, record.id, "submit")}><ActionButton label="Submit" /></form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "approve")}><ActionButton label="Approve" /></form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "reject")}><ActionButton label="Reject" /></form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "return")}><ActionButton label="Return" /></form>
                  <form action={transitionHrRequestAction.bind(null, record.id, "cancel")}><ActionButton label="Cancel" /></form>
                </div>
              ),
            },
          ]}
          emptyMessage="No HR requests yet."
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 100 }}
          records={records}
        />
      </div>
    </PageContainer>
  );
}

export function HrCustodyWorkspace({
  records,
  defaultEmployeeId,
  highlightCreate,
}: Readonly<{ records: readonly HrCustodyRecord[]; defaultEmployeeId?: string; highlightCreate?: boolean }>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Custody assignments with return, transfer, damaged, and lost lifecycle events."
        help={resolveHrPageHelp("custody")}
        title="Custody / Assets / العهدة"
      />
      <div className="space-y-6">
        {defaultEmployeeId ? (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            Filtered to employee. <a className="underline" href="/erp/hr/custody">Show all</a>
          </p>
        ) : null}
        <form action={createHrCustodyAssignmentAction} className={`grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-6 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}>
          <EntityLookup value={defaultEmployeeId} label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
          <select className={nativeSelectClassName} name="assetType" required>
            <option value="">Asset type</option>
            {HR_CUSTODY_ASSET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <Input name="assetLabel" placeholder="Asset label" required />
          <DatePicker name="effectiveDate" placeholder="Assignment date" required />
          <Input name="notes" placeholder="Notes" />
          <Button type="submit" variant="primary">
            Assign custody
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: "Asset", key: "asset", render: (record) => record.assetLabel },
            { header: "Type", key: "type", render: (record) => record.assetType },
            { header: "Employee", key: "employee", render: (record) => record.employeeLabel },
            { header: "Assigned", key: "date", render: (record) => record.effectiveDate },
            { header: "Condition", key: "condition", render: (record) => record.condition },
            { header: "Status", key: "status", render: (record) => record.status },
            { header: "Notes", key: "notes", render: (record) => record.notes ?? "—" },
            {
              header: "Actions",
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  <form action={transitionHrCustodyAction.bind(null, record.id, "return")}><ActionButton label="Return" /></form>
                  <form action={transitionHrCustodyAction.bind(null, record.id, "damaged")}>
                    <input name="reason" type="hidden" value="Damaged in operations" />
                    <ActionButton label="Damaged" />
                  </form>
                  <form action={transitionHrCustodyAction.bind(null, record.id, "lost")}>
                    <input name="reason" type="hidden" value="Lost in operations" />
                    <ActionButton label="Lost" />
                  </form>
                </div>
              ),
            },
          ]}
          emptyMessage="No custody records yet."
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 100 }}
          records={records}
        />
      </div>
    </PageContainer>
  );
}

export function HrReportsLauncher() {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Operational HR report entry points. Advanced report builder is out of scope."
        help={resolveHrPageHelp("reports")}
        title="Reports / التقارير"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HR_REPORT_CARDS.map((card) => (
          <a className="rounded-lg border bg-[hsl(var(--surface))] p-5 transition hover:border-accent" href={card.href} key={card.label}>
            <h2 className="font-medium">{`${card.label}${card.labelAr ? ` / ${card.labelAr}` : ""}`}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
          </a>
        ))}
      </section>
    </PageContainer>
  );
}

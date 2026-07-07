"use client";

import { createHrContractAction, transitionHrContractAction } from "@/features/hr/routes/actions/hr-operational.actions";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePicker, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

export type HrContractTableRecord = {
  contractNumber: string;
  contractType: string;
  employee: string;
  employeeId: string;
  endsOn: string;
  expiringSoon: boolean;
  id: string;
  rawStatus: string;
  startsOn: string;
  status: string;
};

function ContractActionButton({ label }: Readonly<{ label: string }>) {
  return (
    <button className="rounded-md border px-2 py-1 text-xs" type="submit">
      {label}
    </button>
  );
}

export function HrContractsWorkspace({
  defaultEmployeeId,
  expiringCount,
  highlightCreate,
  records,
  renewEndsOn,
  today,
}: Readonly<{
  defaultEmployeeId?: string;
  expiringCount: number;
  highlightCreate?: boolean;
  records: readonly HrContractTableRecord[];
  renewEndsOn: string;
  today: string;
}>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description="Contract list, lifecycle actions, timeline, and legal evidence only."
        help={resolveHrPageHelp("contracts")}
        title="Contracts / العقود"
      />
      <div className="space-y-4">
        {expiringCount > 0 ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {expiringCount} contracts expiring within 60 days.
          </p>
        ) : (
          <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">No contract expiry alerts.</p>
        )}

        <form
          action={createHrContractAction}
          className={`grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6 ${highlightCreate ? "border-accent ring-1 ring-accent" : ""}`}
        >
          <EntityLookup value={defaultEmployeeId} label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
          <Input name="contractNumber" placeholder="Contract number" required />
          <select className={nativeSelectClassName} defaultValue="permanent" name="contractType">
            <option value="permanent">Permanent</option>
            <option value="fixed_term">Fixed Term</option>
            <option value="probation">Probation</option>
            <option value="consultant">Consultant</option>
          </select>
          <DatePicker name="startsOn" placeholder="Start date" required />
          <DatePicker name="endsOn" placeholder="End date (optional)" />
          <Button type="submit" variant="primary">
            Create Contract
          </Button>
        </form>

        <EnterpriseDataTable
          columns={[
            { header: "Contract", key: "number", render: (record) => record.contractNumber },
            { header: "Employee", key: "employee", render: (record) => record.employee },
            { header: "Type", key: "type", render: (record) => record.contractType },
            { header: "Status", key: "status", render: (record) => record.status },
            { header: "Start", key: "start", render: (record) => record.startsOn },
            { header: "End", key: "end", render: (record) => record.endsOn },
            {
              header: "Actions",
              key: "actions",
              render: (record) => (
                <div className="flex flex-wrap gap-1">
                  {record.rawStatus === "active" ? (
                    <>
                      <form action={transitionHrContractAction.bind(null, record.id, "renew")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="endsOn" type="hidden" value={renewEndsOn} />
                        <ContractActionButton label="Renew" />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "amend")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <ContractActionButton label="Amend" />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "suspend")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="reason" type="hidden" value="Suspended from HR contracts workspace" />
                        <ContractActionButton label="Suspend" />
                      </form>
                      <form action={transitionHrContractAction.bind(null, record.id, "terminate")}>
                        <input name="effectiveDate" type="hidden" value={today} />
                        <input name="reason" type="hidden" value="Terminated from HR contracts workspace" />
                        <ContractActionButton label="Terminate" />
                      </form>
                    </>
                  ) : null}
                  {record.rawStatus === "suspended" ? (
                    <form action={transitionHrContractAction.bind(null, record.id, "resume")}>
                      <input name="effectiveDate" type="hidden" value={today} />
                      <input name="reason" type="hidden" value="Resumed from HR contracts workspace" />
                      <ContractActionButton label="Resume" />
                    </form>
                  ) : null}
                  {record.rawStatus !== "active" && record.rawStatus !== "suspended" ? (
                    <span className="text-xs text-muted-foreground">No actions</span>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyMessage="No contracts yet."
          getRowId={(record) => record.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(record) => [
            { href: `/erp/hr/employees/${record.employeeId}?tab=contracts`, key: "view", label: "View profile" },
          ]}
        />
      </div>
    </PageContainer>
  );
}

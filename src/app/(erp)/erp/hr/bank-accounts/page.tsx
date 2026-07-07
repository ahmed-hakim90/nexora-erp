import {
  archiveEmployeeBankAccountAction,
  createEmployeeBankAccountAction,
  updateEmployeeBankAccountAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_BANK_ACCOUNT_TYPES } from "@/features/hr/financial-services-foundation";
import { loadHrBankAccountsWorkspace } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrBankAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationView });

  const { records } = await loadHrBankAccountsWorkspace({
    employeeId: query.employeeId,
    search: query.search,
  });

  const editId = query.edit ?? "";

  return (
    <HrShell activeKey="bank-accounts">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Employee bank accounts for payroll disbursement with primary account designation."
          help={resolveHrPageHelp("bankAccounts")}
          title="Bank Accounts / الحسابات البنكية"
        />
        <div className="space-y-4">
          <form action="/erp/hr/bank-accounts" className="grid gap-3 md:grid-cols-3">
            <Input defaultValue={query.search ?? ""} name="search" placeholder="Search employee..." />
            <div />
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>

          <form action={createEmployeeBankAccountAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-8">
            <EntityLookup value={query.employeeId} label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <Input name="bankName" placeholder="Bank name" required />
            <Input name="accountHolderName" placeholder="Account holder" required />
            <Input name="accountNumber" placeholder="Account number" required />
            <Input name="iban" placeholder="IBAN (optional)" />
            <select className={nativeSelectClassName} name="accountType">
              {HR_BANK_ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input name="isPrimary" type="checkbox" value="true" />
              Primary account
            </label>
            <Button type="submit" variant="primary">
              Add Account
            </Button>
          </form>

          {editId ? (
            (() => {
              const record = records.find((r) => r.id === editId);
              if (!record) return null;
              return (
                <form action={updateEmployeeBankAccountAction} className="grid gap-3 rounded-lg border border-accent p-4 md:grid-cols-3 xl:grid-cols-7">
                  <input name="accountId" type="hidden" value={record.id} />
                  <Input defaultValue={record.bankName} name="bankName" placeholder="Bank name" required />
                  <Input defaultValue={record.accountHolderName} name="accountHolderName" placeholder="Account holder" required />
                  <Input defaultValue={record.accountNumber} name="accountNumber" placeholder="Account number" required />
                  <Input defaultValue={record.iban ?? ""} name="iban" placeholder="IBAN" />
                  <Input defaultValue={record.swiftCode ?? ""} name="swiftCode" placeholder="SWIFT" />
                  <label className="flex items-center gap-2 text-sm">
                    <input defaultChecked={record.isPrimary} name="isPrimary" type="checkbox" value="true" />
                    Primary account
                  </label>
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </form>
              );
            })()
          ) : null}

          <EnterpriseDataTable
            columns={[
              { header: "Employee", key: "emp", render: (r) => ("employeeLabel" in r ? String(r.employeeLabel ?? r.employeeId) : r.employeeId) },
              { header: "Bank", key: "bank", render: (r) => r.bankName },
              { header: "Holder", key: "holder", render: (r) => r.accountHolderName },
              { header: "Account #", key: "account", render: (r) => r.accountNumber },
              { header: "IBAN", key: "iban", render: (r) => r.iban ?? "—" },
              { header: "Type", key: "type", render: (r) => r.accountType },
              { header: "Primary", key: "primary", render: (r) => (r.isPrimary ? "Yes" : "No") },
              { header: "Status", key: "status", render: (r) => r.status },
              {
                header: "Actions",
                key: "actions",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    <a className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/erp/hr/bank-accounts?edit=${r.id}`}>
                      Edit
                    </a>
                    <form action={archiveEmployeeBankAccountAction.bind(null, r.id)}>
                      <Button size="sm" type="submit" variant="secondary">
                        Archive
                      </Button>
                    </form>
                  </div>
                ),
              },
            ]}
            emptyMessage="No bank accounts registered yet."
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 50 }}
            records={records}
            rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: "View profile" }]}
          />
        </div>
      </PageContainer>
    </HrShell>
  );
}

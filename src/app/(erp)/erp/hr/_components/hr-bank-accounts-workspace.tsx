"use client";

import {
  archiveEmployeeBankAccountAction,
  createEmployeeBankAccountAction,
  updateEmployeeBankAccountAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_BANK_ACCOUNT_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeeBankAccount } from "@/features/hr/financial-services-foundation";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, EnterpriseDataTable, EntityLookup, Input, nativeSelectClassName, PageContainer, PageHeader, useTranslations } from "@/shared/ui";

export type HrBankAccountTableRecord = HrEmployeeBankAccount & {
  employeeLabel?: string;
};

export function HrBankAccountsWorkspace({
  defaultEmployeeId,
  defaultSearch,
  editRecord,
  records,
}: Readonly<{
  defaultEmployeeId?: string;
  defaultSearch?: string;
  editRecord?: HrBankAccountTableRecord;
  records: readonly HrBankAccountTableRecord[];
}>) {
  const t = useTranslations();

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={t("hr.bankAccounts.description")}
        help={resolveHrPageHelp("bankAccounts")}
        title={t("hr.bankAccounts.title")}
      />
      <div className="space-y-4">
        <form action="/erp/hr/bank-accounts" className="grid gap-3 md:grid-cols-3">
          <Input defaultValue={defaultSearch ?? ""} name="search" placeholder={t("hr.common.searchEmployee")} />
          <div />
          <Button type="submit" variant="secondary">
            {t("hr.common.filter")}
          </Button>
        </form>

        <form action={createEmployeeBankAccountAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-8">
          <EntityLookup value={defaultEmployeeId} label={t("hr.common.employee")} name="employeeId" providerKey="hr.employees.lookup" required />
          <Input name="bankName" placeholder={t("hr.bankAccounts.bankName")} required />
          <Input name="accountHolderName" placeholder={t("hr.bankAccounts.accountHolder")} required />
          <Input name="accountNumber" placeholder={t("hr.bankAccounts.accountNumber")} required />
          <Input name="iban" placeholder={t("hr.bankAccounts.ibanOptional")} />
          <select className={nativeSelectClassName} name="accountType">
            {HR_BANK_ACCOUNT_TYPES.map((accountType) => (
              <option key={accountType.value} value={accountType.value}>
                {accountType.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input name="isPrimary" type="checkbox" value="true" />
            {t("hr.bankAccounts.primary")}
          </label>
          <Button type="submit" variant="primary">
            {t("hr.bankAccounts.add")}
          </Button>
        </form>

        {editRecord ? (
          <form action={updateEmployeeBankAccountAction} className="grid gap-3 rounded-lg border border-accent p-4 md:grid-cols-3 xl:grid-cols-7">
            <input name="accountId" type="hidden" value={editRecord.id} />
            <Input defaultValue={editRecord.bankName} name="bankName" placeholder={t("hr.bankAccounts.bankName")} required />
            <Input defaultValue={editRecord.accountHolderName} name="accountHolderName" placeholder={t("hr.bankAccounts.accountHolder")} required />
            <Input defaultValue={editRecord.accountNumber} name="accountNumber" placeholder={t("hr.bankAccounts.accountNumber")} required />
            <Input defaultValue={editRecord.iban ?? ""} name="iban" placeholder={t("hr.bankAccounts.iban")} />
            <Input defaultValue={editRecord.swiftCode ?? ""} name="swiftCode" placeholder={t("hr.bankAccounts.swift")} />
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={editRecord.isPrimary} name="isPrimary" type="checkbox" value="true" />
              {t("hr.bankAccounts.primary")}
            </label>
            <Button type="submit" variant="primary">
              {t("hr.common.saveChanges")}
            </Button>
          </form>
        ) : null}

        <EnterpriseDataTable
          columns={[
            {
              header: t("hr.common.employee"),
              key: "emp",
              render: (r) => ("employeeLabel" in r ? String(r.employeeLabel ?? r.employeeId) : r.employeeId),
            },
            { header: t("hr.bankAccounts.column.bank"), key: "bank", render: (r) => r.bankName },
            { header: t("hr.bankAccounts.column.holder"), key: "holder", render: (r) => r.accountHolderName },
            { header: t("hr.bankAccounts.column.accountNumber"), key: "account", render: (r) => r.accountNumber },
            { header: t("hr.bankAccounts.iban"), key: "iban", render: (r) => r.iban ?? "—" },
            { header: t("hr.common.type"), key: "type", render: (r) => r.accountType },
            {
              header: t("hr.bankAccounts.column.primary"),
              key: "primary",
              render: (r) => (r.isPrimary ? t("hr.common.yes") : t("hr.common.no")),
            },
            { header: t("hr.common.status"), key: "status", render: (r) => r.status },
            {
              header: t("hr.common.actions"),
              key: "actions",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <a className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/erp/hr/bank-accounts?edit=${r.id}`}>
                    {t("hr.common.edit")}
                  </a>
                  <form action={archiveEmployeeBankAccountAction.bind(null, r.id)}>
                    <Button size="sm" type="submit" variant="secondary">
                      {t("hr.common.archive")}
                    </Button>
                  </form>
                </div>
              ),
            },
          ]}
          emptyMessage={t("hr.bankAccounts.empty")}
          getRowId={(r) => r.id}
          pagination={{ mode: "cursor", pageSize: 50 }}
          records={records}
          rowActions={(r) => [{ href: `/erp/hr/employees/${r.employeeId}`, key: "profile", label: t("hr.common.viewProfile") }]}
        />
      </div>
    </PageContainer>
  );
}

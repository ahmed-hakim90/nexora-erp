"use client";

import {
  archiveEmployeeBankAccountAction,
  createEmployeeBankAccountAction,
} from "@/features/hr/routes/actions/hr-financial.actions";
import { HR_BANK_ACCOUNT_TYPES } from "@/features/hr/financial-services-foundation";
import type { HrEmployeeBankAccount } from "@/features/hr/financial-services-foundation";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import {
  Button,
  EnterpriseDataTable,
  EntityLookup,
  FieldGroup,
  FormSection,
  Input,
  nativeSelectClassName,
  PageContainer,
  PageHeader,
  useTranslations,
} from "@/shared/ui";

import { HrBankAccountFormDialog } from "./hr-bank-account-form-dialog";

export type HrBankAccountTableRecord = HrEmployeeBankAccount & {
  employeeLabel?: string;
};

export function HrBankAccountsWorkspace({
  defaultEmployeeId,
  defaultSearch,
  editRecord,
  query,
  records,
}: Readonly<{
  defaultEmployeeId?: string;
  defaultSearch?: string;
  editRecord?: HrBankAccountTableRecord;
  query: Record<string, string | undefined>;
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] rtl:lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <section className="order-2 min-w-0 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1 rtl:lg:col-start-2">
          <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
            <h2 className="mb-3 text-sm font-medium">{t("hr.bankAccounts.filterTitle")}</h2>
            <form action="/erp/hr/bank-accounts" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input defaultValue={defaultSearch ?? ""} name="search" placeholder={t("hr.common.searchEmployee")} />
              <Button className="w-full md:w-auto" type="submit" variant="secondary">
                {t("hr.common.filter")}
              </Button>
            </form>
          </section>

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
                    <a
                      className="inline-flex h-8 items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
                      href={`/erp/hr/bank-accounts?edit=${r.id}${defaultSearch ? `&search=${encodeURIComponent(defaultSearch)}` : ""}`}
                    >
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
        </section>

        <aside className="order-1 lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:self-start lg:row-start-1 rtl:lg:col-start-1">
          <FormSection description={t("hr.bankAccounts.createDescription")} title={t("hr.bankAccounts.createTitle")}>
            <form action={createEmployeeBankAccountAction} className="space-y-4">
              <FieldGroup isRequired label={t("hr.common.employee")}>
                <EntityLookup
                  label={t("hr.common.searchEmployee")}
                  name="employeeId"
                  providerKey="hr.employees.lookup"
                  required
                  value={defaultEmployeeId}
                />
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.bankAccounts.bankName")}>
                <Input name="bankName" required />
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.bankAccounts.accountHolder")}>
                <Input name="accountHolderName" required />
              </FieldGroup>
              <FieldGroup isRequired label={t("hr.bankAccounts.accountNumber")}>
                <Input name="accountNumber" required />
              </FieldGroup>
              <FieldGroup label={t("hr.bankAccounts.iban")}>
                <Input name="iban" placeholder={t("hr.bankAccounts.ibanOptional")} />
              </FieldGroup>
              <FieldGroup label={t("hr.common.type")}>
                <select className={nativeSelectClassName} defaultValue="salary" name="accountType">
                  {HR_BANK_ACCOUNT_TYPES.map((accountType) => (
                    <option key={accountType.value} value={accountType.value}>
                      {accountType.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              <label className="flex items-center gap-2 text-sm">
                <input
                  className="size-4 rounded border border-border bg-[hsl(var(--surface))]"
                  name="isPrimary"
                  type="checkbox"
                  value="true"
                />
                {t("hr.bankAccounts.primary")}
              </label>
              <div className="border-t border-[hsl(var(--border))] pt-4">
                <Button className="w-full" type="submit" variant="primary">
                  {t("hr.bankAccounts.add")}
                </Button>
              </div>
            </form>
          </FormSection>
        </aside>
      </div>

      {editRecord ? <HrBankAccountFormDialog account={editRecord} query={query} /> : null}
    </PageContainer>
  );
}

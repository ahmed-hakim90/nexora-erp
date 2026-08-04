import { loadHrBankAccountsWorkspace } from "@/features/hr/routes/loaders/hr-financial.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrBankAccountsWorkspace } from "../_components/hr-bank-accounts-workspace";
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

  const editRecord = query.edit ? records.find((r) => r.id === query.edit) : undefined;

  return (
    <HrShell activeKey="bank-accounts">
      <HrBankAccountsWorkspace
        defaultEmployeeId={query.employeeId}
        defaultSearch={query.search}
        editRecord={editRecord}
        query={query}
        records={records}
      />
    </HrShell>
  );
}

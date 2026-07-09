import { loadHrPenaltiesWorkspace } from "@/features/hr/routes/loaders/hr-financial.loader";
import { loadCompensationIssuanceBatches } from "@/features/hr/routes/loaders/hr-compensation-issuance.loader";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrPenaltiesWorkspace } from "../_components/hr-penalties-workspace";
import { HrShell } from "../_components/hr-shell";

export default async function HrPenaltiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ records }, batches] = await Promise.all([
    loadHrPenaltiesWorkspace({
      employeeId: query.employeeId,
      search: query.search,
      status: query.status,
    }),
    loadCompensationIssuanceBatches(supabase, {
      companyId: context.companyId,
      documentKind: "penalty",
      tenantId: context.tenantId,
    }),
  ]);

  return (
    <HrShell activeKey="penalties">
      <HrPenaltiesWorkspace
        batches={batches}
        defaultEmployeeId={query.employeeId}
        defaultSearch={query.search}
        defaultStatus={query.status}
        openBulkWizard={query.batch === "create"}
        query={query}
        records={records}
      />
    </HrShell>
  );
}

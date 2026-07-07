import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { requirePermission } from "@/platform/permissions/server";
import { resolveBranchRequestContext } from "@/platform/auth/server";

import { HrReportsLauncher } from "../_components/hr-operational-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrReportsPage() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.reportsView });

  return (
    <HrShell activeKey="reports">
      <HrReportsLauncher />
    </HrShell>
  );
}

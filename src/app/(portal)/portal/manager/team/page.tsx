import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { loadManagerTeamMembers } from "@/features/hr/routes/loaders/hr-portal.loader";
import { PageHeader } from "@/shared/ui";

import { PortalShell } from "../../_components/portal-shell";

export default async function PortalManagerTeamPage() {
  const context = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveApprove });
  const team = await loadManagerTeamMembers(context);

  return (
    <PortalShell activeKey="team" mode="mss">
      <PageHeader description="Direct reports from your current manager assignments." title="My Team" />
      <ul className="mt-4 divide-y rounded-lg border">
        {team.map((row) => (
          <li className="flex justify-between p-3 text-sm" key={row.id}>
            <span>{row.fullName}</span>
            <span className="text-muted-foreground">
              {row.employeeNumber} · {row.status}
            </span>
          </li>
        ))}
        {team.length === 0 ? (
          <li className="p-4 text-muted-foreground">No direct reports are assigned to you.</li>
        ) : null}
      </ul>
    </PortalShell>
  );
}

import Link from "next/link";

import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { countManagerPendingLeaveApprovals } from "@/features/hr/routes/loaders/hr-portal.loader";
import { PageHeader } from "@/shared/ui";

import { PortalNavLinks, PortalShell } from "../_components/portal-shell";

export default async function PortalManagerHomePage() {
  const context = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveApprove });
  const pendingLeave = await countManagerPendingLeaveApprovals(context);

  return (
    <PortalShell activeKey="manager" mode="mss">
      <PageHeader description="Manager approvals and team visibility." title="Manager Self-Service" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link className="rounded-lg border p-4" href="/portal/manager/approvals">
          Pending approvals · {pendingLeave} leave requests
        </Link>
        <Link className="rounded-lg border p-4" href="/portal/manager/team">
          View my team
        </Link>
      </div>
      <div className="mt-6">
        <PortalNavLinks />
      </div>
    </PortalShell>
  );
}

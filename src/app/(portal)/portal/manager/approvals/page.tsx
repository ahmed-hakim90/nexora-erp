import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import {
  approvePortalLeaveRequestAction,
  rejectPortalLeaveRequestAction,
} from "@/features/hr/routes/actions/hr-portal.actions";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { loadManagerPendingLeaveApprovals } from "@/features/hr/routes/loaders/hr-portal.loader";
import { Button, EditableSectionCard, Input, PageHeader } from "@/shared/ui";

import { PortalShell } from "../../_components/portal-shell";

export default async function PortalManagerApprovalsPage() {
  const context = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveApprove });
  const approvals = await loadManagerPendingLeaveApprovals(context);

  return (
    <PortalShell activeKey="approvals" mode="mss">
      <PageHeader description="Approve or reject direct-report leave requests." title="Approvals" />
      <EditableSectionCard className="mt-6" title="Pending leave requests">
        <ul className="divide-y rounded-lg border">
          {approvals.map((row) => (
            <li className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" key={row.id}>
              <div>
                <p className="font-medium">{row.employeeName}</p>
                <p className="text-muted-foreground">
                  {row.startDate} → {row.endDate} · {row.status}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <form action={approvePortalLeaveRequestAction.bind(null, row.id)}>
                  <Button size="sm" type="submit" variant="primary">
                    Approve
                  </Button>
                </form>
                <form action={rejectPortalLeaveRequestAction.bind(null, row.id)} className="flex flex-wrap items-end gap-2">
                  <Input className="min-w-[12rem]" name="reason" placeholder="Rejection reason" required />
                  <Button size="sm" type="submit" variant="secondary">
                    Reject
                  </Button>
                </form>
              </div>
            </li>
          ))}
          {approvals.length === 0 ? (
            <li className="p-4 text-muted-foreground">No pending approvals for your team.</li>
          ) : null}
        </ul>
      </EditableSectionCard>
    </PortalShell>
  );
}

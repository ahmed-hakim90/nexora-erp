import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { createPortalLeaveRequestAction } from "@/features/hr/routes/actions/hr-portal.actions";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import {
  loadPortalLeaveBalances,
  loadPortalLeaveRequests,
  loadPortalLeaveTypes,
} from "@/features/hr/routes/loaders/hr-portal.loader";
import {
  Button,
  DatePicker,
  EditableSectionCard,
  EnterpriseDataTable,
  Input,
  nativeSelectClassName,
  PageHeader,
} from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

export default async function PortalLeavePage() {
  const context = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveViewSelf });

  const [requests, balances, leaveTypes] = await Promise.all([
    loadPortalLeaveRequests(context),
    loadPortalLeaveBalances(context),
    loadPortalLeaveTypes(context),
  ]);

  return (
    <PortalShell activeKey="leave">
      <PageHeader description="Submit leave requests and review balances." title="My Leave" />

      <div className="mt-6 space-y-6">
        <EditableSectionCard description="Requests are submitted for manager approval automatically." title="Request leave">
          <form action={createPortalLeaveRequestAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium" htmlFor="leaveTypeId">
                Leave type
              </label>
              <select className={nativeSelectClassName} id="leaveTypeId" name="leaveTypeId" required>
                <option value="">Select leave type</option>
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
            </div>
            <DatePicker name="startsOn" placeholder="Start date" required />
            <DatePicker name="endsOn" placeholder="End date" required />
            <Input className="md:col-span-2" name="notes" placeholder="Notes (optional)" />
            <Button disabled={leaveTypes.length === 0} type="submit" variant="primary">
              Submit request
            </Button>
          </form>
          {leaveTypes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No active leave types are configured yet.</p>
          ) : null}
        </EditableSectionCard>

        <EditableSectionCard title="Leave balances">
          <EnterpriseDataTable
            columns={[
              { header: "Leave type", key: "type", render: (row) => row.leaveType },
              { header: "Available", key: "available", render: (row) => row.availableQuantity },
              { header: "As of", key: "asOf", render: (row) => row.asOfDate },
            ]}
            emptyMessage="No leave balances recorded yet."
            getRowId={(row) => row.id}
            pagination={{ mode: "page", page: 1, pageSize: balances.length || 1, totalRows: balances.length }}
            records={balances}
          />
        </EditableSectionCard>

        <EditableSectionCard title="My requests">
          <EnterpriseDataTable
            columns={[
              { header: "Type", key: "type", render: (row) => row.leaveType },
              { header: "Start", key: "start", render: (row) => row.startsOn },
              { header: "End", key: "end", render: (row) => row.endsOn },
              { header: "Days", key: "days", render: (row) => row.days },
              { header: "Status", key: "status", render: (row) => row.status },
            ]}
            emptyMessage="No leave requests yet."
            getRowId={(row) => row.id}
            pagination={{ mode: "page", page: 1, pageSize: requests.length || 1, totalRows: requests.length }}
            records={requests}
          />
        </EditableSectionCard>
      </div>
    </PortalShell>
  );
}

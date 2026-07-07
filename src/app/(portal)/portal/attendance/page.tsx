import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/public-api";
import { loadPortalAttendanceDays } from "@/features/hr/routes/loaders/hr-portal.loader";
import { EditableSectionCard, EnterpriseDataTable, PageHeader } from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

export default async function PortalAttendancePage() {
  const context = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceViewSelf });
  const records = await loadPortalAttendanceDays(context);

  return (
    <PortalShell activeKey="attendance">
      <PageHeader description="Your attendance days and worked minutes." title="My Attendance" />
      <EditableSectionCard className="mt-6" title="Recent attendance">
        <EnterpriseDataTable
          columns={[
            { header: "Date", key: "date", render: (row) => row.workDate },
            { header: "Worked (min)", key: "worked", render: (row) => row.workedMinutes },
            { header: "Late (min)", key: "late", render: (row) => row.lateMinutes },
            { header: "Status", key: "status", render: (row) => row.status },
          ]}
          emptyMessage="No attendance records."
          getRowId={(row) => row.id}
          pagination={{ mode: "page", page: 1, pageSize: records.length || 1, totalRows: records.length }}
          records={records}
        />
      </EditableSectionCard>
    </PortalShell>
  );
}

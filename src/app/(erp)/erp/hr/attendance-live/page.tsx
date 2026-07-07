import {
  loadHrAttendanceLiveEmployeeDrawer,
  loadHrAttendanceLiveWorkspace,
} from "@/features/hr/routes/loaders/hr-attendance-live.loader";

import { HrShell } from "../_components/hr-shell";
import { HrAttendanceLiveWorkspace } from "../_components/hr-attendance-live/hr-attendance-live-workspace";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HrAttendanceLivePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const params = (await searchParams) ?? {};
  const employeeId = readParam(params, "employee");

  const query = {
    attendanceStatus: readParam(params, "attendanceStatus"),
    branchId: readParam(params, "branchId"),
    cursor: readParam(params, "cursor"),
    departmentId: readParam(params, "departmentId"),
    deviceId: readParam(params, "deviceId"),
    employee: employeeId,
    managerId: readParam(params, "managerId"),
    refreshIntervalSeconds: readParam(params, "refreshIntervalSeconds"),
    search: readParam(params, "search"),
    shiftId: readParam(params, "shiftId"),
  };

  const [data, initialDrawer] = await Promise.all([
    loadHrAttendanceLiveWorkspace(query),
    employeeId ? loadHrAttendanceLiveEmployeeDrawer(employeeId) : Promise.resolve(null),
  ]);

  return (
    <HrShell activeKey="attendance-live" pathname="/erp/hr/attendance-live">
      <HrAttendanceLiveWorkspace data={data} initialDrawer={initialDrawer} query={query} />
    </HrShell>
  );
}

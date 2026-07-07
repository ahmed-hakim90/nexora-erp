import {
  loadHrAttendanceDeviceForEdit,
  loadHrAttendanceDevicesWorkspace,
} from "@/features/hr/routes/loaders/hr-attendance-devices.loader";

import { HrShell } from "../_components/hr-shell";
import { HrAttendanceDevicesWorkspace } from "../_components/hr-attendance-devices/hr-attendance-devices-workspace";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function HrAttendanceDevicesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const params = (await searchParams) ?? {};
  const edit = readParam(params, "edit");

  const query = {
    create: readParam(params, "create"),
    deviceType: readParam(params, "deviceType"),
    edit,
    firmware: readParam(params, "firmware"),
    healthStatus: readParam(params, "healthStatus"),
    ipAddress: readParam(params, "ipAddress"),
    location: readParam(params, "location"),
    search: readParam(params, "search"),
    status: readParam(params, "status"),
    sync: readParam(params, "sync"),
    syncSession: readParam(params, "syncSession"),
    tab: readParam(params, "tab"),
  };

  const [data, editDevice] = await Promise.all([
    loadHrAttendanceDevicesWorkspace(query),
    edit ? loadHrAttendanceDeviceForEdit(edit) : Promise.resolve(undefined),
  ]);

  return (
    <HrShell activeKey="attendance-devices" pathname="/erp/hr/attendance-devices">
      <HrAttendanceDevicesWorkspace data={data} editDevice={editDevice ?? undefined} query={query} />
    </HrShell>
  );
}

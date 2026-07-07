import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { assignEmployeeShiftAction, createShiftDefinitionAction } from "@/features/hr/routes/actions/hr-shift.actions";
import { HR_PERMISSIONS, HR_SHIFT_KINDS } from "@/features/hr/public-api";
import { resolveHrPageHelp } from "@/features/hr/public-api";
import { Button, DatePickerField, EnterpriseDataTable, EntityLookup, nativeSelectClassName, PageContainer, PageHeader } from "@/shared/ui";

import { HrShell } from "../_components/hr-shell";

export default async function HrShiftsPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.shiftsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const [{ data: shifts }, { data: schedules }] = await Promise.all([
    supabase
      .from("hr_shift_definitions")
      .select("id, code, name, shift_kind, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_shift_schedules")
      .select("id, employee_id, effective_from, status, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const employeeIds = [...new Set((schedules ?? []).map((row) => String(row.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const employee of employees ?? []) {
      employeeMap.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
    }
  }

  const shiftRecords = (shifts ?? []).map((row) => ({
    code: String(row.code),
    createdAt: String(row.created_at).slice(0, 10),
    id: String(row.id),
    kind: String(row.shift_kind),
    name: String(row.name),
    status: String(row.status),
  }));

  const scheduleRecords = (schedules ?? []).map((row) => ({
    effectiveFrom: String(row.effective_from),
    employee: employeeMap.get(String(row.employee_id)) ?? String(row.employee_id),
    id: String(row.id),
    status: String(row.status),
  }));

  return (
    <HrShell activeKey="shifts">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Shift definitions, schedules, and employee shift assignments."
          help={resolveHrPageHelp("shifts")}
          title="Shift Management"
        />
        <div className="space-y-6">
          <form action={createShiftDefinitionAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Code</span>
              <input className={nativeSelectClassName} name="code" placeholder="MORNING" required />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Name</span>
              <input className={nativeSelectClassName} name="name" placeholder="Morning Shift" required />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Kind</span>
              <select className={nativeSelectClassName} defaultValue="morning" name="shiftKind">
                {HR_SHIFT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Start</span>
              <input className={nativeSelectClassName} defaultValue="09:00" name="startTime" required type="time" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">End</span>
              <input className={nativeSelectClassName} defaultValue="17:00" name="endTime" required type="time" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="crossesMidnight" type="checkbox" />
              Crosses midnight
            </label>
            <Button className="xl:col-span-6" type="submit" variant="primary">Create Shift</Button>
          </form>

          <form action={assignEmployeeShiftAction} className="grid gap-3 rounded-lg border p-4 md:grid-cols-3 xl:grid-cols-6">
            <EntityLookup label="Employee" name="employeeId" providerKey="hr.employees.lookup" required />
            <label className="space-y-1 text-sm">
              <span className="font-medium">Shift</span>
              <select className={nativeSelectClassName} name="shiftId" required>
                <option value="">Select shift</option>
                {shiftRecords.map((shift) => (
                  <option key={shift.id} value={shift.id}>{shift.name} ({shift.code})</option>
                ))}
              </select>
            </label>
            <DatePickerField label="Effective from" name="effectiveFrom" required />
            <label className="space-y-1 text-sm">
              <span className="font-medium">Day of week</span>
              <select className={nativeSelectClassName} defaultValue="1" name="dayOfWeek">
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Week index</span>
              <input className={nativeSelectClassName} defaultValue="0" name="weekIndex" type="number" />
            </label>
            <Button className="xl:col-span-6" type="submit" variant="secondary">Assign Shift Schedule</Button>
          </form>

          <EnterpriseDataTable
            columns={[
              { header: "Code", key: "code", render: (r) => r.code },
              { header: "Name", key: "name", render: (r) => r.name },
              { header: "Kind", key: "kind", render: (r) => r.kind },
              { header: "Status", key: "status", render: (r) => r.status },
              { header: "Created", key: "created", render: (r) => r.createdAt },
            ]}
            emptyMessage="No shifts defined yet."
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={shiftRecords}
          />

          <EnterpriseDataTable
            columns={[
              { header: "Employee", key: "employee", render: (r) => r.employee },
              { header: "Effective From", key: "effectiveFrom", render: (r) => r.effectiveFrom },
              { header: "Status", key: "status", render: (r) => r.status },
            ]}
            emptyMessage="No shift schedules assigned yet."
            getRowId={(r) => r.id}
            pagination={{ mode: "cursor", pageSize: 20 }}
            records={scheduleRecords}
          />
        </div>
      </PageContainer>
    </HrShell>
  );
}

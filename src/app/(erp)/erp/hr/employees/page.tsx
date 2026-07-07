import { loadHrEmployeesWorkspace, type HrEmployeesWorkspaceData } from "@/features/hr/routes/loaders/hr-employees.loader";
import { getHrEmployeeForEdit } from "@/features/hr/routes/loaders/hr-operational.loader";

import { HrEmployeeEditModal } from "../_components/hr-employee-edit-modal";
import { HrEmployeesWorkspace } from "../_components/hr-employees-pages";
import { HrShell } from "../_components/hr-shell";

function buildCloseHref(params: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "edit") next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/hr/employees?${query}` : "/erp/hr/employees";
}

export default async function HrEmployeesPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  let data: HrEmployeesWorkspaceData | undefined;
  let errorMessage: string | undefined;
  let editEmployee: Awaited<ReturnType<typeof getHrEmployeeForEdit>> | undefined;

  try {
    data = await loadHrEmployeesWorkspace(params);
    if (params.edit) editEmployee = await getHrEmployeeForEdit(params.edit);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load employees.";
  }

  return (
    <HrShell activeKey="employees">
      <HrEmployeesWorkspace
        data={
          data ?? {
            branchOptions: [],
            departmentOptions: [],
            managerOptions: [],
            nextCursor: null,
            pageSize: 25,
            positionOptions: [],
            records: [],
            statusOptions: [],
          }
        }
        errorMessage={errorMessage}
        query={params}
      />
      {editEmployee ? <HrEmployeeEditModal closeHref={buildCloseHref(params)} employee={editEmployee} /> : null}
    </HrShell>
  );
}

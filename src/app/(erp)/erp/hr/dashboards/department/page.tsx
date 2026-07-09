import { loadHrDepartmentDashboardWorkspace } from "@/features/hr/routes/loaders/hr-dashboard.loader";

import { HrDepartmentDashboardWorkspace } from "../../_components/hr-department-dashboard";
import { HrShell } from "../../_components/hr-shell";

export default async function HrDepartmentDashboardPage() {
  const data = await loadHrDepartmentDashboardWorkspace();

  return (
    <HrShell activeKey="dashboard-department" pathname="/erp/hr/dashboards/department">
      <HrDepartmentDashboardWorkspace data={data} />
    </HrShell>
  );
}

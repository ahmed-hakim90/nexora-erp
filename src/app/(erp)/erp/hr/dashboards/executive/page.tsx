import { loadHrExecutiveDashboardWorkspace } from "@/features/hr/routes/loaders/hr-dashboard.loader";

import { HrExecutiveDashboardWorkspace } from "../../_components/hr-executive-dashboard";
import { HrShell } from "../../_components/hr-shell";

export default async function HrExecutiveDashboardPage() {
  const data = await loadHrExecutiveDashboardWorkspace();

  return (
    <HrShell activeKey="dashboard-executive" pathname="/erp/hr/dashboards/executive">
      <HrExecutiveDashboardWorkspace data={data} />
    </HrShell>
  );
}

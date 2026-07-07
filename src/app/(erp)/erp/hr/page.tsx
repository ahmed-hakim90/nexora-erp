import { loadHrDashboardWorkspace, type HrDashboardData } from "@/features/hr/routes/loaders/hr-dashboard.loader";

import { HrDashboardWorkspace } from "./_components/hr-dashboard";
import { HrShell } from "./_components/hr-shell";

export default async function HrDashboardPage() {
  let data: HrDashboardData | undefined;
  let errorMessage: string | undefined;

  try {
    data = await loadHrDashboardWorkspace();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load HR dashboard.";
  }

  return (
    <HrShell activeKey="dashboard">
      {errorMessage || !data ? (
        <p className="p-6 text-sm text-destructive">{errorMessage ?? "Could not load HR dashboard."}</p>
      ) : (
        <HrDashboardWorkspace data={data} />
      )}
    </HrShell>
  );
}

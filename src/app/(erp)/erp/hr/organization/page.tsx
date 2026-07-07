import { listHrFoundationResources } from "@/features/hr/public-api";
import { loadHrOrgHierarchy } from "@/features/hr/routes/loaders/hr-foundation.loader";

import { HrFoundationHub } from "../_components/hr-foundation-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrOrganizationPage() {
  const [hierarchy, resources] = await Promise.all([loadHrOrgHierarchy(), Promise.resolve(listHrFoundationResources("organization"))]);

  return (
    <HrShell activeKey="organization">
      <HrFoundationHub
        description="Companies, branches, business units, departments, sections, teams, work locations, and cost center links."
        helpKey="organization"
        hierarchy={hierarchy}
        resources={resources}
        title="Organization"
        titleAr="الهيكل التنظيمي"
      />
    </HrShell>
  );
}

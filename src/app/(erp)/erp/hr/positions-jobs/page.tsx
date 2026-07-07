import { listHrFoundationResources } from "@/features/hr/public-api";

import { HrFoundationHub } from "../_components/hr-foundation-pages";
import { HrShell } from "../_components/hr-shell";

export default function HrPositionsJobsPage() {
  const jobResources = listHrFoundationResources("positions-jobs");
  const skillResources = listHrFoundationResources("skills-competencies");

  return (
    <HrShell activeKey="positions-jobs">
      <HrFoundationHub
        description="Job families, functions, jobs, levels, grades, career paths, positions, and skills/competencies libraries."
        helpKey="positions-jobs"
        resources={[...jobResources, ...skillResources]}
        title="Positions & Jobs"
        titleAr="المناصب والوظائف"
      />
    </HrShell>
  );
}

import { FUTURE_WORKER_ACHIEVEMENT_FORMULA, MANUFACTURING_RESOURCE_LIST, PRODUCTION_STANDARD_RESOLUTION_PRIORITY } from "@/features/manufacturing/public-api";
import { PageContainer, PageContent, PageFooter, PageHeader } from "@/shared/ui";

import { ManufacturingShell } from "./_components/manufacturing-shell";

export default function ManufacturingOverviewPage() {
  return (
    <ManufacturingShell activeKey="overview">
      <PageContainer>
        <PageHeader
          description="Sprint 12 prepares manufacturing engineering and factory structure for the future Production Session source of truth."
          title="Manufacturing Foundation"
        />
        <PageContent>
          <div className="grid gap-4 md:grid-cols-3">
            {MANUFACTURING_RESOURCE_LIST.map((resource) => (
              <a className="rounded-md border bg-[hsl(var(--surface))] p-4" href={resource.basePath} key={resource.key}>
                <h2 className="text-sm font-medium">{resource.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
              </a>
            ))}
          </div>
          <section className="mt-4 rounded-md border bg-[hsl(var(--surface))] p-4">
            <h2 className="text-sm font-medium">Production Standard Resolution</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {PRODUCTION_STANDARD_RESOLUTION_PRIORITY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Future worker output formulas: target per worker is {FUTURE_WORKER_ACHIEVEMENT_FORMULA.targetPerWorker}; achievement percent is{" "}
              {FUTURE_WORKER_ACHIEVEMENT_FORMULA.workerAchievementPercent}.
            </p>
          </section>
        </PageContent>
        <PageFooter>
          Production Sessions, Daily Production Reports, Work Orders, Production Planning, HR attendance/payroll, material consumption, and inventory posting are not part of this sprint.
        </PageFooter>
      </PageContainer>
    </ManufacturingShell>
  );
}

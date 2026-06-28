import { loadManufacturingReports, type ManufacturingReportRow, type ManufacturingReportsData } from "@/features/manufacturing/routes/loaders/reports.loader";
import { EntityLookup, EnterpriseDataTable, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { ManufacturingShell } from "../_components/manufacturing-shell";

function formatNumber(value: number) {
  return value.toLocaleString("en");
}

function ReportTable({
  records,
  title,
}: Readonly<{
  records: readonly ManufacturingReportRow[];
  title: string;
}>) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium">{title}</h2>
      <EnterpriseDataTable<ManufacturingReportRow>
        columns={[
          { key: "label", header: "Scope", render: (record) => record.label },
          { key: "planned", header: "Planned", render: (record) => formatNumber(record.planned) },
          { key: "actual", header: "Actual", render: (record) => formatNumber(record.actual) },
          { key: "achievement", header: "Achievement", render: (record) => `${record.achievementPercent}%` },
          { key: "scrap", header: "Scrap", render: (record) => formatNumber(record.scrap) },
          { key: "rework", header: "Rework", render: (record) => formatNumber(record.rework) },
          { key: "downtime", header: "Downtime", render: (record) => formatNumber(record.downtime) },
        ]}
        emptyMessage={`No ${title.toLowerCase()} found for the current filters.`}
        getRowId={(record) => record.key}
        pagination={{ mode: "cursor", pageSize: records.length || 50, nextCursor: null }}
        records={records}
      />
    </section>
  );
}

export default async function ManufacturingReportsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let data: ManufacturingReportsData = {
    dailyRows: [],
    downtimeRows: [],
    lineRows: [],
    lookups: { lines: [], products: [] },
    metrics: [],
    planRows: [],
    productRows: [],
    scrapRows: [],
    workerRows: [],
  };
  let errorMessage: string | undefined;

  try {
    data = await loadManufacturingReports(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing reports.";
  }

  return (
    <ManufacturingShell activeKey="reports">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Read-only production reports from DPR and target facts. No payroll, incentives, costing, or quality workflow calculations are performed."
          title="Manufacturing Reports & KPIs"
        />

        <PageFilters>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[11rem_11rem_14rem_14rem_12rem_auto]" action="/erp/manufacturing/reports">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.dateFrom ?? ""} name="dateFrom" type="date" />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.dateTo ?? ""} name="dateTo" type="date" />
            <EntityLookup label="All products" name="manufacturingProductId" options={data.lookups.products} placeholder="Search products..." value={params.manufacturingProductId ?? ""} />
            <EntityLookup label="All lines" name="productionLineId" options={data.lookups.lines} placeholder="Search lines..." value={params.productionLineId ?? ""} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.shiftKey ?? ""} name="shiftKey" placeholder="Shift key" />
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">Apply Filters</button>
          </form>
        </PageFilters>

        <PageContent>
          {errorMessage ? (
            <div className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm" role="alert">{errorMessage}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {data.metrics.map((metric) => (
                  <article className="rounded-lg border bg-[hsl(var(--surface))] p-4" key={metric.key}>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">{metric.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{metric.description}</p>
                  </article>
                ))}
              </div>
              <ReportTable records={data.lineRows} title="Line Achievement" />
              <ReportTable records={data.workerRows} title="Worker Achievement" />
              <ReportTable records={data.productRows} title="Product Achievement" />
              <ReportTable records={data.scrapRows} title="Scrap / Rework Summary" />
              <ReportTable records={data.downtimeRows} title="Downtime Summary" />
              <ReportTable records={data.planRows} title="Plan vs Actual" />
              <ReportTable records={data.dailyRows} title="Daily Production Summary" />
            </div>
          )}
        </PageContent>
      </PageContainer>
    </ManufacturingShell>
  );
}

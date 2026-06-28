import Link from "next/link";

import {
  loadManufacturingDailyReportsWorkspace,
  type ManufacturingDailyReportRecord,
  type ManufacturingDailyReportWorkspaceData,
} from "@/features/manufacturing/routes/loaders/daily-reports.loader";
import { displayBusinessCode } from "@/shared/business-codes";
import { EntityLookup, EnterpriseDataTable, PageActions, PageContainer, PageContent, PageFilters, PageHeader } from "@/shared/ui";

import { ManufacturingShell } from "../_components/manufacturing-shell";
import { DailyReportRecordModalLauncher } from "./daily-report-record-panel";

const statusOptions = ["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"] as const;
const reportCodeConfig = { prefix: "DPR", scope: "branch" } as const;

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/manufacturing/daily-reports?${query}` : "/erp/manufacturing/daily-reports";
}

export default async function DailyProductionReportsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let data: ManufacturingDailyReportWorkspaceData = { lines: [], nextCursor: null, pageSize: 25, products: [], records: [], workers: [] };
  let errorMessage: string | undefined;

  try {
    data = await loadManufacturingDailyReportsWorkspace(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load daily production reports.";
  }

  const selectedReport = params.edit ? data.records.find((report) => report.id === params.edit) : undefined;
  const selectedIndex = selectedReport ? data.records.findIndex((report) => report.id === selectedReport.id) : -1;
  const previousReport = selectedIndex > 0 ? data.records[selectedIndex - 1] : undefined;
  const nextReport = selectedIndex >= 0 ? data.records[selectedIndex + 1] : undefined;
  const closeHref = buildHref(params, { create: null, edit: null });
  const productLabels = new Map(data.products.map((product) => [product.id, product.label]));
  const lineLabels = new Map(data.lines.map((line) => [line.id, line.label]));

  return (
    <ManufacturingShell activeKey="daily-reports">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Real Supabase-backed Daily Production Reports for production facts only."
          title="Daily Production Reports"
        >
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { create: "1", edit: null })}>
              New DPR
            </Link>
          </PageActions>
        </PageHeader>

        <PageFilters>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_12rem_14rem_14rem_auto]" action="/erp/manufacturing/daily-reports">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.search ?? ""} name="search" placeholder="Search report key, shift, or notes" />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.reportDate ?? ""} name="reportDate" type="date" />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.shiftKey ?? ""} name="shiftKey" placeholder="Shift key" />
            <EntityLookup label="All products" name="manufacturingProductId" options={data.products} placeholder="Search products..." value={params.manufacturingProductId ?? ""} />
            <EntityLookup label="All lines" name="productionLineId" options={data.lines} placeholder="Search lines..." value={params.productionLineId ?? ""} />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" defaultValue={params.status ?? ""} name="status">
              <option value="">All statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button className="rounded-md border px-3 py-2 text-sm" type="submit">Apply Filters</button>
          </form>
        </PageFilters>

        <PageContent>
          <EnterpriseDataTable<ManufacturingDailyReportRecord>
            columns={[
              { key: "reportKey", header: "Report Code", render: (record) => displayBusinessCode(record.reportKey, reportCodeConfig) },
              { key: "date", header: "Date", render: (record) => record.reportDate },
              { key: "shift", header: "Shift", render: (record) => record.shiftKey },
              { key: "product", header: "Product", render: (record) => productLabels.get(record.manufacturingProductId) ?? "Unknown product" },
              { key: "line", header: "Line", render: (record) => lineLabels.get(record.productionLineId) ?? "Unknown line" },
              { key: "planned", header: "Planned", render: (record) => record.plannedQuantity },
              { key: "actual", header: "Actual", render: (record) => record.actualQuantity },
              { key: "scrap", header: "Scrap", render: (record) => record.scrapQuantity },
              { key: "downtime", header: "Downtime", render: (record) => record.downtimeMinutes },
              { key: "status", header: "Status", render: (record) => record.status },
            ]}
            emptyMessage="No daily production reports found. Create the first DPR once manufacturing products and lines exist."
            errorMessage={errorMessage}
            getRowId={(record) => record.id}
            pagination={{ mode: "cursor", pageSize: data.pageSize, nextCursor: data.nextCursor }}
            records={data.records}
            rowActions={(record) => [
              { key: "read", label: "Read", href: buildHref(params, { edit: record.id }) },
              { key: "edit", label: "Edit", href: buildHref(params, { edit: record.id }) },
            ]}
            state={{
              filters: params.status ? [{ key: "status", label: "Status", value: params.status }] : [],
              globalSearch: params.search,
            }}
          />
        </PageContent>

        {data.nextCursor ? (
          <PageActions>
            <Link className="rounded-md border px-3 py-2 text-sm" href={buildHref(params, { cursor: data.nextCursor })}>Next Page</Link>
          </PageActions>
        ) : null}

        {selectedReport ? (
          <DailyReportRecordModalLauncher
            autoOpen
            closeHref={closeHref}
            data={data}
            nextHref={nextReport ? buildHref(params, { edit: nextReport.id }) : undefined}
            previousHref={previousReport ? buildHref(params, { edit: previousReport.id }) : undefined}
            report={selectedReport}
          />
        ) : null}

        {params.create ? (
          <DailyReportRecordModalLauncher autoOpen closeHref={closeHref} data={data} />
        ) : null}
      </PageContainer>
    </ManufacturingShell>
  );
}

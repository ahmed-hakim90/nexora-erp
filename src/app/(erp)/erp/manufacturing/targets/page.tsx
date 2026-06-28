import { EnterpriseDataTable, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";
import { loadManufacturingTargetsWorkspace, type ManufacturingTargetsWorkspaceData } from "@/features/manufacturing/routes/loaders/targets.loader";

import { ManufacturingShell } from "../_components/manufacturing-shell";
import { TargetRecordModalLauncher, type ManufacturingTargetType } from "./target-record-modal";

type TargetRecord = ManufacturingTargetsWorkspaceData["productTargets"][number];

function valueToText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function buildTargetsHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/manufacturing/targets?${query}` : "/erp/manufacturing/targets";
}

function isTargetType(value: string | undefined): value is ManufacturingTargetType {
  return value === "product" || value === "line" || value === "worker";
}

function TargetTable({
  params,
  targetType,
  records,
  title,
}: Readonly<{
  params: Record<string, string | undefined>;
  targetType: ManufacturingTargetType | "dpr";
  records: readonly TargetRecord[];
  title: string;
}>) {
  const columns = records.length > 0
    ? Object.keys(records[0] ?? {}).filter((key) => !["tenantId", "companyId", "branchId"].includes(key)).slice(0, 8)
    : ["id", "status", "createdAt"];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {targetType !== "dpr" ? (
          <a className="rounded-md border px-3 py-2 text-sm" href={buildTargetsHref(params, { create: targetType, edit: null, editType: null })}>
            Create {title.replace(" Targets", "")}
          </a>
        ) : null}
      </div>
      <EnterpriseDataTable<TargetRecord>
        columns={columns.map((key) => ({
          key,
          header: key,
          render: (record) => valueToText(record[key]),
        }))}
        emptyMessage={`No ${title.toLowerCase()} found.`}
        getRowId={(record) => record.id}
        pagination={{ mode: "cursor", pageSize: 50, nextCursor: null }}
        records={records}
        rowActions={(record) => targetType === "dpr" ? [] : [
          { key: "edit", label: "Edit", href: buildTargetsHref(params, { edit: record.id, editType: targetType, create: null }) },
        ]}
      />
    </section>
  );
}

export default async function ManufacturingTargetsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let data: ManufacturingTargetsWorkspaceData = {
    dailyReports: [],
    lineTargets: [],
    lookups: { lines: [], plans: [], products: [], workers: [] },
    productTargets: [],
    workerTargets: [],
  };
  let errorMessage: string | undefined;

  try {
    data = await loadManufacturingTargetsWorkspace();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing targets.";
  }

  const planned = data.lineTargets.reduce((total, row) => total + Number(row.plannedQuantity ?? row.targetQuantity ?? 0), 0);
  const actual = data.lineTargets.reduce((total, row) => total + Number(row.actualQuantity ?? 0), 0);
  const selectedType = isTargetType(params.editType) ? params.editType : undefined;
  const createType = isTargetType(params.create) ? params.create : undefined;
  const selectedRecord =
    selectedType === "product"
      ? data.productTargets.find((record) => record.id === params.edit)
      : selectedType === "line"
        ? data.lineTargets.find((record) => record.id === params.edit)
        : selectedType === "worker"
          ? data.workerTargets.find((record) => record.id === params.edit)
          : undefined;
  const closeHref = buildTargetsHref(params, { create: null, edit: null, editType: null });

  return (
    <ManufacturingShell activeKey="targets">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Real target and achievement facts from Supabase. Payroll, incentives, and costing are not calculated here."
          title="Targets & Achievement"
        >
          <PageActions>
            <a className="rounded-md border px-3 py-2 text-sm" href={buildTargetsHref(params, { create: "product", edit: null, editType: null })}>New Product Target</a>
            <a className="rounded-md border px-3 py-2 text-sm" href={buildTargetsHref(params, { create: "line", edit: null, editType: null })}>New Line Target</a>
            <a className="rounded-md border px-3 py-2 text-sm" href={buildTargetsHref(params, { create: "worker", edit: null, editType: null })}>New Worker Target</a>
          </PageActions>
        </PageHeader>
        <PageContent>
          {errorMessage ? (
            <div className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm" role="alert">{errorMessage}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-4">
                <article className="rounded-lg border bg-[hsl(var(--surface))] p-4">
                  <p className="text-sm text-muted-foreground">Product Targets</p>
                  <p className="mt-2 text-3xl font-semibold">{data.productTargets.length}</p>
                </article>
                <article className="rounded-lg border bg-[hsl(var(--surface))] p-4">
                  <p className="text-sm text-muted-foreground">Line Targets</p>
                  <p className="mt-2 text-3xl font-semibold">{data.lineTargets.length}</p>
                </article>
                <article className="rounded-lg border bg-[hsl(var(--surface))] p-4">
                  <p className="text-sm text-muted-foreground">Worker Targets</p>
                  <p className="mt-2 text-3xl font-semibold">{data.workerTargets.length}</p>
                </article>
                <article className="rounded-lg border bg-[hsl(var(--surface))] p-4">
                  <p className="text-sm text-muted-foreground">Line Achievement</p>
                  <p className="mt-2 text-3xl font-semibold">{planned > 0 ? Math.round((actual / planned) * 100) : 0}%</p>
                </article>
              </div>
              <TargetTable params={params} records={data.productTargets} targetType="product" title="Product Targets" />
              <TargetTable params={params} records={data.lineTargets} targetType="line" title="Line Targets" />
              <TargetTable params={params} records={data.workerTargets} targetType="worker" title="Worker Targets" />
              <TargetTable params={params} records={data.dailyReports} targetType="dpr" title="DPR Achievement Facts" />
            </div>
          )}
        </PageContent>
        {createType ? (
          <TargetRecordModalLauncher autoOpen closeHref={closeHref} lookups={data.lookups} targetType={createType} />
        ) : null}
        {selectedType && selectedRecord ? (
          <TargetRecordModalLauncher autoOpen closeHref={closeHref} lookups={data.lookups} record={selectedRecord} targetType={selectedType} />
        ) : null}
      </PageContainer>
    </ManufacturingShell>
  );
}

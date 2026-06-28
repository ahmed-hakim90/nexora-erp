import {
  getFinanceEntity,
  type FinanceEntityDescriptor,
} from "@/features/finance/public-api";
import {
  getFinanceAccess,
  getFinanceRecord,
  listAllFinanceRecords,
  listFinanceRecords,
} from "@/features/finance/routes/loaders/finance.loader";

import { FinanceDetailView } from "./finance-detail-view";
import {
  FinanceListView,
  type FinanceListColumn,
  type FinanceListQueryState,
} from "./finance-list-view";
import type { FinanceRelationOptions } from "./finance-entity-drawer";

type SearchParams = Record<string, string | undefined>;

function buildFinanceListHref(
  basePath: string,
  current: SearchParams,
  overrides: Record<string, string | null | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function deriveColumns(descriptor: FinanceEntityDescriptor): FinanceListColumn[] {
  return descriptor.fields
    .filter((field) => field.showInList)
    .map((field) => ({ autoCode: field.autoCode, key: field.name, header: field.label, field: field.name, type: field.type }));
}

function optionLabel(record: Record<string, unknown>): string {
  const code =
    record.accountCode ??
    record.currencyCode ??
    record.journalKey ??
    record.fiscalYearKey ??
    record.fiscalPeriodKey ??
    record.dimensionKey ??
    record.accountTypeKey ??
    record.taxKey ??
    record.termsKey;
  const name = record.name;

  if (code && name) return `${String(code)} — ${String(name)}`;
  return String(code ?? name ?? record.id);
}

async function loadRelationOptions(descriptor: FinanceEntityDescriptor): Promise<FinanceRelationOptions> {
  if (!descriptor.relations || descriptor.relations.length === 0) {
    return {};
  }

  const entries = await Promise.all(
    descriptor.relations.map(async (relation) => {
      const targetKey = relation.targetBasePath?.split("/").pop();
      if (!targetKey) {
        return [relation.field, []] as const;
      }

      try {
        const records = await listAllFinanceRecords(targetKey, {});
        const options = records.map((record) => ({
          value: String((record as Record<string, unknown>).id),
          label: optionLabel(record as Record<string, unknown>),
        }));
        return [relation.field, options] as const;
      } catch {
        return [relation.field, []] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

export async function FinanceListPage({
  entityKey,
  searchParams,
}: Readonly<{
  entityKey: string;
  searchParams?: Promise<SearchParams>;
}>) {
  const descriptor = getFinanceEntity(entityKey);
  const params = (await searchParams) ?? {};

  const query = {
    search: params.search,
    status: params.status,
    isActive: params.isActive === undefined || params.isActive === "" ? undefined : params.isActive === "true",
    cursor: params.cursor,
    pageSize: 50,
  };

  let records: Record<string, unknown>[] = [];
  let nextCursor: string | null = null;
  let errorMessage: string | undefined;

  try {
    const page = await listFinanceRecords(entityKey, query);
    records = page.records.map((record) => ({ ...record }));
    nextCursor = page.nextCursor;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load records.";
  }

  let canManage = false;
  try {
    ({ canManage } = await getFinanceAccess(entityKey));
  } catch {
    canManage = false;
  }

  const relationOptions = await loadRelationOptions(descriptor).catch((): FinanceRelationOptions => ({}));
  let selectedRecord = params.edit ? records.find((record) => String(record.id) === params.edit) : undefined;
  if (params.edit && !selectedRecord) {
    try {
      selectedRecord = (await getFinanceRecord(entityKey, params.edit)) as Record<string, unknown>;
    } catch {
      errorMessage = errorMessage ?? `Could not load selected ${descriptor.singular.toLowerCase()}.`;
    }
  }
  const closeHref = buildFinanceListHref(descriptor.basePath, params, { create: null, edit: null });

  const queryState: FinanceListQueryState = {
    create: params.create,
    edit: params.edit,
    search: params.search,
    status: params.status,
    isActive: params.isActive,
    cursor: params.cursor,
    view: params.view,
  };

  return (
    <FinanceListView
      basePath={descriptor.basePath}
      canManage={canManage}
      columns={deriveColumns(descriptor)}
      description={descriptor.description}
      entityKey={entityKey}
      errorMessage={errorMessage}
      fields={descriptor.fields}
      nextCursor={nextCursor}
      pageSize={50}
      query={queryState}
      records={records}
      relationOptions={relationOptions}
      selectedRecord={selectedRecord}
      modalCloseHref={closeHref}
      singular={descriptor.singular}
      statusField={descriptor.statusField}
      statusValues={descriptor.statusValues}
      supportsTree={descriptor.supportsTree}
      title={descriptor.title}
      treeParentField={descriptor.treeParentField}
    />
  );
}

export async function FinanceDetailPage({
  entityKey,
  id,
}: Readonly<{
  entityKey: string;
  id: string;
}>) {
  const descriptor = getFinanceEntity(entityKey);

  let record: Record<string, unknown> | null = null;
  let errorMessage: string | undefined;

  try {
    record = (await getFinanceRecord(entityKey, id)) as Record<string, unknown>;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load the record.";
  }

  let canManage = false;
  try {
    ({ canManage } = await getFinanceAccess(entityKey));
  } catch {
    canManage = false;
  }

  if (!record) {
    return (
      <section className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <a className="hover:underline" href={descriptor.basePath}>
            {descriptor.title}
          </a>
          <span className="mx-2">/</span>
          <span>Not found</span>
        </nav>
        <div className="rounded-md border border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 p-6 text-sm text-[hsl(var(--danger))]">
          <p className="font-medium">{descriptor.singular} not available</p>
          <p className="mt-1">{errorMessage ?? "This record could not be found in the active company scope."}</p>
        </div>
      </section>
    );
  }

  const relationOptions = await loadRelationOptions(descriptor).catch((): FinanceRelationOptions => ({}));

  const relationLinks = (descriptor.relations ?? []).map((relation) => {
    const value = record?.[relation.field];
    const stringValue = value ? String(value) : "";
    const matched = relationOptions[relation.field]?.find((option) => option.value === stringValue);
    return {
      key: relation.key,
      label: relation.label,
      value: matched?.label ?? stringValue,
      href: stringValue && relation.targetBasePath ? `${relation.targetBasePath}/${stringValue}` : null,
    };
  });

  return (
    <FinanceDetailView
      basePath={descriptor.basePath}
      canManage={canManage}
      entityKey={entityKey}
      fields={descriptor.fields}
      record={record}
      relationLinks={relationLinks}
      relationOptions={relationOptions}
      singular={descriptor.singular}
      statusField={descriptor.statusField}
      title={descriptor.title}
    />
  );
}

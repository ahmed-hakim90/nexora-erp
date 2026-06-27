import type { ReactNode } from "react";

import {
  EnterpriseDataTable,
  FieldGroup,
  FormGrid,
  FormSection,
  PageActions,
  PageContainer,
  PageContent,
  PageFilters,
  PageFooter,
  PageForm,
  PageHeader,
} from "@/shared/ui";

type PageConfig = Readonly<{
  key: string;
  title: string;
  description: string;
  basePath: string;
  columns: readonly { key: string; header: string; field: string }[];
  formFields: readonly { name: string; label: string; type: string; isRequired: boolean }[];
}>;

type ListResult = Readonly<{
  records: readonly Record<string, unknown>[];
  nextCursor: string | null;
  pageSize: number;
}>;

function valueToText(value: unknown): ReactNode {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export async function MasterDataListPage({
  config,
  loadRecords,
  searchParams,
}: Readonly<{
  config: PageConfig;
  loadRecords: (query: Record<string, string | undefined>) => Promise<ListResult>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: ListResult = { records: [], nextCursor: null, pageSize: 50 };
  let errorMessage: string | undefined;

  try {
    result = await loadRecords(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load records.";
  }

  return (
    <PageContainer>
      <PageHeader description={config.description} title={config.title}>
        <PageActions>
          <a className="rounded-md border px-3 py-2 text-sm" href={`${config.basePath}/new`}>
            Create
          </a>
        </PageActions>
      </PageHeader>
      <PageFilters>
        <p className="text-sm text-muted-foreground">
          Server-side search, active filters, sorting, soft-delete filtering, and cursor pagination are wired through the route loader.
        </p>
      </PageFilters>
      <PageContent>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={config.columns.map((column) => ({
            key: column.key,
            header: column.header,
            canSort: true,
            canFilter: true,
            render: (record) => valueToText(record[column.field]),
          }))}
          emptyMessage="No master data records found."
          errorMessage={errorMessage}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
          records={result.records}
          rowActions={(record) => [
            { key: "view", label: "View", href: `${config.basePath}/${record.id}` },
            { key: "edit", label: "Edit", href: `${config.basePath}/${record.id}/edit` },
          ]}
          state={{ globalSearch: params.search }}
        />
      </PageContent>
    </PageContainer>
  );
}

export function MasterDataFormPage({
  config,
  title,
  action,
  record,
}: Readonly<{
  config: PageConfig;
  title: string;
  action: (formData: FormData) => Promise<void>;
  record?: Record<string, unknown>;
}>) {
  return (
    <PageContainer>
      <PageHeader description={config.description} title={title} />
      <PageForm action={action} title={title}>
        <FormSection description="Minimal foundation fields. Future modules can extend this surface without adding transactions here." title="General">
          <FormGrid>
            {config.formFields.map((field) => (
              <FieldGroup isRequired={field.isRequired} key={field.name} label={field.label}>
                {field.type === "checkbox" ? (
                  <>
                    <input name={field.name} type="hidden" value="false" />
                    <input
                      className="h-4 w-4 rounded border"
                      defaultChecked={record?.[field.name] === true}
                      name={field.name}
                      type="checkbox"
                      value="true"
                    />
                  </>
                ) : (
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    defaultValue={record?.[field.name] == null ? "" : String(record[field.name])}
                    name={field.name}
                    required={field.isRequired}
                    type={field.type}
                  />
                )}
              </FieldGroup>
            ))}
          </FormGrid>
          {config.formFields.some((field) => field.name === "branchId") ? null : (
            <FieldGroup label="Branch ID">
              <input
                className="w-full rounded-md border px-3 py-2"
                defaultValue={record?.branchId == null ? "" : String(record.branchId)}
                name="branchId"
                type="text"
              />
            </FieldGroup>
          )}
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save
          </button>
          <a className="rounded-md border px-3 py-2 text-sm" href={config.basePath}>
            Cancel
          </a>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export async function MasterDataDetailPage({
  config,
  loadRecord,
}: Readonly<{
  config: PageConfig;
  loadRecord: () => Promise<Record<string, unknown>>;
}>) {
  let record: Record<string, unknown> | null = null;
  let errorMessage: string | undefined;

  try {
    record = await loadRecord();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load record.";
  }

  return (
    <PageContainer>
      <PageHeader description={config.description} title={`${config.title} Detail`}>
        <PageActions>
          {record ? (
            <a className="rounded-md border px-3 py-2 text-sm" href={`${config.basePath}/${record.id}/edit`}>
              Edit
            </a>
          ) : null}
        </PageActions>
      </PageHeader>
      <PageContent>
        <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
          {errorMessage ? <p className="text-sm text-[hsl(var(--danger))]">{errorMessage}</p> : null}
          {record ? (
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              {Object.entries(record).map(([key, value]) => (
                <div className="rounded-md border p-3" key={key}>
                  <dt className="font-medium">{key}</dt>
                  <dd className="mt-1 text-muted-foreground">{valueToText(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      </PageContent>
      <PageFooter>Detail placeholder only. No downstream transactions are implemented in Sprint 5.</PageFooter>
    </PageContainer>
  );
}

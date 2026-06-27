import type { ReactNode } from "react";

import type { ManufacturingResourceDefinition } from "@/features/manufacturing/public-api";
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

export async function ManufacturingListPage({
  definition,
  loadRecords,
  searchParams,
}: Readonly<{
  definition: ManufacturingResourceDefinition;
  loadRecords: (query: Record<string, string | undefined>) => Promise<ListResult>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  let result: ListResult = { records: [], nextCursor: null, pageSize: 50 };
  let errorMessage: string | undefined;

  try {
    result = await loadRecords(params);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing records.";
  }

  return (
    <PageContainer>
      <PageHeader description={definition.description} title={definition.title}>
        <PageActions>
          <a className="rounded-md border px-3 py-2 text-sm" href={`${definition.basePath}/new`}>
            Create
          </a>
        </PageActions>
      </PageHeader>
      <PageFilters>
        <p className="text-sm text-muted-foreground">
          Foundation CRUD only. Production sessions, reports, work orders, planning, attendance, performance, and inventory posting are intentionally absent.
        </p>
      </PageFilters>
      <PageContent>
        <EnterpriseDataTable<Record<string, unknown>>
          columns={definition.columns.map((column) => ({
            key: column.key,
            header: column.header,
            canSort: true,
            canFilter: true,
            render: (record) => valueToText(record[column.field]),
          }))}
          emptyMessage="No manufacturing foundation records found."
          errorMessage={errorMessage}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", pageSize: result.pageSize, nextCursor: result.nextCursor }}
          records={result.records}
          rowActions={(record) => [
            { key: "view", label: "View", href: `${definition.basePath}/${record.id}` },
            { key: "edit", label: "Edit", href: `${definition.basePath}/${record.id}/edit` },
          ]}
          state={{ globalSearch: params.search }}
        />
      </PageContent>
    </PageContainer>
  );
}

export function ManufacturingFormPage({
  action,
  definition,
  record,
  title,
}: Readonly<{
  action: (formData: FormData) => Promise<void>;
  definition: ManufacturingResourceDefinition;
  record?: Record<string, unknown>;
  title: string;
}>) {
  return (
    <PageContainer>
      <PageHeader description={definition.description} title={title} />
      <PageForm action={action} title={title}>
        <FormSection description="Minimal foundation fields. Future production execution will consume these records through Production Sessions." title="General">
          <FormGrid>
            {definition.formFields.map((field) => (
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
        </FormSection>
        <PageActions>
          <button className="rounded-md border px-3 py-2 text-sm" type="submit">
            Save
          </button>
          <a className="rounded-md border px-3 py-2 text-sm" href={definition.basePath}>
            Cancel
          </a>
        </PageActions>
      </PageForm>
    </PageContainer>
  );
}

export async function ManufacturingDetailPage({
  definition,
  loadRecord,
}: Readonly<{
  definition: ManufacturingResourceDefinition;
  loadRecord: () => Promise<Record<string, unknown>>;
}>) {
  let record: Record<string, unknown> | null = null;
  let errorMessage: string | undefined;

  try {
    record = await loadRecord();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load manufacturing record.";
  }

  return (
    <PageContainer>
      <PageHeader description={definition.description} title={`${definition.singularTitle} Detail`}>
        <PageActions>
          {record ? (
            <a className="rounded-md border px-3 py-2 text-sm" href={`${definition.basePath}/${record.id}/edit`}>
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
      <PageFooter>Foundation detail only. No production execution, reporting, attendance, performance, or inventory posting is implemented in Sprint 12.</PageFooter>
    </PageContainer>
  );
}

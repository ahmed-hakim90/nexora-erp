import Link from "next/link";

import type { HrFoundationDescriptor } from "@/features/hr/public-api";
import { hrFoundationPageHelp, resolveHrFoundationResourceHelp } from "@/features/hr/public-api";
import { formatHrFoundationListValue } from "@/features/hr/routes/loaders/hr-foundation.loader";
import type { HrFoundationWorkspaceData } from "@/features/hr/routes/loaders/hr-foundation.loader";
import { buildListQueryHref, Button, EnterpriseDataTable, Input, nativeSelectClassName, PageActions, PageContainer, PageContent, PageFilters, PageFooter, PageHeader, secondaryButtonLinkClassName, type ListQueryState } from "@/shared/ui";

import { HrFoundationRecordModalLauncher } from "./hr-foundation-modal";

type FoundationRow = Record<string, unknown>;
type HrFoundationQueryState = ListQueryState;

export function HrFoundationListPage({
  closeHref,
  query,
  selectedRecord,
  workspace,
}: Readonly<{
  closeHref: string;
  query: HrFoundationQueryState;
  selectedRecord?: FoundationRow;
  workspace: HrFoundationWorkspaceData;
}>) {
  const { descriptor, records } = workspace;
  const listFields = descriptor.fields.filter((field) => field.showInList);

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={descriptor.description}
        help={resolveHrFoundationResourceHelp(descriptor.key, descriptor.description)}
        title={descriptor.titleAr ? `${descriptor.title} / ${descriptor.titleAr}` : descriptor.title}
      >
        <PageActions>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[hsl(var(--accent))] bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--accent-foreground))] shadow-sm transition-colors"
            href={buildListQueryHref(descriptor.basePath, query, { create: "1", edit: null })}
          >
            Create {descriptor.singular}
          </Link>
        </PageActions>
      </PageHeader>
      <PageContent>
        <div className="mb-4">
          <PageFilters>
            <form action={descriptor.basePath} className="flex flex-wrap gap-2">
              <Input className="min-w-[12rem] flex-1" defaultValue={query.search ?? ""} name="search" placeholder="Search by code or name" />
              <select className={`${nativeSelectClassName} min-w-[10rem]`} defaultValue={query.status ?? ""} name="status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </form>
          </PageFilters>
        </div>
        <EnterpriseDataTable<FoundationRow>
          columns={[
            ...listFields.map((field) => ({
              canFilter: true,
              canSort: true,
              header: field.labelAr ? `${field.label} / ${field.labelAr}` : field.label,
              key: field.name,
              render: (record: FoundationRow) => formatHrFoundationListValue(descriptor, workspace.lookups, field, record),
            })),
            {
              header: "Actions",
              key: "actions",
              render: (record: FoundationRow) => (
                <div className="flex gap-2">
                  <Link className="text-sm underline" href={buildListQueryHref(descriptor.basePath, query, { edit: String(record.id), create: null })}>
                    Edit
                  </Link>
                </div>
              ),
            },
          ]}
          emptyMessage={`No ${descriptor.title.toLowerCase()} found.`}
          getRowId={(record) => String(record.id)}
          pagination={{ mode: "cursor", nextCursor: workspace.nextCursor, pageSize: workspace.pageSize }}
          records={records}
        />
        {workspace.nextCursor ? (
          <div className="mt-4 flex justify-end">
            <Link
              className={secondaryButtonLinkClassName}
              href={buildListQueryHref(descriptor.basePath, query, { cursor: workspace.nextCursor })}
            >
              Load more
            </Link>
          </div>
        ) : null}
      </PageContent>
      {query.create === "1" ? (
        <HrFoundationRecordModalLauncher autoOpen closeHref={closeHref} descriptor={descriptor} lookups={workspace.lookups} />
      ) : null}
      {selectedRecord ? (
        <HrFoundationRecordModalLauncher autoOpen closeHref={closeHref} descriptor={descriptor} lookups={workspace.lookups} record={selectedRecord} />
      ) : null}
      <PageFooter>HR foundation master data. Organization changes for employees must go through Assignments.</PageFooter>
    </PageContainer>
  );
}

export function HrFoundationHub({
  description,
  helpKey,
  hierarchy,
  resources,
  title,
  titleAr,
}: Readonly<{
  description: string;
  helpKey?: keyof typeof hrFoundationPageHelp;
  hierarchy?: readonly { id: string; kind: string; label: string; parentId: string | null; status: string }[];
  resources: readonly HrFoundationDescriptor[];
  title: string;
  titleAr?: string;
}>) {
  const roots = hierarchy?.filter((node) => !node.parentId) ?? [];
  const childrenByParent = new Map<string, typeof roots>();
  for (const node of hierarchy ?? []) {
    if (!node.parentId) continue;
    const bucket = childrenByParent.get(node.parentId) ?? [];
    bucket.push(node);
    childrenByParent.set(node.parentId, bucket);
  }

  function renderTree(node: (typeof roots)[number], depth = 0) {
    const children = childrenByParent.get(node.id) ?? [];
    return (
      <li className="text-sm" key={node.id}>
        <span className="inline-flex items-center gap-2" style={{ paddingInlineStart: `${depth * 1.25}rem` }}>
          <span className="rounded border px-1.5 py-0.5 text-xs capitalize">{node.kind}</span>
          <span>{node.label}</span>
          <span className="text-xs text-muted-foreground">{node.status}</span>
        </span>
        {children.length > 0 ? <ul className="mt-1 space-y-1">{children.map((child) => renderTree(child, depth + 1))}</ul> : null}
      </li>
    );
  }

  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader
        description={description}
        help={helpKey ? hrFoundationPageHelp[helpKey] : undefined}
        title={titleAr ? `${title} / ${titleAr}` : title}
      />
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <Link className="rounded-lg border bg-[hsl(var(--surface))] p-5 transition hover:border-accent" href={resource.basePath} key={resource.key}>
              <h2 className="font-medium">{resource.titleAr ? `${resource.title} / ${resource.titleAr}` : resource.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
            </Link>
          ))}
        </section>
        {hierarchy && hierarchy.length > 0 ? (
          <section className="rounded-lg border bg-[hsl(var(--surface))] p-5">
            <h2 className="font-medium">Organization hierarchy</h2>
            <ul className="mt-4 space-y-1">{roots.map((node) => renderTree(node))}</ul>
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}

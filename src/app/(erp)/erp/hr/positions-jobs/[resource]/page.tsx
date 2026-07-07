import { notFound } from "next/navigation";

import { getHrFoundationEntity, isHrFoundationResourceKey } from "@/features/hr/public-api";
import { getHrFoundationRecord, loadHrFoundationWorkspace } from "@/features/hr/routes/loaders/hr-foundation.loader";
import { buildModalCloseHref } from "@/shared/ui";

import { HrFoundationListPage } from "../../_components/hr-foundation-pages";
import { HrShell } from "../../_components/hr-shell";

export default async function HrPositionsJobsResourcePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ resource: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const { resource } = await params;
  if (!isHrFoundationResourceKey(resource)) notFound();
  const descriptor = getHrFoundationEntity(resource);
  if (descriptor.section !== "positions-jobs") notFound();

  const queryParams = (await searchParams) ?? {};
  const workspace = await loadHrFoundationWorkspace(resource, queryParams);
  let selectedRecord = queryParams.edit ? workspace.records.find((record) => String(record.id) === queryParams.edit) : undefined;
  if (queryParams.edit && !selectedRecord) {
    const detail = await getHrFoundationRecord(resource, queryParams.edit);
    selectedRecord = detail.record;
  }
  const closeHref = buildModalCloseHref(workspace.descriptor.basePath, queryParams);

  return (
    <HrShell activeKey="positions-jobs">
      <HrFoundationListPage closeHref={closeHref} query={queryParams} selectedRecord={selectedRecord} workspace={workspace} />
    </HrShell>
  );
}

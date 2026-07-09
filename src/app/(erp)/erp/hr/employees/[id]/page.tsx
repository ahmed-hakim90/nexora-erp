import { PageContainer } from "@/shared/ui";
import { loadHrEmployeeProfile } from "@/features/hr/routes/loaders/hr-employee-profile.loader";

import { HrEmployeeProfileWorkspace } from "../../_components/hr-employee-profile";
import { HrShell } from "../../_components/hr-shell";

export default async function HrEmployeeProfilePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  let data;
  let errorMessage: string | undefined;

  try {
    data = await loadHrEmployeeProfile(id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load employee profile.";
  }

  return (
    <HrShell activeKey="employees">
      <PageContainer className="max-w-[96rem]">
        <div>
          {errorMessage || !data ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">{errorMessage ?? "Employee not found."}</p>
          ) : (
            <HrEmployeeProfileWorkspace data={data} tab={query.tab} uploadKind={query.uploadKind} />
          )}
        </div>
      </PageContainer>
    </HrShell>
  );
}

import { loadHrDocumentsWorkspace } from "@/features/hr/routes/loaders/hr-operational.loader";

import { HrDocumentsWorkspace } from "../_components/hr-operational-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrDocumentsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const data = await loadHrDocumentsWorkspace({ employeeId: params.employeeId });
  return (
    <HrShell activeKey="documents">
      <HrDocumentsWorkspace data={data} defaultEmployeeId={params.employeeId} highlightUpload={params.upload === "1"} />
    </HrShell>
  );
}

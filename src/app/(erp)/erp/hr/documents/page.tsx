import { loadCompanyDocumentComplianceMatrix } from "@/features/hr/routes/loaders/hr-document-compliance.loader";
import { loadHrDocumentsWorkspace } from "@/features/hr/routes/loaders/hr-operational.loader";

import { HrDocumentsWorkspace } from "../_components/hr-operational-pages";
import { HrShell } from "../_components/hr-shell";

export default async function HrDocumentsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const complianceStatus =
    params.complianceStatus === "complete" || params.complianceStatus === "incomplete"
      ? params.complianceStatus
      : undefined;
  const [data, compliance] = await Promise.all([
    loadHrDocumentsWorkspace({ employeeId: params.employeeId }),
    loadCompanyDocumentComplianceMatrix({
      departmentId: params.departmentId,
      status: complianceStatus,
    }),
  ]);
  return (
    <HrShell activeKey="documents">
      <HrDocumentsWorkspace
        compliance={compliance}
        data={data}
        defaultEmployeeId={params.employeeId}
        highlightUpload={params.upload === "1"}
        query={params}
      />
    </HrShell>
  );
}

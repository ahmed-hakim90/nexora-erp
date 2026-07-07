import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { formatHrStatusLabel } from "@/features/hr/public-api";
import { PageHeader } from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

export default async function PortalRequestsPage() {
  const context = await resolveEmployeeRequestContext("portal");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase.from("hr_action_documents").select("id, document_number, action_type, status").eq("employee_id", context.employeeId).is("deleted_at", null).limit(20);

  return (
    <PortalShell activeKey="requests">
      <PageHeader description="Your HR service requests." title="My Requests" />
      <ul className="mt-4 divide-y rounded-lg border">
        {(data ?? []).map((row) => (
          <li className="flex justify-between p-3 text-sm" key={String(row.id)}>
            <span>{String(row.document_number)} · {formatHrStatusLabel(String(row.action_type))}</span>
            <span>{formatHrStatusLabel(String(row.status))}</span>
          </li>
        ))}
        {(data ?? []).length === 0 ? <li className="p-4 text-muted-foreground">No requests.</li> : null}
      </ul>
    </PortalShell>
  );
}

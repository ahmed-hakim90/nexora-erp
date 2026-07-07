import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { PageHeader } from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

export default async function PortalProfilePage() {
  const context = await resolveEmployeeRequestContext("portal");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase.from("hr_employees").select("full_name, employee_number, status, contact_info").eq("id", context.employeeId).maybeSingle();

  return (
    <PortalShell activeKey="profile">
      <PageHeader description="View your employment profile." title="My Profile" />
      <dl className="mt-4 grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{data?.full_name ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Employee #</dt><dd>{data?.employee_number ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Status</dt><dd>{data?.status ?? "—"}</dd></div>
      </dl>
    </PortalShell>
  );
}

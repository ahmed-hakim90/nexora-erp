import Link from "next/link";

import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { PageHeader } from "@/shared/ui";

import { PortalNavLinks, PortalShell } from "./_components/portal-shell";

export default async function PortalHomePage() {
  const context = await resolveEmployeeRequestContext("portal");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase
    .from("hr_employees")
    .select("full_name")
    .eq("id", context.employeeId)
    .maybeSingle();
  const employeeName = data?.full_name ? String(data.full_name) : "Employee";

  return (
    <PortalShell activeKey="home">
      <PageHeader description="Employee self-service for profile, leave, attendance, documents, and payslips." title={`Welcome, ${employeeName}`} />
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        <li><Link className="block rounded-lg border p-4 hover:bg-[hsl(var(--muted))]" href="/portal/profile">My Profile</Link></li>
        <li><Link className="block rounded-lg border p-4 hover:bg-[hsl(var(--muted))]" href="/portal/leave">My Leave</Link></li>
        <li><Link className="block rounded-lg border p-4 hover:bg-[hsl(var(--muted))]" href="/portal/attendance">My Attendance</Link></li>
        <li><Link className="block rounded-lg border p-4 hover:bg-[hsl(var(--muted))]" href="/portal/documents">My Documents</Link></li>
        <li><Link className="block rounded-lg border p-4 hover:bg-[hsl(var(--muted))]" href="/portal/payslips">My Payslips</Link></li>
      </ul>
      <div className="mt-6"><PortalNavLinks /></div>
    </PortalShell>
  );
}

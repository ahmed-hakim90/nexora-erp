import Link from "next/link";

import { EnterpriseDataTable, primaryButtonLinkClassName, secondaryButtonLinkClassName } from "@/shared/ui";
import { inviteUserAction } from "@/features/administration/actions";
import { loadAdministrationWorkspace } from "@/features/administration/data";
import type { AdminInvitation } from "@/features/administration/model";

import {
  AdminModal,
  AdminPageScaffold,
  AdminShell,
  Field,
  checkboxLabelClassName,
  inputClassName,
} from "../_components";

export default async function AdminInvitationsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const data = await loadAdministrationWorkspace();

  return (
    <AdminShell activeKey="invitations">
      <AdminPageScaffold
        actions={<Link className={secondaryButtonLinkClassName} href="/erp/admin/invitations?create=1">Invite User</Link>}
        description="Invite users by email without exposing raw auth-provider internals. Invitations capture role, company, branch, app access, expiration, inviter, and status."
        title="Invitations"
      >
        <EnterpriseDataTable<AdminInvitation>
          columns={[
            { key: "email", header: "Email", render: (invitation) => invitation.email },
            { key: "role", header: "Role", render: (invitation) => invitation.roleKey },
            { key: "status", header: "Status", render: (invitation) => invitation.status },
            { key: "apps", header: "Allowed Apps", render: (invitation) => invitation.allowedApps.join(", ") || "-" },
            { key: "expires", header: "Expires", render: (invitation) => new Date(invitation.expiresAt).toLocaleString() },
            { key: "invitedBy", header: "Invited By", render: (invitation) => invitation.invitedBy },
          ]}
          emptyMessage="No invitations found."
          errorMessage={data.errorMessage}
          getRowId={(invitation) => invitation.id}
          pagination={{ mode: "page", page: 1, pageSize: 25, totalRows: data.invitations.length }}
          records={data.invitations}
        />

        {params.create ? (
          <AdminModal closeHref="/erp/admin/invitations" description="The invitation creates a provider invite and stores tenant access intent in the administration tables." title="Invite User">
            <form action={inviteUserAction} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Email"><input className={inputClassName} name="email" required type="email" /></Field>
                <Field label="Expiration"><input className={inputClassName} name="expiresAt" required type="datetime-local" /></Field>
                <Field label="Role">
                  <select className={inputClassName} name="roleId" required>
                    <option value="">Select role</option>
                    {data.roles.filter((role) => !role.isSystem || role.key !== "super-admin").map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <section className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Company Access</h3>
                  {data.companies.map((company) => (
                    <label className={checkboxLabelClassName} key={company.id}>
                      <input name="companyIds" type="checkbox" value={company.id} />
                      <span>{company.name}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Branch Access</h3>
                  {data.branches.map((branch) => (
                    <label className={checkboxLabelClassName} key={branch.id}>
                      <input name="branchIds" type="checkbox" value={branch.id} />
                      <span>{branch.name}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Allowed Apps</h3>
                  {data.appOptions.map((app) => (
                    <label className={checkboxLabelClassName} key={app.appKey}>
                      <input name="allowedApps" type="checkbox" value={app.appKey} />
                      <span>{app.name}</span>
                    </label>
                  ))}
                </div>
              </section>
              <button className={primaryButtonLinkClassName} type="submit">Send Invitation</button>
            </form>
          </AdminModal>
        ) : null}
      </AdminPageScaffold>
    </AdminShell>
  );
}

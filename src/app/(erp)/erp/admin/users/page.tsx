import Link from "next/link";

import { EnterpriseDataTable, nativeTextareaClassName, primaryButtonLinkClassName, secondaryButtonLinkClassName } from "@/shared/ui";
import { loadAdministrationWorkspace } from "@/features/administration/data";
import { sendPasswordResetAction, updateUserProfileAction, updateUserStatusAction } from "@/features/administration/actions";
import { ADMIN_USER_STATUSES, type AdminUser } from "@/features/administration/model";

import {
  AdminModal,
  AdminPageScaffold,
  AdminShell,
  Field,
  inputClassName,
} from "../_components";

function buildHref(params: Record<string, string | undefined>, overrides: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) next.set(key, value);
  for (const [key, value] of Object.entries(overrides)) {
    if (!value) next.delete(key);
    else next.set(key, value);
  }
  const query = next.toString();
  return query ? `/erp/admin/users?${query}` : "/erp/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const data = await loadAdministrationWorkspace();
  const selectedUser = params.user ? data.users.find((user) => user.id === params.user) : undefined;

  return (
    <AdminShell activeKey="users">
      <AdminPageScaffold
        actions={<Link className={secondaryButtonLinkClassName} href="/erp/admin/invitations?create=1">Invite User</Link>}
        description="Manage tenant users, lifecycle status, role assignments, company and branch access, app access, data scope, and audit visibility."
        title="Users"
      >
        <EnterpriseDataTable<AdminUser>
          columns={[
            { key: "name", header: "Name", render: (user) => user.name },
            { key: "email", header: "Email", render: (user) => user.email },
            { key: "status", header: "Status", render: (user) => user.status },
            { key: "jobTitle", header: "Job Title", render: (user) => user.jobTitle ?? "-" },
            { key: "department", header: "Department", render: (user) => user.department ?? "-" },
            { key: "roles", header: "Roles", render: (user) => user.roles.join(", ") || "-" },
            { key: "apps", header: "Apps", render: (user) => user.allowedApps.join(", ") || "No app access" },
            { key: "lastLogin", header: "Last Login", render: (user) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Unavailable" },
          ]}
          emptyMessage="No tenant users found."
          errorMessage={data.errorMessage}
          getRowId={(user) => user.id}
          pagination={{ mode: "page", page: 1, pageSize: 25, totalRows: data.users.length }}
          records={data.users}
          rowActions={(user) => [
            { href: buildHref(params, { user: user.id }), key: "details", label: "Details" },
            { href: `/erp/admin/access?user=${user.id}`, key: "access", label: "Access" },
          ]}
          state={{ globalSearch: params.search }}
        />

        {selectedUser ? (
          <AdminModal
            closeHref={buildHref(params, { user: null })}
            description="User details are editable through the platform profile and access controls. Lifecycle changes are archived in audit."
            title={selectedUser.name}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
              <section className="space-y-4">
                <form action={updateUserProfileAction} className="space-y-4">
                  <input name="userId" type="hidden" value={selectedUser.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Name"><input className={inputClassName} defaultValue={selectedUser.name} name="name" required /></Field>
                    <Field label="Email"><input className={inputClassName} defaultValue={selectedUser.email} readOnly /></Field>
                    <Field label="Phone"><input className={inputClassName} defaultValue={selectedUser.phone ?? ""} name="phone" /></Field>
                    <Field label="Avatar URL"><input className={inputClassName} defaultValue={selectedUser.avatarUrl ?? ""} name="avatarUrl" type="url" /></Field>
                    <Field label="Job title"><input className={inputClassName} defaultValue={selectedUser.jobTitle ?? ""} name="jobTitle" /></Field>
                    <Field label="Department"><input className={inputClassName} defaultValue={selectedUser.department ?? ""} name="department" /></Field>
                    <Field label="Language"><input className={inputClassName} defaultValue={selectedUser.language} name="language" required /></Field>
                    <Field label="Timezone"><input className={inputClassName} defaultValue={selectedUser.timezone} name="timezone" required /></Field>
                    <Field label="Default company">
                      <select className={inputClassName} defaultValue={selectedUser.defaultCompanyId ?? ""} name="defaultCompanyId">
                        <option value="">Not assigned</option>
                        {data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Default branch">
                      <select className={inputClassName} defaultValue={selectedUser.defaultBranchId ?? ""} name="defaultBranchId">
                        <option value="">Not assigned</option>
                        {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notes"><textarea className={nativeTextareaClassName} defaultValue={selectedUser.notes ?? ""} name="notes" /></Field>
                  <button className={primaryButtonLinkClassName} type="submit">Save Profile</button>
                </form>
              </section>
              <aside className="space-y-4 rounded-xl border bg-[hsl(var(--surface-muted))] p-4">
                <h3 className="text-sm font-semibold">Lifecycle</h3>
                <form action={updateUserStatusAction} className="space-y-3">
                  <input name="userId" type="hidden" value={selectedUser.id} />
                  <Field label="Set status">
                    <select className={inputClassName} defaultValue={selectedUser.status} name="status" required>
                      {ADMIN_USER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </Field>
                  <button className={primaryButtonLinkClassName} type="submit">Save Status</button>
                </form>
                <div className="space-y-2 text-sm">
                  <form action={sendPasswordResetAction} className="rounded-md border bg-[hsl(var(--surface))] p-3">
                    <input name="userId" type="hidden" value={selectedUser.id} />
                    <input name="email" type="hidden" value={selectedUser.email} />
                    <p className="mb-2 text-muted-foreground">Send a password reset email through the configured auth provider.</p>
                    <button className={primaryButtonLinkClassName} type="submit">Reset Password</button>
                  </form>
                  <h3 className="font-semibold">Audit Trail</h3>
                  {data.auditEvents.filter((event) => event.subjectId === selectedUser.id).slice(0, 6).map((event) => (
                    <p className="rounded-md border bg-[hsl(var(--surface))] p-2" key={event.id}>
                      {event.action} · {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  ))}
                  {data.auditEvents.filter((event) => event.subjectId === selectedUser.id).length === 0 ? <p className="text-muted-foreground">No audit events found.</p> : null}
                </div>
              </aside>
            </div>
          </AdminModal>
        ) : null}
      </AdminPageScaffold>
    </AdminShell>
  );
}

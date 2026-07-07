import Link from "next/link";

import { EnterpriseDataTable, nativeTextareaClassName, primaryButtonLinkClassName, secondaryButtonLinkClassName } from "@/shared/ui";
import { createRoleAction } from "@/features/administration/actions";
import { loadAdministrationWorkspace } from "@/features/administration/data";
import { ADMIN_DATA_SCOPE_KINDS, ADMIN_ROLE_TYPES, type AdminRole } from "@/features/administration/model";

import {
  AdminModal,
  AdminPageScaffold,
  AdminShell,
  Field,
  checkboxLabelClassName,
  inputClassName,
} from "../_components";

function closeHref() {
  return "/erp/admin/roles";
}

export default async function AdminRolesPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const data = await loadAdministrationWorkspace();
  const selectedRole = params.role ? data.roles.find((role) => role.id === params.role) : undefined;

  return (
    <AdminShell activeKey="roles">
      <AdminPageScaffold
        actions={<Link className={secondaryButtonLinkClassName} href="/erp/admin/roles?create=1">Create Role</Link>}
        description="Create tenant roles, review system templates, and assign permission sets with scope-aware audit."
        title="Roles"
      >
        <EnterpriseDataTable<AdminRole>
          columns={[
            { key: "name", header: "Role", render: (role) => role.name },
            { key: "key", header: "Key", render: (role) => role.key },
            { key: "type", header: "Type", render: (role) => role.type },
            { key: "scope", header: "Scope", render: (role) => role.scope },
            { key: "status", header: "Status", render: (role) => role.status },
            { key: "permissions", header: "Permissions", render: (role) => role.permissionKeys.length },
          ]}
          emptyMessage="No roles found. Create tenant roles from templates or from scratch."
          errorMessage={data.errorMessage}
          getRowId={(role) => role.id}
          pagination={{ mode: "page", page: 1, pageSize: 25, totalRows: data.roles.length }}
          records={data.roles}
          rowActions={(role) => [{ href: `/erp/admin/roles?role=${role.id}`, key: "details", label: "Details" }]}
        />

        <section className="mt-5 rounded-xl border bg-[hsl(var(--surface))] p-4">
          <h2 className="text-base font-semibold">Default Role Templates</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.roleTemplates.map((template) => (
              <article className="rounded-lg border bg-[hsl(var(--surface-muted))] p-3" key={template.key}>
                <h3 className="font-medium">{template.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {template.type} · {template.scope} · {template.editableAfterCreation ? "editable" : "protected"}
                </p>
              </article>
            ))}
          </div>
        </section>

        {params.create ? (
          <AdminModal closeHref={closeHref()} description="Only permissions owned by the current administrator can be granted." title="Create Role">
            <form action={createRoleAction} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Role name"><input className={inputClassName} name="name" required /></Field>
                <Field help="Optional stable key. Generated from name when blank." label="Role key"><input className={inputClassName} name="roleKey" /></Field>
                <Field label="Role type">
                  <select className={inputClassName} defaultValue="tenant" name="roleType" required>
                    {ADMIN_ROLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Data scope">
                  <select className={inputClassName} defaultValue="tenant" name="dataScope" required>
                    {ADMIN_DATA_SCOPE_KINDS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description"><textarea className={nativeTextareaClassName} name="description" /></Field>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Permissions</h3>
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border p-3 md:grid-cols-2">
                  {data.permissions.map((permission) => (
                    <label className={checkboxLabelClassName} key={permission.id}>
                      <input name="permissionKeys" type="checkbox" value={permission.key} />
                      <span>{permission.key}</span>
                    </label>
                  ))}
                </div>
              </section>
              <button className={primaryButtonLinkClassName} type="submit">Create Role</button>
            </form>
          </AdminModal>
        ) : null}

        {selectedRole ? (
          <AdminModal closeHref={closeHref()} description="Role detail shows permission assignments and audit history." title={selectedRole.name}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedRole.description ?? "No description."}</p>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Type"><input className={inputClassName} defaultValue={selectedRole.type} readOnly /></Field>
                <Field label="Scope"><input className={inputClassName} defaultValue={selectedRole.scope} readOnly /></Field>
                <Field label="Status"><input className={inputClassName} defaultValue={selectedRole.status} readOnly /></Field>
                <Field label="System"><input className={inputClassName} defaultValue={selectedRole.isSystem ? "Yes" : "No"} readOnly /></Field>
              </div>
              <section className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Permissions</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRole.permissionKeys.map((permissionKey) => (
                    <span className="rounded-full border bg-[hsl(var(--surface-muted))] px-2 py-1 text-xs" key={permissionKey}>{permissionKey}</span>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Audit Trail</h3>
                {data.auditEvents.filter((event) => event.subjectId === selectedRole.id).slice(0, 8).map((event) => (
                  <p className="mt-2 text-sm" key={event.id}>{event.action} · {new Date(event.occurredAt).toLocaleString()}</p>
                ))}
              </section>
            </div>
          </AdminModal>
        ) : null}
      </AdminPageScaffold>
    </AdminShell>
  );
}

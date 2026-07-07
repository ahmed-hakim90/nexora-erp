import Link from "next/link";

import { EnterpriseDataTable, primaryButtonLinkClassName, secondaryButtonLinkClassName } from "@/shared/ui";
import { assignUserAccessAction, assignUserRolesAction } from "@/features/administration/actions";
import { loadAdministrationWorkspace } from "@/features/administration/data";
import { ADMIN_DATA_SCOPE_KINDS, type AdminUser } from "@/features/administration/model";

import {
  AdminModal,
  AdminPageScaffold,
  AdminShell,
  Field,
  checkboxLabelClassName,
  inputClassName,
} from "../_components";

export default async function AdminAccessPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const data = await loadAdministrationWorkspace();
  const selectedUser = params.user ? data.users.find((user) => user.id === params.user) : undefined;

  return (
    <AdminShell activeKey="access">
      <AdminPageScaffold
        description="Assign tenant, company, branch, app, and data-scope access. Query behavior is governed by the assigned scopes and the platform permission resolver."
        title="Company, Branch, App, and Data Scope Access"
      >
        <EnterpriseDataTable<AdminUser>
          columns={[
            { key: "name", header: "User", render: (user) => user.name },
            { key: "companies", header: "Companies", render: (user) => user.companyAccess.mode === "all" ? "All companies" : user.companyAccess.companyIds.length },
            { key: "branches", header: "Branches", render: (user) => user.branchAccess.some((access) => access.mode === "all") ? "All in company" : user.branchAccess.reduce((count, access) => count + access.branchIds.length, 0) },
            { key: "apps", header: "Apps", render: (user) => user.allowedApps.join(", ") || "No app access" },
            { key: "dataScope", header: "Data Scope", render: (user) => user.dataScope },
          ]}
          emptyMessage="No users available for access assignment."
          errorMessage={data.errorMessage}
          getRowId={(user) => user.id}
          pagination={{ mode: "page", page: 1, pageSize: 25, totalRows: data.users.length }}
          records={data.users}
          rowActions={(user) => [{ href: `/erp/admin/access?user=${user.id}`, key: "assign", label: "Assign Access" }]}
        />

        {selectedUser ? (
          <AdminModal closeHref="/erp/admin/access" description="Access changes require membership management permission and create audit events." title={`Assign Access: ${selectedUser.name}`}>
            <form action={assignUserAccessAction} className="space-y-5">
              <input name="userId" type="hidden" value={selectedUser.id} />
              <div className="grid gap-4 lg:grid-cols-4">
                <Field label="Company mode">
                  <select className={inputClassName} defaultValue={selectedUser.companyAccess.mode} name="companyMode">
                    <option value="specific">Specific companies</option>
                    <option value="all">All companies</option>
                  </select>
                </Field>
                <Field label="Branch mode">
                  <select className={inputClassName} defaultValue={selectedUser.branchAccess.some((access) => access.mode === "all") ? "all" : "specific"} name="branchMode">
                    <option value="specific">Specific branches</option>
                    <option value="all">All branches inside selected companies</option>
                  </select>
                </Field>
                <Field label="Data scope">
                  <select className={inputClassName} defaultValue={selectedUser.dataScope} name="dataScope">
                    {ADMIN_DATA_SCOPE_KINDS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                  </select>
                </Field>
                <div className="flex items-end">
                  <Link className={secondaryButtonLinkClassName} href={`/erp/admin/users?user=${selectedUser.id}`}>View User</Link>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Companies</h3>
                  {data.companies.map((company) => (
                    <label className={checkboxLabelClassName} key={company.id}>
                      <input defaultChecked={selectedUser.companyAccess.companyIds.includes(company.id)} name="companyIds" type="checkbox" value={company.id} />
                      <span>{company.name}</span>
                    </label>
                  ))}
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Branches</h3>
                  {data.companies.flatMap((company) =>
                    data.branches.map((branch) => (
                      <label className={checkboxLabelClassName} key={`${company.id}:${branch.id}`}>
                        <input
                          defaultChecked={selectedUser.branchAccess.some((access) =>
                            access.companyId === company.id && access.branchIds.includes(branch.id)
                          )}
                          name="branchRefs"
                          type="checkbox"
                          value={`${company.id}:${branch.id}`}
                        />
                        <span>{company.name} / {branch.name}</span>
                      </label>
                    ))
                  )}
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Allowed Apps</h3>
                  {data.appOptions.map((app) => (
                    <label className={checkboxLabelClassName} key={app.appKey}>
                      <input defaultChecked={selectedUser.allowedApps.includes(app.appKey)} name="allowedApps" type="checkbox" value={app.appKey} />
                      <span>{app.name}</span>
                    </label>
                  ))}
                </section>
              </div>
              <button className={primaryButtonLinkClassName} type="submit">Save Access</button>
            </form>
            <form action={assignUserRolesAction} className="mt-6 space-y-3 border-t pt-5">
              <input name="userId" type="hidden" value={selectedUser.id} />
              <h3 className="text-sm font-semibold">Role Assignments</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {data.roles.filter((role) => !role.isSystem || role.key !== "super-admin").map((role) => (
                  <label className={checkboxLabelClassName} key={role.id}>
                    <input defaultChecked={selectedUser.roles.includes(role.key)} name="roleIds" type="checkbox" value={role.id} />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
              <button className={primaryButtonLinkClassName} type="submit">Save Roles</button>
            </form>
          </AdminModal>
        ) : null}
      </AdminPageScaffold>
    </AdminShell>
  );
}

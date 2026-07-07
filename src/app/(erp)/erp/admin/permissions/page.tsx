import { buildPermissionMatrix } from "@/features/administration/model";
import { loadAdministrationWorkspace } from "@/features/administration/data";

import { AdminPageScaffold, AdminShell } from "../_components";

export default async function AdminPermissionsPage() {
  const data = await loadAdministrationWorkspace();
  const matrix = buildPermissionMatrix(data.permissions.map((permission) => permission.key));

  return (
    <AdminShell activeKey="permissions">
      <AdminPageScaffold
        description="Review the enterprise permission matrix by app, module, entity, and supported action. Matrix cells map directly to registered permission keys."
        title="Permissions Matrix"
      >
        {data.errorMessage ? <p className="rounded-md border border-[hsl(var(--danger))] p-4 text-sm">{data.errorMessage}</p> : null}
        <section className="overflow-auto rounded-xl border bg-[hsl(var(--surface))]">
          <table className="w-full min-w-[80rem] text-sm">
            <thead className="bg-[hsl(var(--muted))]">
              <tr>
                <th className="p-3 text-start">App</th>
                <th className="p-3 text-start">Module</th>
                <th className="p-3 text-start">Entity</th>
                {["view", "create", "edit", "archive", "delete", "submit", "approve", "export", "import", "print", "manage-settings", "audit"].map((action) => (
                  <th className="p-3 text-start" key={action}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr className="border-t" key={row.key}>
                  <td className="p-3 font-medium">{row.app}</td>
                  <td className="p-3">{row.module}</td>
                  <td className="p-3">{row.entity}</td>
                  {Object.entries(row.actions).map(([action, permissionKey]) => (
                    <td className="p-3" key={action}>
                      {permissionKey ? (
                        <span className="rounded-full border bg-[hsl(var(--surface-muted))] px-2 py-1 text-xs">{permissionKey}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {matrix.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={15}>No registered permissions found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </AdminPageScaffold>
    </AdminShell>
  );
}

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { PLATFORM_PERMISSIONS } from "@/platform/permissions/public-api";
import { requirePermission } from "@/platform/permissions/server";
import { EnterpriseDataTable, PageContainer, PageHeader } from "@/shared/ui";

import { AdminShell } from "../_components";

export default async function AdminAuditExplorerPage() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: PLATFORM_PERMISSIONS.readAuditLog });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data } = await supabase
    .from("audit_events")
    .select("id, action, category, actor_principal_id, subject_type, subject_id, occurred_at, metadata")
    .eq("tenant_id", context.tenantId)
    .order("occurred_at", { ascending: false })
    .limit(100);

  const records = (data ?? []).map((row) => ({
    action: String(row.action),
    actor: row.actor_principal_id ? String(row.actor_principal_id).slice(0, 8) : "—",
    category: String(row.category),
    id: String(row.id),
    occurredAt: String(row.occurred_at).replace("T", " ").slice(0, 19),
    subject: `${row.subject_type ?? "—"}:${row.subject_id ? String(row.subject_id).slice(0, 8) : "—"}`,
  }));

  return (
    <AdminShell activeKey="audit">
      <PageContainer className="max-w-[96rem]">
        <PageHeader
          description="Searchable audit trail for security and operational review."
          title="Audit Explorer"
        />
        <EnterpriseDataTable
          columns={[
            { header: "When", key: "when", render: (r) => r.occurredAt },
            { header: "Category", key: "category", render: (r) => r.category },
            { header: "Action", key: "action", render: (r) => r.action },
            { header: "Subject", key: "subject", render: (r) => r.subject },
            { header: "Actor", key: "actor", render: (r) => r.actor },
          ]}
          emptyMessage="No audit events recorded yet."
          getRowId={(r) => r.id}
          pagination={{ mode: "cursor", pageSize: 25 }}
          records={records}
        />
      </PageContainer>
    </AdminShell>
  );
}

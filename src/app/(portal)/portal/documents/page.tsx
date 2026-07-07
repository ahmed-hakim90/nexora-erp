import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { formatHrDisplayLabel, formatHrStatusLabel } from "@/features/hr/public-api";
import { PageHeader } from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function documentStatus(expiresOn: string | null): string {
  if (!expiresOn) return "active";
  const today = new Date().toISOString().slice(0, 10);
  if (expiresOn < today) return "expired";
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 30);
  if (expiresOn <= soon.toISOString().slice(0, 10)) return "expiring_soon";
  return "active";
}

export default async function PortalDocumentsPage() {
  const context = await resolveEmployeeRequestContext("portal");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data } = await supabase
    .from("file_attachments")
    .select("id, file_name, metadata, created_at")
    .eq("tenant_id", context.tenantId)
    .eq("module_key", "hr")
    .eq("entity_type", "hr_employee_document")
    .eq("entity_id", context.employeeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PortalShell activeKey="documents">
      <PageHeader description="Your uploaded HR documents and expiry status." title="My Documents" />
      <ul className="mt-4 divide-y rounded-lg border">
        {(data ?? []).map((row) => {
          const metadata = readMetadata(row.metadata);
          const expiresOn = metadata.expiry_date ? String(metadata.expiry_date) : null;
          const status = formatHrStatusLabel(String(metadata.status ?? documentStatus(expiresOn)));
          return (
            <li className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={String(row.id)}>
              <div>
                <p className="font-medium">{formatHrDisplayLabel(row.file_name, "Document")}</p>
                <p className="text-muted-foreground">
                  {formatHrDisplayLabel(metadata.document_type, "Document")}
                  {expiresOn ? ` · expires ${expiresOn}` : ""}
                </p>
              </div>
              <span>{status}</span>
            </li>
          );
        })}
        {(data ?? []).length === 0 ? <li className="p-4 text-muted-foreground">No documents on file.</li> : null}
      </ul>
    </PortalShell>
  );
}

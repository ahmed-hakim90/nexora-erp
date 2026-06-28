"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, Tabs } from "@/shared/ui";
import { displayBusinessCode } from "@/shared/business-codes";
import type { FinanceFieldDescriptor } from "@/features/finance/public-api";
import { archiveFinanceRecordAction } from "@/features/finance/routes/actions/finance.actions";

import { FinanceEntityDrawer, type FinanceRelationOptions } from "./finance-entity-drawer";

type FinanceRecord = Record<string, unknown>;

type RelationLink = Readonly<{ key: string; label: string; value: string; href: string | null }>;

type FinanceDetailViewProps = Readonly<{
  entityKey: string;
  singular: string;
  title: string;
  basePath: string;
  record: FinanceRecord;
  fields: readonly FinanceFieldDescriptor[];
  relationLinks: readonly RelationLink[];
  relationOptions?: FinanceRelationOptions;
  statusField: "status" | "is_active";
  canManage: boolean;
}>;

function display(value: unknown, field?: FinanceFieldDescriptor): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.autoCode) return displayBusinessCode(value, field.autoCode);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function FinanceDetailView({
  entityKey,
  singular,
  title,
  basePath,
  record,
  fields,
  relationLinks,
  relationOptions,
  statusField,
  canManage,
}: FinanceDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const id = String(record.id);
  const statusValue = statusField === "status" ? record.status : record.isActive;

  function archive() {
    setError(null);
    startTransition(async () => {
      try {
        await archiveFinanceRecordAction(entityKey, id);
        router.push(basePath);
        router.refresh();
      } catch (archiveError) {
        setError(archiveError instanceof Error ? archiveError.message : "Could not archive the record.");
      }
    });
  }

  const overview = (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div className="rounded-md border p-3" key={field.name}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
          <dd className="mt-1 text-sm">{display(record[field.name], field)}</dd>
        </div>
      ))}
    </dl>
  );

  const timeline = (
    <ol className="space-y-3">
      <li className="rounded-md border p-3">
        <p className="text-sm font-medium">Record created</p>
        <p className="text-xs text-muted-foreground">{formatTimestamp(record.createdAt)} · by {display(record.createdBy)}</p>
      </li>
      <li className="rounded-md border p-3">
        <p className="text-sm font-medium">Last updated</p>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(record.updatedAt)} · by {display(record.updatedBy)} · version {display(record.version)}
        </p>
      </li>
      <li className="rounded-md border p-3">
        <p className="text-sm font-medium">Current status</p>
        <p className="text-xs text-muted-foreground capitalize">{display(statusValue)}</p>
      </li>
    </ol>
  );

  const attachments = (
    <div className="rounded-md border border-dashed p-6 text-center">
      <p className="text-sm font-medium">No attachments</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Attachments are governed by the platform document/files runtime. This region is wired to the record and will list
        files once the platform files runtime is enabled for the tenant.
      </p>
    </div>
  );

  const comments = (
    <div className="rounded-md border border-dashed p-6 text-center">
      <p className="text-sm font-medium">No comments</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Collaboration notes use the platform notes runtime. The thread for this {singular.toLowerCase()} appears here once
        the platform notes runtime is enabled.
      </p>
    </div>
  );

  const relationsContent =
    relationLinks.length > 0 ? (
      <ul className="space-y-2">
        {relationLinks.map((relation) => (
          <li className="flex items-center justify-between rounded-md border p-3" key={relation.key}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{relation.label}</p>
              <p className="mt-1 text-sm">{relation.value || "—"}</p>
            </div>
            {relation.href ? (
              <a className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-[hsl(var(--muted))]" href={relation.href}>
                Open
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        This {singular.toLowerCase()} has no linked records.
      </p>
    );

  const audit = (
    <dl className="grid gap-3 sm:grid-cols-2">
      <AuditRow label="Identifier" value={id} />
      <AuditRow label="Tenant" value={display(record.tenantId)} />
      <AuditRow label="Company" value={display(record.companyId)} />
      <AuditRow label="Created by" value={display(record.createdBy)} />
      <AuditRow label="Created at" value={formatTimestamp(record.createdAt)} />
      <AuditRow label="Updated by" value={display(record.updatedBy)} />
      <AuditRow label="Updated at" value={formatTimestamp(record.updatedAt)} />
      <AuditRow label="Version" value={display(record.version)} />
      <AuditRow label="Status" value={display(statusValue)} />
      <AuditRow label="Metadata" value={display(record.metadata)} />
    </dl>
  );

  const tabs = [
    { key: "overview", label: "Overview", content: overview },
    { key: "timeline", label: "Timeline", content: timeline },
    { key: "attachments", label: "Attachments", content: attachments },
    { key: "comments", label: "Comments", content: comments },
    { key: "relations", label: "Relations", content: relationsContent },
    { key: "audit", label: "Audit", content: audit },
  ];

  return (
    <section className="space-y-4">
      <nav className="text-sm text-muted-foreground">
        <a className="hover:underline" href={basePath}>
          {title}
        </a>
        <span className="mx-2">/</span>
        <span>{display(record.name)}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{display(record.name)}</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {singular} · {display(statusValue)}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <FinanceEntityDrawer
              entityKey={entityKey}
              fields={fields}
              mode="edit"
              record={record}
              recordId={id}
              relationOptions={relationOptions}
              singular={singular}
              triggerLabel="Edit"
              triggerVariant="primary"
            />
            <Button disabled={isPending} onClick={archive} variant="danger">
              {isPending ? "Archiving…" : "Archive"}
            </Button>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-md border border-[hsl(var(--danger))] px-3 py-2 text-sm text-[hsl(var(--danger))]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-md border bg-[hsl(var(--surface))] p-4">
        <Tabs activeKey={activeTab} onValueChange={setActiveTab} tabs={tabs} />
      </div>
    </section>
  );
}

function AuditRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}

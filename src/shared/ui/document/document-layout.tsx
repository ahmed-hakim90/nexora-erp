import type { ReactNode } from "react";

export type DocumentStatusTone = "neutral" | "success" | "warning" | "danger";

export type DocumentAction = Readonly<{
  key: string;
  label: string;
  isDisabled?: boolean;
  requiredPermission?: string;
}>;

function Section({
  title,
  children,
}: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <section className="rounded-md border bg-[hsl(var(--surface))] p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      {children ?? <p className="text-sm text-muted-foreground">Placeholder</p>}
    </section>
  );
}

export function DocumentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <article className="space-y-4">{children}</article>;
}

export function DocumentHeader({
  title,
  eyebrow,
  metadata,
  actions,
}: Readonly<{
  title: string;
  eyebrow?: string;
  metadata?: ReactNode;
  actions?: readonly DocumentAction[];
}>) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-md border p-4">
      <div>
        {eyebrow ? <p className="text-sm text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {metadata ? <div className="mt-2 text-sm text-muted-foreground">{metadata}</div> : null}
      </div>
      {actions ? <DocumentActions actions={actions} /> : null}
    </header>
  );
}

export function DocumentStatus({
  status,
  tone = "neutral",
}: Readonly<{ status: string; tone?: DocumentStatusTone }>) {
  const toneClass = {
    neutral: "border-[hsl(var(--border))]",
    success: "border-[hsl(var(--success))] text-[hsl(var(--success))]",
    warning: "border-[hsl(var(--warning))] text-[hsl(var(--warning))]",
    danger: "border-[hsl(var(--danger))] text-[hsl(var(--danger))]",
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-sm ${toneClass}`}>{status}</span>;
}

export function DocumentStatusArea({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Status">{children}</Section>;
}

export function DocumentActions({
  actions,
}: Readonly<{ actions: readonly DocumentAction[] }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={action.isDisabled}
          key={action.key}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function DocumentMetadata({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Document Metadata">{children}</Section>;
}

export function WorkflowSection({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Workflow Status">{children}</Section>;
}

export function ApprovalSection({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Approval Status">{children}</Section>;
}

export function TimelineSection({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Timeline">{children}</Section>;
}

export function AttachmentSection({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Attachments">{children}</Section>;
}

export function CommentSection({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Comments">{children}</Section>;
}

export function AuditTimeline({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Audit Timeline">{children}</Section>;
}

export function RelatedDocuments({ children }: Readonly<{ children?: ReactNode }>) {
  return <Section title="Related Documents">{children}</Section>;
}

export function DocumentPrintPlaceholder() {
  return <button className="rounded-md border px-3 py-2 text-sm" type="button">Print</button>;
}

export function DocumentExportPlaceholder() {
  return <button className="rounded-md border px-3 py-2 text-sm" type="button">Export</button>;
}

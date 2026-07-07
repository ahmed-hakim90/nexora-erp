import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { PLATFORM_PERMISSIONS } from "@/platform/permissions/public-api";
import { AppShell, PageActions, PageContainer, PageContent, PageHeader } from "@/shared/ui";
import { resolveErpShellRuntime } from "../../erp-security.server";
import { createErpShellChrome } from "../../erp-shell-model";

export const adminNavItems = [
  { href: "/erp/admin/users", key: "users", label: "Users" },
  { href: "/erp/admin/roles", key: "roles", label: "Roles" },
  { href: "/erp/admin/permissions", key: "permissions", label: "Permissions" },
  { href: "/erp/admin/invitations", key: "invitations", label: "Invitations" },
  { href: "/erp/admin/access", key: "access", label: "Access" },
  { href: "/erp/admin/audit", key: "audit", label: "Audit" },
] as const;

export async function AdminShell({
  activeKey,
  children,
}: Readonly<{
  activeKey: (typeof adminNavItems)[number]["key"];
  children: ReactNode;
}>) {
  const runtime = await resolveErpShellRuntime({
    appKey: "administration",
    permission: PLATFORM_PERMISSIONS.accessAdmin,
  });

  return (
    <AppShell
      {...createErpShellChrome("administration", runtime)}
      breadcrumbs={[{ href: "/erp", label: "Apps" }, { label: "Administration" }]}
      workspace={{ icon: <ShieldCheck className="size-4" />, key: "administration", name: "Administration" }}
      workspaceNav={adminNavItems.map((item) => ({
        href: item.href,
        isActive: item.key === activeKey,
        key: item.key,
        label: item.label,
      }))}
    >
      {children}
    </AppShell>
  );
}

export function AdminPageScaffold({
  actions,
  children,
  description,
  title,
}: Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <PageContainer className="max-w-[96rem]">
      <PageHeader description={description} title={title}>
        {actions ? <PageActions>{actions}</PageActions> : null}
      </PageHeader>
      <PageContent>{children}</PageContent>
    </PageContainer>
  );
}

export function AdminModal({
  children,
  closeHref,
  description,
  title,
}: Readonly<{
  children: ReactNode;
  closeHref: string;
  description: string;
  title: string;
}>) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-[hsl(var(--background))]/70 p-4 backdrop-blur-sm">
      <section className="max-h-[90dvh] w-[min(52rem,100%)] overflow-y-auto rounded-2xl border bg-[hsl(var(--surface))] shadow-[var(--shadow-lg)]">
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Link className="rounded-md border bg-[hsl(var(--surface-muted))] px-3 py-2 text-sm" href={closeHref}>
            Close
          </Link>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

export function Field({
  children,
  help,
  label,
}: Readonly<{
  children: ReactNode;
  help?: string;
  label: string;
}>) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

export const inputClassName =
  "h-10 w-full rounded-md border bg-[hsl(var(--surface))] px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]";
export const checkboxLabelClassName =
  "flex items-center gap-2 rounded-md border bg-[hsl(var(--surface))] px-3 py-2 text-sm";

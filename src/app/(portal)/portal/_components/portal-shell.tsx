import Link from "next/link";
import type { ReactNode } from "react";

import { AppShell, PageContainer } from "@/shared/ui";

const ESS_NAV = [
  { href: "/portal", key: "home", label: "Home" },
  { href: "/portal/profile", key: "profile", label: "My Profile" },
  { href: "/portal/leave", key: "leave", label: "My Leave" },
  { href: "/portal/attendance", key: "attendance", label: "My Attendance" },
  { href: "/portal/documents", key: "documents", label: "My Documents" },
  { href: "/portal/payslips", key: "payslips", label: "My Payslips" },
  { href: "/portal/requests", key: "requests", label: "My Requests" },
] as const;

const MSS_NAV = [
  { href: "/portal/manager", key: "manager", label: "Manager Home" },
  { href: "/portal/manager/approvals", key: "approvals", label: "Approvals" },
  { href: "/portal/manager/team", key: "team", label: "My Team" },
] as const;

export function PortalShell({
  activeKey,
  children,
  mode = "ess",
}: Readonly<{ activeKey: string; children: ReactNode; mode?: "ess" | "mss" }>) {
  const nav = mode === "mss" ? MSS_NAV : ESS_NAV;
  return (
    <AppShell
      breadcrumbs={[{ label: mode === "mss" ? "Manager Self-Service" : "Employee Self-Service" }]}
      homeHref={mode === "mss" ? "/portal/manager" : "/portal"}
      workspace={{ key: "portal", name: mode === "mss" ? "Manager Portal" : "HR Portal" }}
      workspaceNav={nav.map((item) => ({ ...item, isActive: item.key === activeKey }))}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

export function PortalNavLinks() {
  return (
    <p className="text-sm text-muted-foreground">
      <Link className="underline" href="/portal/manager">Manager portal</Link>
      {" · "}
      <Link className="underline" href="/portal">Employee portal</Link>
    </p>
  );
}

import type { ReactNode } from "react";

import { resolveTenantRequestContext } from "@/platform/auth/server";
import { PLATFORM_PERMISSIONS } from "@/platform/permissions/platform-permissions";
import { requirePermission } from "@/platform/permissions/server";

export default async function PortalSectionLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const context = await resolveTenantRequestContext("portal");
  await requirePermission({ context, permission: PLATFORM_PERMISSIONS.accessPortal });
  return children;
}

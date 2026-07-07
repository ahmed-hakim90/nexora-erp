"use client";

import type { ReactNode } from "react";

import type { PermissionKey } from "@/platform/permissions/public-api";
import { EnterpriseUiProvider, type Locale } from "@/shared/ui/providers/enterprise-ui-provider";

export function ErpExperienceProviders({
  children,
  locale = "en",
  permissions = [],
}: Readonly<{
  children: ReactNode;
  locale?: Locale;
  permissions?: readonly PermissionKey[];
}>) {
  return (
    <EnterpriseUiProvider locale={locale} permissions={permissions}>
      {children}
    </EnterpriseUiProvider>
  );
}

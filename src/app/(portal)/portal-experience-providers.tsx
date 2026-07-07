"use client";

import type { ReactNode } from "react";

import { EnterpriseUiProvider } from "@/shared/ui/providers/enterprise-ui-provider";

export function PortalExperienceProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <EnterpriseUiProvider>{children}</EnterpriseUiProvider>;
}

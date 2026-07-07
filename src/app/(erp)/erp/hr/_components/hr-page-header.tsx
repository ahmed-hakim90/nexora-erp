import type { ReactNode } from "react";

import { resolveHrPageHelp, type HrPageHelpKey } from "@/features/hr/public-api";
import { PageHeader } from "@/shared/ui";

export function HrPageHeader({
  children,
  description,
  pageKey,
  title,
}: Readonly<{
  children?: ReactNode;
  description?: string;
  pageKey: HrPageHelpKey;
  title: string;
}>) {
  return (
    <PageHeader description={description} help={resolveHrPageHelp(pageKey)} title={title}>
      {children}
    </PageHeader>
  );
}

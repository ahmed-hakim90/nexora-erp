import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";

import { ErpExperienceProviders } from "./erp-experience-providers";

export default async function ErpExperienceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await resolveBranchRequestContext("erp");
  return <ErpExperienceProviders>{children}</ErpExperienceProviders>;
}

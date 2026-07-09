import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { resolveLocalePreference } from "@/platform/localization/server";

import { ErpExperienceProviders } from "./erp-experience-providers";

export default async function ErpExperienceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await resolveBranchRequestContext("erp");
  const { locale } = await resolveLocalePreference();

  return <ErpExperienceProviders locale={locale}>{children}</ErpExperienceProviders>;
}

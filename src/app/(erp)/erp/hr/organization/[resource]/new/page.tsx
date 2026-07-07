import { notFound } from "next/navigation";

import { isHrFoundationResourceKey } from "@/features/hr/public-api";
import { redirectToHrFoundationCreate } from "@/features/hr/routes/redirects/hr-foundation-redirects";

export default async function HrOrganizationResourceNewPage({
  params,
}: Readonly<{
  params: Promise<{ resource: string }>;
}>) {
  const { resource } = await params;
  if (!isHrFoundationResourceKey(resource)) notFound();
  redirectToHrFoundationCreate(resource);
}

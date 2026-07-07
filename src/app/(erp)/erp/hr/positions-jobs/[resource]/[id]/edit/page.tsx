import { notFound } from "next/navigation";

import { isHrFoundationResourceKey } from "@/features/hr/public-api";
import { redirectToHrFoundationEdit } from "@/features/hr/routes/redirects/hr-foundation-redirects";

export default async function HrPositionsJobsResourceEditPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; resource: string }>;
}>) {
  const { id, resource } = await params;
  if (!isHrFoundationResourceKey(resource)) notFound();
  redirectToHrFoundationEdit(resource, id);
}

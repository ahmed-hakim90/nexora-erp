import { redirect } from "next/navigation";

import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";

export default async function NewManufacturingResourcePage({
  params,
}: Readonly<{
  params: Promise<{ resource: string }>;
}>) {
  const { resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);

  redirect(`${definition.basePath}?create=1`);
}

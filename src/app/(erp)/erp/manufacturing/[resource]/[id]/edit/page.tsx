import { redirect } from "next/navigation";

import { getManufacturingResourceDefinition, parseManufacturingResourceKey } from "@/features/manufacturing/public-api";

export default async function EditManufacturingResourcePage({
  params,
}: Readonly<{
  params: Promise<{ id: string; resource: string }>;
}>) {
  const { id, resource } = await params;
  const resourceKey = parseManufacturingResourceKey(resource);
  const definition = getManufacturingResourceDefinition(resourceKey);

  redirect(`${definition.basePath}?edit=${id}`);
}

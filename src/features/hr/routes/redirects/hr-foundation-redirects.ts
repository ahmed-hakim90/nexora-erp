import { redirect } from "next/navigation";

import { getHrFoundationEntity } from "../../application/foundation-entities";

export function redirectToHrFoundationCreate(resource: string): never {
  const descriptor = getHrFoundationEntity(resource);
  redirect(`${descriptor.basePath}?create=1`);
}

export function redirectToHrFoundationEdit(resource: string, id: string): never {
  const descriptor = getHrFoundationEntity(resource);
  redirect(`${descriptor.basePath}?edit=${encodeURIComponent(id)}`);
}

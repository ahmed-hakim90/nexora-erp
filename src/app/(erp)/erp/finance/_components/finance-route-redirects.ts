import { redirect } from "next/navigation";

import { getFinanceEntity } from "@/features/finance/public-api";

export function redirectToFinanceCreate(entityKey: string): never {
  const descriptor = getFinanceEntity(entityKey);
  redirect(`${descriptor.basePath}?create=1`);
}

export function redirectToFinanceEdit(entityKey: string, id: string): never {
  const descriptor = getFinanceEntity(entityKey);
  redirect(`${descriptor.basePath}?edit=${encodeURIComponent(id)}`);
}

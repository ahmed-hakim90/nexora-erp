import { redirect } from "next/navigation";

function normalizeType(value: string | undefined) {
  return value === "line" || value === "worker" ? value : "product";
}

export default async function NewManufacturingTargetPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  redirect(`/erp/manufacturing/targets?create=${normalizeType(params.type ?? params.targetType)}`);
}

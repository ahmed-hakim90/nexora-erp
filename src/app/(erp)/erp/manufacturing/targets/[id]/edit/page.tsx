import { redirect } from "next/navigation";

function normalizeType(value: string | undefined) {
  return value === "line" || value === "worker" ? value : "product";
}

export default async function EditManufacturingTargetPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const emptyQuery: Record<string, string | undefined> = {};
  const [{ id }, query] = await Promise.all([params, searchParams ?? Promise.resolve(emptyQuery)]);
  redirect(`/erp/manufacturing/targets?editType=${normalizeType(query.type ?? query.editType ?? query.targetType)}&edit=${encodeURIComponent(id)}`);
}

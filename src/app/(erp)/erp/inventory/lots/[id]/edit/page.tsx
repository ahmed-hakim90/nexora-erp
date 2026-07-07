import { redirect } from "next/navigation";

export default async function EditInventoryLotPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirect(`/erp/inventory/lots?edit=${encodeURIComponent(id)}`);
}

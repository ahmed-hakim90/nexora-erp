import { redirect } from "next/navigation";

export default async function EditInventorySerialPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  redirect(`/erp/inventory/serials?edit=${encodeURIComponent(id)}`);
}

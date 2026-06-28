import { redirect } from "next/navigation";

export default async function EditInventoryProductPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirect(`/erp/inventory/products?edit=${encodeURIComponent(id)}`);
}

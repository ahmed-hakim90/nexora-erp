import { redirect } from "next/navigation";

export default async function HrBonusBatchLegacyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/erp/hr/compensation/batches/${id}`);
}

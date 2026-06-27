import { SUPPLIER_PAGE_CONFIG } from "@/features/suppliers/public-api";
import { updateSupplierAction } from "@/features/suppliers/routes/actions/suppliers.actions";
import { getSupplier } from "@/features/suppliers/routes/loaders/suppliers.loader";

import { MasterDataShell } from "../../../_components/master-data-shell";
import { MasterDataFormPage } from "../../../_components/master-data-pages";

export default async function EditSupplierPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  let record: Record<string, unknown> | undefined;

  try {
    record = await getSupplier(id);
  } catch {
    record = undefined;
  }

  return (
    <MasterDataShell activeKey="suppliers">
      <MasterDataFormPage
        action={updateSupplierAction.bind(null, id)}
        config={SUPPLIER_PAGE_CONFIG}
        record={record}
        title="Edit Supplier"
      />
    </MasterDataShell>
  );
}

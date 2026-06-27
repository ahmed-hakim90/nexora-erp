import { configForSlug, PurchaseDocumentFormPage, PurchasingShell } from "../../_components/purchasing-pages";

export default async function NewPurchaseDocumentRoute({
  params,
}: Readonly<{
  params: Promise<{ documentType: string }>;
}>) {
  const { documentType } = await params;
  const config = configForSlug(documentType);

  return (
    <PurchasingShell activeSlug={documentType}>
      <PurchaseDocumentFormPage config={config} />
    </PurchasingShell>
  );
}

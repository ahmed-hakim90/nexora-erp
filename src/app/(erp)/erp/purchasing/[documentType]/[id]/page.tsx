import { getPurchaseDocument } from "@/features/purchasing/routes/loaders/purchasing.loader";

import { configForSlug, PurchaseDocumentDetailPage, PurchasingShell } from "../../_components/purchasing-pages";

export default async function PurchaseDocumentDetailRoute({
  params,
}: Readonly<{
  params: Promise<{ documentType: string; id: string }>;
}>) {
  const { documentType, id } = await params;
  const config = configForSlug(documentType);
  const detail = await getPurchaseDocument(config.kind, id);

  return (
    <PurchasingShell activeSlug={documentType}>
      <PurchaseDocumentDetailPage detail={detail} />
    </PurchasingShell>
  );
}

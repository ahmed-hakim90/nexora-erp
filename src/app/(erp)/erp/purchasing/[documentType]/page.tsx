import { listPurchaseDocuments } from "@/features/purchasing/routes/loaders/purchasing.loader";

import { configForSlug, PurchaseDocumentListPage, PurchasingShell } from "../_components/purchasing-pages";

export default async function PurchasingListRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ documentType: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}>) {
  const { documentType } = await params;
  const query = (await searchParams) ?? {};
  const config = configForSlug(documentType);
  let result: Awaited<ReturnType<typeof listPurchaseDocuments>> = { nextCursor: null, pageSize: 50, records: [] };
  let errorMessage: string | undefined;

  try {
    result = await listPurchaseDocuments(config.kind, query);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load purchasing documents.";
  }

  return (
    <PurchasingShell activeSlug={documentType}>
      <PurchaseDocumentListPage config={config} errorMessage={errorMessage} params={query} result={result as unknown as { nextCursor: string | null; pageSize: number; records: readonly Record<string, unknown>[] }} />
    </PurchasingShell>
  );
}

import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditCurrencyPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("currencies", id);
}

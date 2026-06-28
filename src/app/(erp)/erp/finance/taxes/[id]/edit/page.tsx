import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditTaxPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("taxes", id);
}

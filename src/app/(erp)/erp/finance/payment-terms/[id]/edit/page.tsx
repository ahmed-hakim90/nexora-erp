import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditPaymentTermPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("payment-terms", id);
}

import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditFiscalPeriodPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("fiscal-periods", id);
}

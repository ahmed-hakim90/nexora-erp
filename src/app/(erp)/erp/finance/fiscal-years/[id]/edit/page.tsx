import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditFiscalYearPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("fiscal-years", id);
}

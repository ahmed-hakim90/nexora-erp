import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditCostCenterPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("cost-centers", id);
}

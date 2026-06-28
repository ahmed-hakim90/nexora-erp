import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditAccountPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("chart-of-accounts", id);
}

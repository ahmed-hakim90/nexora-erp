import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditDimensionPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("dimensions", id);
}

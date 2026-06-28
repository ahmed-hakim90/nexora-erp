import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditAccountTypePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("account-types", id);
}

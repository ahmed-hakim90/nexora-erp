import { redirectToFinanceEdit } from "../../../_components/finance-route-redirects";

export default async function EditJournalPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirectToFinanceEdit("journals", id);
}

import { redirect } from "next/navigation";

export default async function EditDailyReportPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  redirect(`/erp/manufacturing/daily-reports?edit=${encodeURIComponent(id)}`);
}

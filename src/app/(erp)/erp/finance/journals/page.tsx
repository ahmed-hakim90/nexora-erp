import { FinanceListPage } from "../_components/finance-pages";
import { FinanceShell } from "../_components/finance-shell";

export default function Page({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  return (
    <FinanceShell activeKey="journals">
      <FinanceListPage entityKey="journals" searchParams={searchParams} />
    </FinanceShell>
  );
}

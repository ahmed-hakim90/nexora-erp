import { FinanceListPage } from "../_components/finance-pages";
import { FinanceShell } from "../_components/finance-shell";

export default function Page({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  return (
    <FinanceShell activeKey="payment-terms">
      <FinanceListPage entityKey="payment-terms" searchParams={searchParams} />
    </FinanceShell>
  );
}

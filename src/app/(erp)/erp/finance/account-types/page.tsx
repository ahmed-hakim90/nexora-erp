import { FinanceListPage } from "../_components/finance-pages";
import { FinanceShell } from "../_components/finance-shell";

export default function Page({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  return (
    <FinanceShell activeKey="account-types">
      <FinanceListPage entityKey="account-types" searchParams={searchParams} />
    </FinanceShell>
  );
}

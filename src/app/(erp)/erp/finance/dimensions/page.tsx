import { FinanceListPage } from "../_components/finance-pages";
import { FinanceShell } from "../_components/finance-shell";

export default function Page({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  return (
    <FinanceShell activeKey="dimensions">
      <FinanceListPage entityKey="dimensions" searchParams={searchParams} />
    </FinanceShell>
  );
}

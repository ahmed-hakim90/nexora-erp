import { FinanceDetailPage } from "../../_components/finance-pages";
import { FinanceShell } from "../../_components/finance-shell";

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  return (
    <FinanceShell activeKey="payment-terms">
      <FinanceDetailPage entityKey="payment-terms" id={id} />
    </FinanceShell>
  );
}

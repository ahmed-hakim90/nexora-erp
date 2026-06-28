import { FinanceDashboard } from "./_components/finance-dashboard";
import { FinanceShell } from "./_components/finance-shell";

export default function FinanceDashboardPage() {
  return (
    <FinanceShell activeKey="dashboard">
      <FinanceDashboard />
    </FinanceShell>
  );
}

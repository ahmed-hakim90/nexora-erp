import {
  FINANCE_DASHBOARD_TEMPLATE_CONTRACT,
  FINANCE_PRINT_READINESS_CONTRACT,
  FINANCE_REPORT_DATASET_CONTRACT,
  FINANCE_REPORT_READINESS_CONTRACT,
} from "@/features/finance/public-api";
import { PageContainer, PageContent, PageHeader } from "@/shared/ui";

import { FinanceShell } from "../_components/finance-shell";

const readinessItems = [
  { key: "report", label: "Report Contract", value: FINANCE_REPORT_READINESS_CONTRACT.key },
  { key: "dataset", label: "Dataset Contract", value: FINANCE_REPORT_DATASET_CONTRACT.key },
  { key: "print", label: "Print Contract", value: FINANCE_PRINT_READINESS_CONTRACT.key },
  { key: "dashboard", label: "Dashboard Template", value: FINANCE_DASHBOARD_TEMPLATE_CONTRACT.key },
] as const;

export default function FinanceReportsReadinessPage() {
  return (
    <FinanceShell activeKey="reports">
      <PageContainer>
        <PageHeader
          description="Finance Level 1 exposes reporting readiness contracts only. Live financial statement execution starts after foundation CRUD, validation, permissions, and relations are stable."
          title="Finance Reports Readiness"
        />
        <PageContent>
          <section className="rounded-lg border bg-[hsl(var(--surface))] p-4">
            <h2 className="font-medium">Foundation reporting scope</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This page intentionally does not run ledgers, journals, tax calculation, payment execution, or financial
              statements. It confirms the Finance app has registered the platform contracts future reporting will use.
            </p>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              {readinessItems.map((item) => (
                <div className="rounded-md border p-3" key={item.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                  <dd className="mt-1 break-all text-sm">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </PageContent>
      </PageContainer>
    </FinanceShell>
  );
}

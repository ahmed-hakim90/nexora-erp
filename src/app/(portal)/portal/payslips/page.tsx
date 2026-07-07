import { resolveEmployeeRequestContext } from "@/platform/auth/server";
import { loadPortalPayslips } from "@/features/hr/routes/loaders/hr-portal.loader";
import { PageHeader } from "@/shared/ui";

import { PortalShell } from "../_components/portal-shell";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

export default async function PortalPayslipsPage() {
  const context = await resolveEmployeeRequestContext("portal");
  const payslips = await loadPortalPayslips(context);

  return (
    <PortalShell activeKey="payslips">
      <PageHeader
        description="Published payslips only — draft payslips are never visible here."
        title="My Payslips"
      />
      <ul className="mt-4 divide-y rounded-lg border">
        {payslips.map((row) => (
          <li className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" key={row.id}>
            <div>
              <p className="font-medium">{row.periodLabel}</p>
              <p className="text-muted-foreground">
                Net {formatMoney(row.netAmount, row.currency)}
                {" · "}
                Gross {formatMoney(row.grossAmount, row.currency)}
                {row.paymentDate ? ` · Payment ${row.paymentDate}` : ""}
              </p>
              <p className="text-muted-foreground">
                {row.status}
                {row.publishedAt ? ` · Published ${new Date(row.publishedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </li>
        ))}
        {payslips.length === 0 ? (
          <li className="p-4 text-muted-foreground">No published payslips yet.</li>
        ) : null}
      </ul>
    </PortalShell>
  );
}

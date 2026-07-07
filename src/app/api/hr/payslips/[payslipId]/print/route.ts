import { NextResponse } from "next/server";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { HR_PERMISSIONS } from "@/features/hr/public-api";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ payslipId: string }> },
) {
  const { payslipId } = await context.params;
  const requestContext = await resolveCompanyRequestContext("erp");
  await requirePermission({ context: requestContext, permission: HR_PERMISSIONS.payslipsView });

  const supabase = createRequestSupabaseClient({ accessToken: requestContext.accessToken });
  const { data: payslip, error } = await supabase
    .from("hr_payslips")
    .select("id, employee_id, gross_amount_metadata, deduction_amount_metadata, net_amount_metadata, currency, payroll_period_id")
    .eq("id", payslipId)
    .eq("tenant_id", requestContext.tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !payslip) {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  const [{ data: employee }, { data: lines }] = await Promise.all([
    supabase.from("hr_employees").select("full_name, employee_number").eq("id", payslip.employee_id).maybeSingle(),
    supabase
      .from("hr_payslip_lines")
      .select("component_name_snapshot, earning_or_deduction, amount_metadata, display_order")
      .eq("payslip_id", payslipId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true }),
  ]);

  const lineRows = (lines ?? [])
    .map((line) => {
      const amount = Number(line.amount_metadata ?? 0).toFixed(2);
      const label = escapeHtml(String(line.component_name_snapshot));
      const kind = String(line.earning_or_deduction);
      return `<tr><td>${label}</td><td>${kind}</td><td style="text-align:right">${amount}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Payslip ${escapeHtml(String(employee?.employee_number ?? payslipId))}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; color: #111; }
      h1 { margin-bottom: 0.25rem; }
      table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
      th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; text-align: left; }
      .summary { margin-top: 1.5rem; display: grid; gap: 0.5rem; max-width: 20rem; }
    </style>
  </head>
  <body>
    <h1>Payslip</h1>
    <p>${escapeHtml(String(employee?.full_name ?? "Employee"))} (${escapeHtml(String(employee?.employee_number ?? "—"))})</p>
    <table>
      <thead><tr><th>Component</th><th>Type</th><th>Amount</th></tr></thead>
      <tbody>${lineRows}</tbody>
    </table>
    <div class="summary">
      <div><strong>Gross:</strong> ${Number(payslip.gross_amount_metadata ?? 0).toFixed(2)} ${escapeHtml(String(payslip.currency ?? "EGP"))}</div>
      <div><strong>Deductions:</strong> ${Number(payslip.deduction_amount_metadata ?? 0).toFixed(2)} ${escapeHtml(String(payslip.currency ?? "EGP"))}</div>
      <div><strong>Net Pay:</strong> ${Number(payslip.net_amount_metadata ?? 0).toFixed(2)} ${escapeHtml(String(payslip.currency ?? "EGP"))}</div>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

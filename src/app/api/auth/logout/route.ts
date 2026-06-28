import { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "nexora_access_token",
  "nexora_refresh_token",
  "nexora_tenant_id",
  "nexora_company_id",
  "nexora_branch_id",
  "nexora_employee_id",
] as const;

function clearSessionCookies(response: NextResponse) {
  for (const cookieName of SESSION_COOKIES) {
    response.cookies.delete(cookieName);
  }
}

export function POST() {
  const response = NextResponse.json({ redirectTo: "/login" });

  clearSessionCookies(response);

  return response;
}

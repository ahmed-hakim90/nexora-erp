import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "nexora_access_token";
const TENANT_COOKIE = "nexora_tenant_id";
const COMPANY_COOKIE = "nexora_company_id";
const BRANCH_COOKIE = "nexora_branch_id";

function hasWorkspaceSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value &&
      request.cookies.get(TENANT_COOKIE)?.value &&
      request.cookies.get(COMPANY_COOKIE)?.value &&
      request.cookies.get(BRANCH_COOKIE)?.value,
  );
}

export function middleware(request: NextRequest) {
  if (hasWorkspaceSession(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/erp/:path*"],
};

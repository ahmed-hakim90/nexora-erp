import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnvironment } from "@/core/env/server";
import { createServiceRoleSupabaseClient } from "@/platform/database/server";

const ACCESS_TOKEN_COOKIE = "nexora_access_token";
const REFRESH_TOKEN_COOKIE = "nexora_refresh_token";
const TENANT_COOKIE = "nexora_tenant_id";
const COMPANY_COOKIE = "nexora_company_id";
const BRANCH_COOKIE = "nexora_branch_id";

const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

function toSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const baseSlug = slug.length >= 3 ? slug : "company";
  return `${baseSlug}-${Date.now().toString(36)}`;
}

function toCompanyCode(value: string): string {
  const code = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

  return code || "MAIN";
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");

    if (message) {
      return message;
    }
  }

  return "Unable to finish onboarding.";
}

function createJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function runOnboardingStep<T>(label: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new Error(`${label}: ${describeError(error)}`);
  }
}

function setSessionCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAge: number,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function grantTenantAdminPermissions(params: {
  serviceRole: ReturnType<typeof createServiceRoleSupabaseClient>;
  tenantId: string;
  roleId: string;
  userId: string;
}) {
  const { data: permissions, error: permissionsError } = await params.serviceRole
    .from("permissions")
    .select("id")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (permissionsError) {
    throw permissionsError;
  }

  if (!permissions?.length) {
    throw new Error("No active permissions are available.");
  }

  const { error: insertError } = await params.serviceRole
    .from("role_permissions")
    .insert(
      permissions.map((permission) => ({
        created_by: params.userId,
        permission_id: permission.id,
        role_id: params.roleId,
        tenant_id: params.tenantId,
        updated_by: params.userId,
      })),
    );

  if (insertError) {
    throw insertError;
  }
}

async function seedMasterData(params: {
  serviceRole: ReturnType<typeof createServiceRoleSupabaseClient>;
  tenantId: string;
  branchId: string;
  userId: string;
}) {
  const auditFields = {
    created_by: params.userId,
    updated_by: params.userId,
  };

  const { error: unitsError } = await params.serviceRole.from("units").insert([
    {
      ...auditFields,
      branch_id: params.branchId,
      code: "PCS",
      is_base_unit: true,
      name_ar: "قطعة",
      name_en: "Piece",
      precision_scale: 0,
      tenant_id: params.tenantId,
      unit_type: "quantity",
    },
    {
      ...auditFields,
      branch_id: params.branchId,
      code: "KG",
      is_base_unit: true,
      name_ar: "كيلوجرام",
      name_en: "Kilogram",
      precision_scale: 3,
      tenant_id: params.tenantId,
      unit_type: "weight",
    },
  ]);

  if (unitsError) {
    throw unitsError;
  }

  const { error: categoriesError } = await params.serviceRole
    .from("product_categories")
    .insert([
      {
        ...auditFields,
        branch_id: params.branchId,
        code: "GENERAL",
        name_ar: "عام",
        name_en: "General",
        tenant_id: params.tenantId,
      },
      {
        ...auditFields,
        branch_id: params.branchId,
        code: "SERVICES",
        name_ar: "خدمات",
        name_en: "Services",
        tenant_id: params.tenantId,
      },
    ]);

  if (categoriesError) {
    throw categoriesError;
  }

  const { data: warehouse, error: warehouseError } = await params.serviceRole
    .from("warehouses")
    .insert({
      ...auditFields,
      branch_id: params.branchId,
      name_ar: "المخزن الرئيسي",
      name_en: "Main Warehouse",
      tenant_id: params.tenantId,
      warehouse_code: "MAIN",
      warehouse_type: "main",
    })
    .select("id")
    .single();

  if (warehouseError || !warehouse) {
    throw warehouseError ?? new Error("Unable to seed main warehouse.");
  }

  const { error: locationError } = await params.serviceRole
    .from("warehouse_locations")
    .insert({
      ...auditFields,
      branch_id: params.branchId,
      location_code: "MAIN",
      location_type: "bin",
      name_ar: "الموقع الرئيسي",
      name_en: "Main Location",
      tenant_id: params.tenantId,
      warehouse_id: warehouse.id,
    });

  if (locationError) {
    throw locationError;
  }
}

function getFiscalYearBounds() {
  const year = new Date().getUTCFullYear();

  return {
    endsOn: `${year}-12-31`,
    key: `fy-${year}`,
    name: `Fiscal Year ${year}`,
    startsOn: `${year}-01-01`,
    year,
  };
}

function getMonthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

async function seedFinanceFoundation(params: {
  serviceRole: ReturnType<typeof createServiceRoleSupabaseClient>;
  tenantId: string;
  companyId: string;
  userId: string;
}) {
  const auditFields = {
    created_by: params.userId,
    updated_by: params.userId,
  };
  const companyScope = {
    company_id: params.companyId,
    tenant_id: params.tenantId,
  };

  const { error: currencyError } = await params.serviceRole
    .from("finance_currencies")
    .insert({
      ...auditFields,
      ...companyScope,
      currency_code: "EGP",
      is_base_currency: true,
      name: "Egyptian Pound",
      precision: 2,
      status: "active",
      symbol: "EGP",
    });

  if (currencyError) {
    throw currencyError;
  }

  const { data: accountTypes, error: accountTypesError } = await params.serviceRole
    .from("finance_account_types")
    .insert([
      { ...auditFields, ...companyScope, account_class: "asset", account_type_key: "asset", name: "Assets", normal_balance: "debit" },
      { ...auditFields, ...companyScope, account_class: "liability", account_type_key: "liability", name: "Liabilities", normal_balance: "credit" },
      { ...auditFields, ...companyScope, account_class: "equity", account_type_key: "equity", name: "Equity", normal_balance: "credit" },
      { ...auditFields, ...companyScope, account_class: "revenue", account_type_key: "revenue", name: "Revenue", normal_balance: "credit" },
      { ...auditFields, ...companyScope, account_class: "expense", account_type_key: "expense", name: "Expenses", normal_balance: "debit" },
    ])
    .select("id, account_type_key");

  if (accountTypesError || !accountTypes) {
    throw accountTypesError ?? new Error("Unable to seed finance account types.");
  }

  const accountTypeByKey = new Map(
    accountTypes.map((accountType) => [accountType.account_type_key as string, accountType.id as string]),
  );
  const accountSeeds = [
    { account_code: "1000", account_type: "asset", name: "Cash and Bank" },
    { account_code: "1100", account_type: "asset", name: "Accounts Receivable" },
    { account_code: "1200", account_type: "asset", name: "Inventory" },
    { account_code: "2000", account_type: "liability", name: "Accounts Payable" },
    { account_code: "3000", account_type: "equity", name: "Owner Equity" },
    { account_code: "4000", account_type: "revenue", name: "Sales Revenue" },
    { account_code: "5000", account_type: "expense", name: "Cost of Goods Sold" },
    { account_code: "6000", account_type: "expense", name: "Operating Expenses" },
  ];
  const { error: accountsError } = await params.serviceRole
    .from("finance_accounts")
    .insert(
      accountSeeds.map((account) => ({
        ...auditFields,
        ...companyScope,
        account_code: account.account_code,
        account_type_id: accountTypeByKey.get(account.account_type),
        currency_code: "EGP",
        name: account.name,
      })),
    );

  if (accountsError) {
    throw accountsError;
  }

  const fiscalYear = getFiscalYearBounds();
  const { data: fiscalYearRecord, error: fiscalYearError } = await params.serviceRole
    .from("finance_fiscal_years")
    .insert({
      ...auditFields,
      ...companyScope,
      ends_on: fiscalYear.endsOn,
      fiscal_year_key: fiscalYear.key,
      name: fiscalYear.name,
      starts_on: fiscalYear.startsOn,
      status: "active",
    })
    .select("id")
    .single();

  if (fiscalYearError || !fiscalYearRecord) {
    throw fiscalYearError ?? new Error("Unable to seed fiscal year.");
  }

  const { error: periodsError } = await params.serviceRole
    .from("finance_fiscal_periods")
    .insert(
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthKey = String(month).padStart(2, "0");

        return {
          ...auditFields,
          ...companyScope,
          ends_on: getMonthEnd(fiscalYear.year, month),
          fiscal_period_key: `${fiscalYear.year}-${monthKey}`,
          fiscal_year_id: fiscalYearRecord.id,
          name: `${fiscalYear.year}-${monthKey}`,
          period_kind: "regular",
          starts_on: `${fiscalYear.year}-${monthKey}-01`,
          status: "active",
        };
      }),
    );

  if (periodsError) {
    throw periodsError;
  }

  const { error: journalError } = await params.serviceRole.from("finance_journals").insert({
    ...auditFields,
    ...companyScope,
    default_currency_code: "EGP",
    journal_key: "general",
    journal_kind: "general",
    name: "General Journal",
    requires_approval: true,
  });

  if (journalError) {
    throw journalError;
  }

  const { error: termsError } = await params.serviceRole.from("finance_payment_terms").insert({
    ...auditFields,
    ...companyScope,
    due_days: 0,
    name: "Due on Receipt",
    status: "active",
    terms_key: "due-on-receipt",
  });

  if (termsError) {
    throw termsError;
  }
}

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return createJsonError("Please provide a valid email, password, name, and company.");
  }

  const env = getServerEnvironment();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return createJsonError("Supabase public environment values are not configured.", 500);
  }

  const serviceRole = createServiceRoleSupabaseClient();
  const publicSupabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { companyName, displayName, email, password } = parsed.data;

  const { data: createdUser, error: createUserError } =
    await serviceRole.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { display_name: displayName },
    });

  if (createUserError || !createdUser.user) {
    return createJsonError(createUserError?.message ?? "Unable to create user.");
  }

  const userId = createdUser.user.id;
  const tenantSlug = toSlug(companyName);
  const companyCode = toCompanyCode(companyName);

  try {
    await runOnboardingStep("Create profile", async () => {
      const { error } = await serviceRole.from("profiles").upsert({
        display_name: displayName,
        email,
        id: userId,
        updated_by: userId,
      });

      if (error) {
        throw error;
      }
    });

    const tenant = await runOnboardingStep("Create tenant", async () => {
      const { data, error } = await serviceRole
        .from("tenants")
        .insert({
          created_by: userId,
          name: companyName,
          slug: tenantSlug,
          updated_by: userId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create tenant.");
      }

      return data;
    });

    const company = await runOnboardingStep("Create company", async () => {
      const { data, error } = await serviceRole
        .from("companies")
        .insert({
          code: companyCode,
          created_by: userId,
          name: companyName,
          tenant_id: tenant.id,
          updated_by: userId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create company.");
      }

      return data;
    });

    const branch = await runOnboardingStep("Create branch", async () => {
      const { data, error } = await serviceRole
        .from("branches")
        .insert({
          code: "MAIN",
          created_by: userId,
          name: "Main Branch",
          tenant_id: tenant.id,
          updated_by: userId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create branch.");
      }

      return data;
    });

    await runOnboardingStep("Create tenant membership", async () => {
      const { error } = await serviceRole
        .from("tenant_memberships")
        .insert({
          created_by: userId,
          joined_at: new Date().toISOString(),
          status: "active",
          tenant_id: tenant.id,
          updated_by: userId,
          user_id: userId,
        });

      if (error) {
        throw error;
      }
    });

    const role = await runOnboardingStep("Create tenant admin role", async () => {
      const { data, error } = await serviceRole
        .from("roles")
        .insert({
          created_by: userId,
          description: "Tenant administrator created during first company onboarding.",
          is_system: false,
          name: "Tenant Administrator",
          role_key: "tenant-admin",
          role_scope: "tenant",
          tenant_id: tenant.id,
          updated_by: userId,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw error ?? new Error("Unable to create tenant admin role.");
      }

      return data;
    });

    await runOnboardingStep("Grant tenant admin permissions", () =>
      grantTenantAdminPermissions({
        roleId: role.id,
        serviceRole,
        tenantId: tenant.id,
        userId,
      }),
    );

    await runOnboardingStep("Assign tenant admin role", async () => {
      const { error } = await serviceRole.from("user_roles").insert({
        assignment_reason: "First company onboarding owner.",
        created_by: userId,
        role_id: role.id,
        tenant_id: tenant.id,
        updated_by: userId,
        user_id: userId,
      });

      if (error) {
        throw error;
      }
    });

    await runOnboardingStep("Seed master data", () =>
      seedMasterData({
        branchId: branch.id,
        serviceRole,
        tenantId: tenant.id,
        userId,
      }),
    );

    await runOnboardingStep("Seed finance foundation", () =>
      seedFinanceFoundation({
        companyId: company.id,
        serviceRole,
        tenantId: tenant.id,
        userId,
      }),
    );

    const { data: sessionData, error: signInError } =
      await publicSupabase.auth.signInWithPassword({ email, password });

    if (signInError || !sessionData.session) {
      throw signInError ?? new Error("Unable to start session.");
    }

    const response = NextResponse.json({
      branchId: branch.id,
      companyId: company.id,
      redirectTo: "/erp",
      tenantId: tenant.id,
    });

    setSessionCookie(response, ACCESS_TOKEN_COOKIE, sessionData.session.access_token, 60 * 60);
    setSessionCookie(
      response,
      REFRESH_TOKEN_COOKIE,
      sessionData.session.refresh_token,
      60 * 60 * 24 * 30,
    );
    setSessionCookie(response, TENANT_COOKIE, tenant.id, 60 * 60 * 24 * 30);
    setSessionCookie(response, COMPANY_COOKIE, company.id, 60 * 60 * 24 * 30);
    setSessionCookie(response, BRANCH_COOKIE, branch.id, 60 * 60 * 24 * 30);

    return response;
  } catch (error) {
    console.error("First company onboarding failed", error);
    await serviceRole.auth.admin.deleteUser(userId).catch(() => undefined);
    return createJsonError(describeError(error), 500);
  }
}

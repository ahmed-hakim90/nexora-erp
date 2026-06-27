export type TenantScope = Readonly<{
  tenantId: string;
  companyId?: string;
  branchId?: string;
  employeeId?: string;
}>;

export type TenantMembershipStatus = "active" | "invited" | "suspended";

export type TenantIdentifier = string & {
  readonly __brand: "TenantIdentifier";
};

export type CompanyIdentifier = string & {
  readonly __brand: "CompanyIdentifier";
};

export type BranchIdentifier = string & {
  readonly __brand: "BranchIdentifier";
};

export type EmployeeIdentifier = string & {
  readonly __brand: "EmployeeIdentifier";
};

export type CurrentTenant = Readonly<{
  tenantId: string;
}>;

export type CurrentCompany = CurrentTenant &
  Readonly<{
    companyId: string;
  }>;

export type CurrentBranch = CurrentCompany &
  Readonly<{
    branchId: string;
  }>;

export type CurrentEmployee = CurrentTenant &
  Readonly<{
    employeeId: string;
  }>;

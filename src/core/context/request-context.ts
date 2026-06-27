import type { CorrelationId } from "./correlation-id";

export type AccessExperience =
  | "erp"
  | "portal"
  | "employee-portal"
  | "customer-portal"
  | "supplier-portal"
  | "driver-app"
  | "technician-app"
  | "admin"
  | "marketplace"
  | "connector"
  | "api"
  | "automation"
  | "ai"
  | "sandbox"
  | "system";

export type ActorType =
  | "user"
  | "employee"
  | "customer"
  | "supplier"
  | "driver"
  | "technician"
  | "service"
  | "service-account"
  | "integration"
  | "automation"
  | "ai-agent";

export type RuntimeSource =
  | "web"
  | "api"
  | "server-action"
  | "background-job"
  | "workflow"
  | "approval"
  | "audit"
  | "ai-action"
  | "system";

export type ActorContext = Readonly<{
  actorType: ActorType;
  userId?: string;
  serviceKey?: string;
  integrationKey?: string;
  automationKey?: string;
  aiActionKey?: string;
}>;

export type RequestContext = Readonly<{
  actorType: ActorType;
  experience: AccessExperience;
  correlationId: CorrelationId;
  source: RuntimeSource;
  userId?: string;
  tenantId?: string;
  companyId?: string;
  branchId?: string;
  employeeId?: string;
  serviceKey?: string;
  integrationKey?: string;
  automationKey?: string;
  aiActionKey?: string;
  locale: "ar" | "en";
  direction: "rtl" | "ltr";
  timezone: string;
}>;

export type TenantContext = RequestContext &
  Readonly<{
    tenantId: string;
  }>;

export type CompanyContext = TenantContext &
  Readonly<{
    companyId: string;
  }>;

export type BranchContext = CompanyContext &
  Readonly<{
    branchId: string;
  }>;

export type EmployeeContext = TenantContext &
  Readonly<{
    employeeId: string;
  }>;

export const DEFAULT_REQUEST_LOCALE = "en";
export const DEFAULT_REQUEST_DIRECTION = "ltr";
export const DEFAULT_REQUEST_TIMEZONE = "UTC";
export const DEFAULT_RUNTIME_SOURCE = "web";

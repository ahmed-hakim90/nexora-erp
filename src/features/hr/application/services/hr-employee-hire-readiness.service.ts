import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_ONBOARDING_CHECKLIST_ITEMS } from "../../template-lifecycle-foundation";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";
import { HrEmployeeCompensationService } from "./hr-employee-compensation.service";
import { HrEmployeeDocumentComplianceService } from "./hr-employee-document-compliance.service";
import { isEmployeeDocumentComplianceIncomplete } from "../utils/hr-document-compliance.evaluate";

export type HrHireReadinessItemKey =
  | "employment_profile"
  | "department"
  | "position"
  | "manager"
  | "work_location"
  | "contract"
  | "compensation"
  | "payroll_group"
  | "bank_account"
  | "shift"
  | "documents"
  | "policies"
  | "custody"
  | "training"
  | "medical_exam"
  | "id_badge"
  | "supervisor_intro";

export type HrHireReadinessItem = Readonly<{
  complete: boolean;
  href: string | null;
  key: HrHireReadinessItemKey;
  mandatory: boolean;
  phase: "wizard" | "profile";
  titleKey: string;
}>;

export type HrEmployeeHireReadiness = Readonly<{
  completionPercent: number;
  items: readonly HrHireReadinessItem[];
  lifecycleState: string | null;
  mandatoryComplete: boolean;
  mandatoryPendingCount: number;
}>;

const PROFILE_POST_HIRE_KEYS = new Set<HrHireReadinessItemKey>([
  "custody",
  "documents",
  "id_badge",
  "medical_exam",
  "policies",
  "supervisor_intro",
  "training",
]);

function itemHref(employeeId: string, key: HrHireReadinessItemKey): string | null {
  const base = `/erp/hr/employees/${employeeId}`;
  switch (key) {
    case "employment_profile":
    case "department":
    case "position":
    case "manager":
    case "work_location":
      return `${base}?tab=employment`;
    case "contract":
      return `/erp/hr/contracts?employeeId=${employeeId}`;
    case "compensation":
      return `/erp/hr/compensation?employeeId=${employeeId}`;
    case "payroll_group":
      return `/erp/hr/assignments?employeeId=${employeeId}`;
    case "bank_account":
      return `/erp/hr/bank-accounts?employeeId=${employeeId}`;
    case "shift":
      return `/erp/hr/shifts?employeeId=${employeeId}`;
    case "documents":
      return `${base}?tab=documents`;
    case "custody":
      return `${base}?tab=custody`;
    case "training":
      return `/erp/hr/training?employeeId=${employeeId}`;
    case "policies":
      return `/erp/hr/settings?tab=policies`;
    case "medical_exam":
    case "id_badge":
    case "supervisor_intro":
      return `/erp/hr/onboarding?employeeId=${employeeId}`;
    default:
      return null;
  }
}

export class HrEmployeeHireReadinessService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async evaluateEmployee(employeeId: string): Promise<HrEmployeeHireReadiness> {
    const [
      assignment,
      compensation,
      contractsResult,
      bankResult,
      shiftScheduleResult,
      lifecycleResult,
      documentCompliance,
      profileResult,
    ] = await Promise.all([
      new HrAssignmentResolverService(this.supabase, this.context).resolveEmployeeAssignments(employeeId),
      new HrEmployeeCompensationService(this.supabase, this.context).resolveEmployeeCompensation(employeeId),
      this.supabase
        .from("hr_contracts")
        .select("id, status")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1),
      this.supabase
        .from("hr_employee_bank_accounts")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("is_primary", true)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1),
      this.supabase
        .from("hr_shift_schedules")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1),
      this.supabase
        .from("hr_employee_lifecycle_states")
        .select("lifecycle_state")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
      new HrEmployeeDocumentComplianceService(this.supabase, this.context).evaluateEmployee(employeeId).catch(() => null),
      this.supabase
        .from("hr_employment_profiles")
        .select("work_location_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    const hasActiveContract = (contractsResult.data ?? []).length > 0;
    const hasPrimaryBank = (bankResult.data ?? []).length > 0;
    const hasShift = Boolean(assignment.shift) || (shiftScheduleResult.data ?? []).length > 0;
    const documentsComplete = documentCompliance ? !isEmployeeDocumentComplianceIncomplete(documentCompliance) : false;
    const medicalItem = documentCompliance?.items.find((item) => item.kind === "medical");
    const medicalExamComplete =
      medicalItem?.status === "present" || medicalItem?.status === "expiring_soon" || medicalItem?.status === "waived";

    const signals: Record<HrHireReadinessItemKey, boolean> = {
      bank_account: hasPrimaryBank,
      compensation: !compensation.missingCompensation,
      contract: hasActiveContract,
      custody: false,
      department: Boolean(assignment.department),
      documents: documentsComplete,
      employment_profile: true,
      id_badge: false,
      manager: Boolean(assignment.manager),
      medical_exam: Boolean(medicalExamComplete),
      payroll_group: Boolean(assignment.payrollGroup),
      policies: false,
      position: Boolean(assignment.position),
      shift: hasShift,
      supervisor_intro: false,
      training: false,
      work_location: Boolean(assignment.workLocation) || Boolean(profileResult.data?.work_location_id),
    };

    const checklistTitles: Record<string, HrHireReadinessItemKey> = {
      "Assign custody": "custody",
      "Assign manager": "manager",
      "Assign payroll group": "payroll_group",
      "Assign policies": "policies",
      "Assign required training": "training",
      "Assign salary package": "compensation",
      "Assign shift schedule": "shift",
      "Assign work location": "work_location",
      "Collect required documents": "documents",
      "Create employment profile": "employment_profile",
      "Generate contract": "contract",
      "Introduce supervisor": "supervisor_intro",
      "Issue ID badge": "id_badge",
      "Medical examination": "medical_exam",
    };

    const mandatoryByKey = new Map<HrHireReadinessItemKey, boolean>();
    for (const item of HR_ONBOARDING_CHECKLIST_ITEMS) {
      const key = checklistTitles[item.title];
      if (key) mandatoryByKey.set(key, item.mandatory);
    }

    const orderedKeys: HrHireReadinessItemKey[] = [
      "employment_profile",
      "department",
      "position",
      "manager",
      "work_location",
      "contract",
      "compensation",
      "payroll_group",
      "bank_account",
      "shift",
      "documents",
      "policies",
      "custody",
      "training",
      "medical_exam",
      "id_badge",
      "supervisor_intro",
    ];

    const items: HrHireReadinessItem[] = orderedKeys.map((key) => ({
      complete: signals[key],
      href: itemHref(employeeId, key),
      key,
      mandatory: mandatoryByKey.get(key) ?? PROFILE_POST_HIRE_KEYS.has(key),
      phase: PROFILE_POST_HIRE_KEYS.has(key) ? "profile" : "wizard",
      titleKey: `hr.employees.hireReadiness.item.${key}`,
    }));

    const mandatoryItems = items.filter((item) => item.mandatory);
    const mandatoryCompleteCount = mandatoryItems.filter((item) => item.complete).length;
    const completionPercent =
      mandatoryItems.length === 0 ? 100 : Math.round((mandatoryCompleteCount / mandatoryItems.length) * 100);

    return {
      completionPercent,
      items,
      lifecycleState: lifecycleResult.data?.lifecycle_state ? String(lifecycleResult.data.lifecycle_state) : null,
      mandatoryComplete: mandatoryCompleteCount === mandatoryItems.length,
      mandatoryPendingCount: mandatoryItems.length - mandatoryCompleteCount,
    };
  }
}

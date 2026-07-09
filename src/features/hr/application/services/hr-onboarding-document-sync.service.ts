import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_ONBOARDING_CHECKLIST_ITEMS } from "../../template-lifecycle-foundation";
import { isEmployeeDocumentComplianceIncomplete } from "../utils/hr-document-compliance.evaluate";
import { HrEmployeeDocumentComplianceService } from "./hr-employee-document-compliance.service";
import { HrTalentRuntimeService } from "./hr-talent-runtime.service";

const COLLECT_REQUIRED_DOCUMENTS_TITLE = "Collect required documents";
const MEDICAL_EXAMINATION_TITLE = "Medical examination";

function isMedicalKindComplete(status: string | undefined): boolean {
  return status === "present" || status === "expiring_soon" || status === "waived";
}

export class HrOnboardingDocumentSyncService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async syncAfterDocumentChange(employeeId: string): Promise<void> {
    const onboardingTitles = new Set(
      HR_ONBOARDING_CHECKLIST_ITEMS.filter((item) => item.completionRule === "document_uploaded").map((item) => item.title),
    );
    if (onboardingTitles.size === 0) return;

    const { data: program, error: programError } = await this.supabase
      .from("hr_talent_programs")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("employee_id", employeeId)
      .eq("program_type", "onboarding")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (programError || !program) return;

    const { data: pendingItems, error: itemsError } = await this.supabase
      .from("hr_talent_program_items")
      .select("id, title, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("program_id", program.id)
      .eq("status", "pending")
      .is("deleted_at", null);
    if (itemsError || !pendingItems?.length) return;

    const compliance = await new HrEmployeeDocumentComplianceService(this.supabase, this.context).evaluateEmployee(employeeId);
    const documentsComplete = !isEmployeeDocumentComplianceIncomplete(compliance);
    const medicalItem = compliance.items.find((item) => item.kind === "medical");
    const medicalComplete = isMedicalKindComplete(medicalItem?.status);

    const talentService = new HrTalentRuntimeService(this.supabase, this.context);
    for (const item of pendingItems) {
      const title = String(item.title);
      if (title === COLLECT_REQUIRED_DOCUMENTS_TITLE && documentsComplete) {
        await talentService.completeTalentProgramItem(String(item.id));
      }
      if (title === MEDICAL_EXAMINATION_TITLE && medicalComplete) {
        await talentService.completeTalentProgramItem(String(item.id));
      }
    }
  }
}

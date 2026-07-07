import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

export type HrTalentProgramType = "onboarding" | "training" | "performance" | "succession";

export class HrTalentRuntimeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async createVacancy(input: {
    positionId: string;
    jobId: string;
    departmentId: string;
    vacancyReason: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_workforce_vacancies")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        department_id: input.departmentId,
        job_id: input.jobId,
        metadata: { recruitment_runtime_implemented: true },
        position_id: input.positionId,
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        vacancy_reason: input.vacancyReason,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create vacancy.", cause: error });
    return { id: String(data.id) };
  }

  async createHiringRequest(input: {
    positionId: string;
    requiredDate: string;
    justification: string;
    vacancyId?: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_hiring_requests")
      .insert({
        approval_status: "submitted",
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        justification: input.justification,
        metadata: { candidate_processing_implemented: true },
        priority: "normal",
        requested_position_id: input.positionId,
        required_date: input.requiredDate,
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        vacancy_id: input.vacancyId ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create hiring request.", cause: error });
    return { id: String(data.id) };
  }

  async createTalentProgram(input: {
    programType: HrTalentProgramType;
    code: string;
    title: string;
    employeeId?: string;
    description?: string;
    startsOn?: string;
    endsOn?: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_talent_programs")
      .insert({
        branch_id: this.context.branchId,
        code: input.code.toUpperCase(),
        company_id: this.context.companyId,
        created_by: this.context.userId,
        description: input.description ?? null,
        employee_id: input.employeeId ?? null,
        ends_on: input.endsOn ?? null,
        metadata: { runtime_implemented: true },
        program_type: input.programType,
        starts_on: input.startsOn ?? null,
        status: "active",
        tenant_id: this.context.tenantId,
        title: input.title,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create talent program.", cause: error });
    return { id: String(data.id) };
  }

  async addTalentProgramItem(input: {
    programId: string;
    itemKey: string;
    title: string;
    dueDate?: string;
  }) {
    const { data, error } = await this.supabase
      .from("hr_talent_program_items")
      .insert({
        company_id: this.context.companyId,
        created_by: this.context.userId,
        due_date: input.dueDate ?? null,
        item_key: input.itemKey.toUpperCase(),
        program_id: input.programId,
        status: "pending",
        tenant_id: this.context.tenantId,
        title: input.title,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not add program item.", cause: error });
    return { id: String(data.id) };
  }

  async completeTalentProgramItem(itemId: string) {
    const { error } = await this.supabase
      .from("hr_talent_program_items")
      .update({ status: "completed", updated_by: this.context.userId })
      .eq("id", itemId)
      .eq("tenant_id", this.context.tenantId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not complete program item.", cause: error });
  }
}

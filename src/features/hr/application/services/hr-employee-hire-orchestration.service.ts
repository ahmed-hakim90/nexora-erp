import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { hasServerPermission } from "@/platform/permissions/server";

import { HR_ONBOARDING_CHECKLIST_ITEMS } from "../../template-lifecycle-foundation";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import type { HrEmployeeWizardInput } from "../schemas/hr-employees.schema";
import { hrAssignmentCreateSchema } from "../schemas/hr-assignments.schema";
import { HrAssignmentConflictService } from "./hr-assignment-conflicts.service";
import { HrContractTypeService } from "./hr-contract-type.service";
import { HrEmployeeCompensationService } from "./hr-employee-compensation.service";
import { HrShiftRuntimeService } from "./hr-shift-runtime.service";
import { HrTalentRuntimeService } from "./hr-talent-runtime.service";

export type HrEmployeeHireOrchestrationResult = Readonly<{
  employeeId: string;
  employmentProfileId: string;
  onboardingProgramId: string | null;
  skippedSteps: readonly string[];
}>;

type AssignmentSeed = Readonly<{
  assignment_scope: string;
  assignment_type: string;
  priority: number;
  reference_entity_id: string;
  reference_entity_type: string;
}>;

function onboardingItemKey(index: number): string {
  return `ONBOARDING_${String(index + 1).padStart(2, "0")}`;
}

export class HrEmployeeHireOrchestrationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async completeHireSetup(input: {
    employeeId: string;
    employmentProfileId: string;
    parsed: HrEmployeeWizardInput;
  }): Promise<HrEmployeeHireOrchestrationResult> {
    const skippedSteps: string[] = [];

    await this.createInitialAssignments({
      departmentId: input.parsed.departmentId,
      effectiveFrom: input.parsed.effectiveFrom,
      employeeId: input.employeeId,
      employmentProfileId: input.employmentProfileId,
      managerEmployeeId: input.parsed.managerEmployeeId,
      payrollGroupId: input.parsed.payrollGroupId,
      positionId: input.parsed.positionId,
      skippedSteps,
    });

    if (input.parsed.contractTypeVersionId && input.parsed.contractStartsOn) {
      const canManageContracts = await hasServerPermission({
        context: this.context,
        permission: HR_PERMISSIONS.contractsManage,
      });
      if (canManageContracts) {
        const contractNumber = input.parsed.contractNumber?.trim().toUpperCase() || `CON-${input.parsed.employeeNumber}`;
        const contractService = new HrContractTypeService(this.supabase, this.context);
        await contractService.createContract(
          {
            contractNumber,
            contractTypeVersionId: input.parsed.contractTypeVersionId,
            employeeId: input.employeeId,
            startsOn: input.parsed.contractStartsOn,
          },
          input.employmentProfileId,
          {
            branchId: input.parsed.branchId ?? this.context.branchId,
            metadata: { created_via: "hr-employee-wizard" },
            probationPeriodDays: input.parsed.probationPeriodDays ?? null,
            status: "active",
          },
        );
      } else {
        skippedSteps.push("contract");
      }
    }

    if (input.parsed.salaryPackageVersionId) {
      const canManageCompensation = await hasServerPermission({
        context: this.context,
        permission: HR_PERMISSIONS.compensationManage,
      });
      if (canManageCompensation) {
        const compensationService = new HrEmployeeCompensationService(this.supabase, this.context);
        await compensationService.assertNoBasicSalaryConflictForPackageAssignment(
          input.employeeId,
          input.parsed.salaryPackageVersionId,
        );
        const { error } = await this.supabase
          .from("hr_employment_profiles")
          .update({
            salary_package_ref: input.parsed.salaryPackageVersionId,
            updated_by: this.context.userId,
          })
          .eq("id", input.employmentProfileId)
          .eq("tenant_id", this.context.tenantId);
        if (error) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not assign salary package.", cause: error });
        }
      } else {
        skippedSteps.push("compensation");
      }
    }

    if (input.parsed.bankName?.trim() && input.parsed.accountHolderName?.trim() && input.parsed.accountNumber?.trim()) {
      const canManageBank = await hasServerPermission({
        context: this.context,
        permission: HR_PERMISSIONS.compensationManage,
      });
      if (canManageBank) {
        const isPrimary = input.parsed.bankIsPrimary !== false;
        if (isPrimary) {
          await this.supabase
            .from("hr_employee_bank_accounts")
            .update({ is_primary: false, updated_by: this.context.userId })
            .eq("tenant_id", this.context.tenantId)
            .eq("employee_id", input.employeeId)
            .eq("is_primary", true)
            .is("deleted_at", null);
        }
        const { error } = await this.supabase.from("hr_employee_bank_accounts").insert({
          account_holder_name: input.parsed.accountHolderName.trim(),
          account_number: input.parsed.accountNumber.trim(),
          account_type: "current",
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          created_by: this.context.userId,
          currency_code: "SAR",
          effective_from: input.parsed.effectiveFrom,
          employee_id: input.employeeId,
          iban: input.parsed.iban?.trim() || null,
          is_primary: isPrimary,
          bank_name: input.parsed.bankName.trim(),
          status: "active",
          tenant_id: this.context.tenantId,
          updated_by: this.context.userId,
        });
        if (error) {
          throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save bank account.", cause: error });
        }
      } else {
        skippedSteps.push("bank_account");
      }
    }

    if (input.parsed.shiftId) {
      const canManageShifts = await hasServerPermission({
        context: this.context,
        permission: HR_PERMISSIONS.shiftsManage,
      });
      if (canManageShifts) {
        const shiftService = new HrShiftRuntimeService(this.supabase, this.context);
        const { scheduleId } = await shiftService.assignShiftWorkingWeekPattern({
          applyWorkingDays: input.parsed.shiftApplyWorkingDays,
          dayOfWeek: input.parsed.shiftDayOfWeek,
          effectiveFrom: input.parsed.effectiveFrom,
          employeeId: input.employeeId,
          employmentProfileId: input.employmentProfileId,
          shiftId: input.parsed.shiftId,
        });

        const canManageAssignments = await hasServerPermission({
          context: this.context,
          permission: HR_PERMISSIONS.assignmentsManage,
        });
        if (canManageAssignments) {
          await this.insertAssignmentRow({
            assignment_scope: "primary",
            assignment_type: "shift_schedule",
            effectiveFrom: input.parsed.effectiveFrom,
            employeeId: input.employeeId,
            employmentProfileId: input.employmentProfileId,
            priority: 100,
            reference_entity_id: scheduleId,
            reference_entity_type: "hr_shift_schedules",
          });
        }
      } else {
        skippedSteps.push("shift");
      }
    }

    const onboardingProgramId = await this.seedOnboardingProgram({
      employeeId: input.employeeId,
      parsed: input.parsed,
      skippedSteps,
    });

    await this.supabase.from("hr_employee_lifecycle_states").insert({
      branch_id: input.parsed.branchId ?? this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      effective_from: input.parsed.effectiveFrom,
      employee_id: input.employeeId,
      lifecycle_state: "onboarding",
      metadata: { created_via: "hr-employee-wizard", skipped_steps: skippedSteps },
      source_document_type: "hr_employee_wizard",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    await this.supabase.from("hr_employee_timeline_events").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: input.employeeId,
      event_type: "hired",
      metadata: { skipped_steps: skippedSteps, source: "hr-employee-wizard" },
      source_document_type: "hr_employee_wizard",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });

    return {
      employeeId: input.employeeId,
      employmentProfileId: input.employmentProfileId,
      onboardingProgramId,
      skippedSteps,
    };
  }

  private async createInitialAssignments(input: {
    departmentId: string;
    effectiveFrom: string;
    employeeId: string;
    employmentProfileId: string;
    managerEmployeeId?: string;
    payrollGroupId?: string;
    positionId?: string;
    skippedSteps: string[];
  }) {
    const base = {
      assignment_status: "active" as const,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      effective_from: input.effectiveFrom,
      employee_id: input.employeeId,
      employment_profile_id: input.employmentProfileId,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    };

    const seeds: AssignmentSeed[] = [
      {
        assignment_scope: "primary",
        assignment_type: "department",
        priority: 100,
        reference_entity_id: input.departmentId,
        reference_entity_type: "hr_org_units",
      },
    ];

    if (input.positionId) {
      seeds.push({
        assignment_scope: "primary",
        assignment_type: "position",
        priority: 100,
        reference_entity_id: input.positionId,
        reference_entity_type: "hr_positions",
      });
    }

    if (input.managerEmployeeId) {
      seeds.push({
        assignment_scope: "primary",
        assignment_type: "manager",
        priority: 100,
        reference_entity_id: input.managerEmployeeId,
        reference_entity_type: "hr_employees",
      });
    }

    if (input.payrollGroupId) {
      const canManageAssignments = await hasServerPermission({
        context: this.context,
        permission: HR_PERMISSIONS.assignmentsManage,
      });
      if (canManageAssignments) {
        seeds.push({
          assignment_scope: "primary",
          assignment_type: "payroll_group",
          priority: 100,
          reference_entity_id: input.payrollGroupId,
          reference_entity_type: "hr_payroll_groups",
        });
      } else {
        input.skippedSteps.push("payroll_group");
      }
    }

    const conflictService = new HrAssignmentConflictService(this.supabase, this.context);
    for (const seed of seeds) {
      const assignmentInput = hrAssignmentCreateSchema.parse({
        assignmentScope: seed.assignment_scope,
        assignmentType: seed.assignment_type,
        effectiveFrom: input.effectiveFrom,
        employeeId: input.employeeId,
        employmentProfileId: input.employmentProfileId,
        priority: seed.priority,
        referenceEntityId: seed.reference_entity_id,
        referenceEntityType: seed.reference_entity_type,
      });
      const conflicts = await conflictService.detectConflicts(assignmentInput);
      const blocking = conflicts.find((conflict) => conflict.severity === "error");
      if (blocking) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: blocking.message });
      }
    }

    const { error } = await this.supabase.from("hr_assignments").insert(
      seeds.map((seed) => ({
        ...base,
        assignment_scope: seed.assignment_scope,
        assignment_type: seed.assignment_type,
        priority: seed.priority,
        reference_entity_id: seed.reference_entity_id,
        reference_entity_type: seed.reference_entity_type,
      })),
    );
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create initial assignments.", cause: error });
    }
  }

  private async insertAssignmentRow(input: {
    assignment_scope: string;
    assignment_type: string;
    effectiveFrom: string;
    employeeId: string;
    employmentProfileId: string;
    priority: number;
    reference_entity_id: string;
    reference_entity_type: string;
  }) {
    const { error } = await this.supabase.from("hr_assignments").insert({
      assignment_scope: input.assignment_scope,
      assignment_status: "active",
      assignment_type: input.assignment_type,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      effective_from: input.effectiveFrom,
      employee_id: input.employeeId,
      employment_profile_id: input.employmentProfileId,
      priority: input.priority,
      reference_entity_id: input.reference_entity_id,
      reference_entity_type: input.reference_entity_type,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create assignment.", cause: error });
    }
  }

  private async seedOnboardingProgram(input: {
    employeeId: string;
    parsed: HrEmployeeWizardInput;
    skippedSteps: string[];
  }): Promise<string | null> {
    const talentService = new HrTalentRuntimeService(this.supabase, this.context);
    const program = await talentService.createTalentProgram({
      code: `ONB-${input.parsed.employeeNumber}`,
      description: "Auto-seeded from employee hire wizard.",
      employeeId: input.employeeId,
      programType: "onboarding",
      startsOn: input.parsed.effectiveFrom,
      title: `Onboarding — ${input.parsed.fullName}`,
    });

    const completionByTitle: Record<string, boolean> = {
      "Assign manager": Boolean(input.parsed.managerEmployeeId),
      "Assign payroll group": Boolean(input.parsed.payrollGroupId && !input.skippedSteps.includes("payroll_group")),
      "Assign salary package": Boolean(input.parsed.salaryPackageVersionId && !input.skippedSteps.includes("compensation")),
      "Assign shift schedule": Boolean(input.parsed.shiftId && !input.skippedSteps.includes("shift")),
      "Assign work location": Boolean(input.parsed.workLocationId),
      "Create employment profile": true,
      "Generate contract": Boolean(input.parsed.contractTypeVersionId && input.parsed.contractStartsOn && !input.skippedSteps.includes("contract")),
    };

    for (const [index, item] of HR_ONBOARDING_CHECKLIST_ITEMS.entries()) {
      const created = await talentService.addTalentProgramItem({
        itemKey: onboardingItemKey(index),
        programId: program.id,
        title: item.title,
      });
      if (completionByTitle[item.title]) {
        await talentService.completeTalentProgramItem(created.id);
      }
    }

    return program.id;
  }
}

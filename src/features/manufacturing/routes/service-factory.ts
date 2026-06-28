import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { OutboxService } from "@/platform/integration/server";

import {
  ManufacturingBomService,
  ManufacturingFoundationService,
  ManufacturingLineAssignmentService,
  ManufacturingProfileService,
  ManufacturingRoutingService,
  ProductionStandardService,
  ProductionLineService,
  SupervisorAssignmentService,
  WorkCenterService,
} from "../application/services/manufacturing-foundation.service";
import type { ManufacturingResourceKey } from "../application/types";
import { MANUFACTURING_PERMISSIONS } from "../permissions/permission-registry";
import { getManufacturingResourceDefinition } from "../presentation/view-models/page-config";
import { SupabaseManufacturingRepository } from "../infrastructure/repositories/manufacturing.repository";

async function createManufacturingParts() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const repository = new SupabaseManufacturingRepository(supabase, context);
  const outbox = new OutboxService(supabase, context);

  return { context, repository, outbox };
}

export async function createManufacturingFoundationService(resourceKey: ManufacturingResourceKey) {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ManufacturingFoundationService(context, repository, outbox, getManufacturingResourceDefinition(resourceKey));
}

export async function createProductionLineService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ProductionLineService(context, repository, outbox, getManufacturingResourceDefinition("production-lines"));
}

export async function createWorkCenterService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new WorkCenterService(context, repository, outbox, getManufacturingResourceDefinition("work-centers"));
}

export async function createManufacturingProfileService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ManufacturingProfileService(context, repository, outbox, getManufacturingResourceDefinition("manufacturing-profiles"));
}

export async function createManufacturingLineAssignmentService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ManufacturingLineAssignmentService(context, repository, outbox, getManufacturingResourceDefinition("line-assignments"));
}

export async function createSupervisorAssignmentService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new SupervisorAssignmentService(context, repository, outbox, {
    aggregateType: "supervisor_line_assignment",
    basePath: "/erp/manufacturing/line-assignments",
    columns: [],
    description: "Supervisor scope placeholder for future production sessions.",
    formFields: [],
    key: "line-assignments",
    managePermission: MANUFACTURING_PERMISSIONS.assignmentsManage,
    readPermission: MANUFACTURING_PERMISSIONS.workersView,
    searchColumns: [],
    selectColumns: "id, tenant_id, branch_id, employee_id, manufacturing_profile_id, production_line_id, effective_from, effective_to, notes, is_active, created_at, updated_at, version",
    singularTitle: "Supervisor Line Assignment",
    tableName: "supervisor_line_assignments",
    title: "Supervisor Line Assignments",
  });
}

export async function createProductionStandardService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ProductionStandardService(context, repository, outbox, getManufacturingResourceDefinition("production-standards"));
}

export async function createManufacturingBomService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ManufacturingBomService(context, repository, outbox, getManufacturingResourceDefinition("boms"));
}

export async function createManufacturingRoutingService() {
  const { context, repository, outbox } = await createManufacturingParts();
  return new ManufacturingRoutingService(context, repository, outbox, getManufacturingResourceDefinition("routing-plans"));
}

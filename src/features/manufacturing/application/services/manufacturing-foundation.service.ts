import { randomUUID } from "node:crypto";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";
import type { OutboxService } from "@/platform/integration/server";
import type { EventName } from "@/platform/integration/public-api";
import { requirePermission } from "@/platform/permissions/server";

import type { ManufacturingRepository } from "../ports/manufacturing.repository";
import type { ManufacturingListQuery, ManufacturingMutationInput, ManufacturingRecord, ManufacturingResourceDefinition } from "../types";
import {
  assertBomFoundationRules,
  assertFoundationOnlyInput,
  assertProductionStandardFoundationRules,
  assertRoutingFoundationRules,
} from "../../domain/rules/manufacturing-foundation.rules";

export class ManufacturingFoundationService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: ManufacturingRepository,
    private readonly outbox: OutboxService,
    private readonly definition: ManufacturingResourceDefinition,
  ) {}

  async list(query: ManufacturingListQuery) {
    await requirePermission({ context: this.context, permission: this.definition.readPermission });
    return this.repository.list(this.definition, query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: this.definition.readPermission });
    const record = await this.repository.findById(this.definition, id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: `${this.definition.singularTitle} was not found.` });
    }

    return record;
  }

  async create(input: ManufacturingMutationInput) {
    await requirePermission({ context: this.context, permission: this.definition.managePermission });
    this.assertResourceRules(input);
    const record = await this.repository.create(this.definition, input);

    if (this.definition.createdEventName) {
      await this.enqueueEvent(this.definition.createdEventName, record, "created");
    }

    return record;
  }

  async update(id: string, input: ManufacturingMutationInput) {
    await requirePermission({ context: this.context, permission: this.definition.managePermission });
    this.assertResourceRules(input);
    const record = await this.repository.update(this.definition, id, input);

    if (this.definition.updatedEventName) {
      await this.enqueueEvent(this.definition.updatedEventName, record, "updated");
    }

    return record;
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: this.definition.managePermission });
    await this.repository.softDelete(this.definition, id);
  }

  private assertResourceRules(input: ManufacturingMutationInput) {
    if (this.definition.key === "boms") {
      assertBomFoundationRules(input);
      return;
    }

    if (this.definition.key === "routing-plans") {
      assertRoutingFoundationRules(input);
      return;
    }

    if (this.definition.key === "production-standards") {
      assertProductionStandardFoundationRules(input);
      return;
    }

    assertFoundationOnlyInput(input);
  }

  private async enqueueEvent(eventName: string, record: ManufacturingRecord, action: "created" | "updated") {
    const eventId = randomUUID();
    const idempotencyKey = `${eventName}:${record.id}:${record.version}`;

    await this.outbox.enqueue({
      event: {
        metadata: {
          actor: { type: this.context.actorType, userId: this.context.userId },
          aggregateId: record.id,
          aggregateType: this.definition.aggregateType,
          branchId: typeof record.branchId === "string" ? record.branchId : undefined,
          companyId: this.context.companyId,
          correlationId: this.context.correlationId,
          eventId,
          eventKind: "domain",
          eventName: eventName as EventName,
          eventVersion: 1,
          idempotencyKey,
          occurredAt: new Date().toISOString(),
          schemaVersion: "1.0.0",
          sourceModule: "manufacturing",
          tenantId: this.context.tenantId,
        },
        payload: {
          action,
          foundationOnly: true,
          recordId: record.id,
          resourceKey: this.definition.key,
        },
      },
      idempotencyKey,
    });
  }
}

export class ProductionLineService extends ManufacturingFoundationService {}
export class WorkCenterService extends ManufacturingFoundationService {}
export class ManufacturingProfileService extends ManufacturingFoundationService {}
export class ManufacturingLineAssignmentService extends ManufacturingFoundationService {}
export class SupervisorAssignmentService extends ManufacturingFoundationService {}
export class ProductionStandardService extends ManufacturingFoundationService {}
export class ManufacturingBomService extends ManufacturingFoundationService {}
export class ManufacturingRoutingService extends ManufacturingFoundationService {}

import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { InventoryFoundationRepository } from "../ports/inventory.repository";
import type { InventoryListQuery } from "../types";
import { assertEventsIntegrationFoundationOnly } from "../../domain/rules/inventory-foundation.rules";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export class InventoryFoundationService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: InventoryFoundationRepository,
  ) {}

  async overview(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.eventsView });
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.integrationView });
    assertEventsIntegrationFoundationOnly();

    const [eventDefinitions, endpoints, messages] = await Promise.all([
      this.repository.listEventDefinitions(query),
      this.repository.listIntegrationEndpoints(query),
      this.repository.listIntegrationMessages(query),
    ]);

    return { eventDefinitions, endpoints, messages };
  }

  async listEventDefinitions(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.eventsView });
    assertEventsIntegrationFoundationOnly();
    return this.repository.listEventDefinitions(query);
  }

  async listIntegrationEndpoints(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.integrationView });
    assertEventsIntegrationFoundationOnly();
    return this.repository.listIntegrationEndpoints(query);
  }

  async listEventRoutes(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.integrationView });
    assertEventsIntegrationFoundationOnly();
    return this.repository.listEventRoutes(query);
  }

  async listIntegrationMessages(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.integrationView });
    assertEventsIntegrationFoundationOnly();
    return this.repository.listIntegrationMessages(query);
  }

  async listStockLedgerEntries(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    return this.repository.listStockLedgerEntries(query);
  }

  async listStockBalances(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    return this.repository.listStockBalances(query);
  }

  async listStockPostingBatches(query: InventoryListQuery) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    return this.repository.listStockPostingBatches(query);
  }
}

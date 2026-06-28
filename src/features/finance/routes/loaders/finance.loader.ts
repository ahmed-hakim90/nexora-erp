import "server-only";

import { FINANCE_ENTITIES, getFinanceEntity } from "../../application/entities";
import { financeListQuerySchema } from "../../application/schemas/finance.schema";
import type { FinanceDashboardData, FinanceDashboardMetric, FinanceEntityKey } from "../../application/types";
import { createFinanceService } from "../service-factory";

export async function listFinanceRecords(entityKey: string, query: unknown = {}) {
  const service = await createFinanceService(entityKey);
  return service.list(financeListQuerySchema.parse(query));
}

export async function listAllFinanceRecords(entityKey: string, query: unknown = {}) {
  const service = await createFinanceService(entityKey);
  return service.listAll(financeListQuerySchema.parse(query));
}

export async function getFinanceRecord(entityKey: string, id: string) {
  const service = await createFinanceService(entityKey);
  return service.read(id);
}

export async function getFinanceAccess(entityKey: string) {
  const service = await createFinanceService(entityKey);
  return service.getAccess();
}

const DASHBOARD_ENTITY_KEYS: readonly FinanceEntityKey[] = [
  "chart-of-accounts",
  "journals",
  "fiscal-years",
  "fiscal-periods",
  "currencies",
  "taxes",
  "payment-terms",
  "cost-centers",
  "dimensions",
];

export async function getFinanceDashboard(): Promise<FinanceDashboardData> {
  try {
    const metrics = await Promise.all(
      DASHBOARD_ENTITY_KEYS.map(async (key): Promise<FinanceDashboardMetric> => {
        const descriptor = getFinanceEntity(key);
        const service = await createFinanceService(key);
        const count = await service.count();

        return {
          key,
          label: descriptor.title,
          count,
          description: descriptor.description,
          href: descriptor.basePath,
        };
      }),
    );

    return { metrics };
  } catch (error) {
    return {
      metrics: Object.values(FINANCE_ENTITIES)
        .filter((descriptor) => DASHBOARD_ENTITY_KEYS.includes(descriptor.key as FinanceEntityKey))
        .map((descriptor) => ({
          key: descriptor.key,
          label: descriptor.title,
          count: 0,
          description: descriptor.description,
          href: descriptor.basePath,
        })),
      errorMessage: error instanceof Error ? error.message : "Could not load finance dashboard metrics.",
    };
  }
}

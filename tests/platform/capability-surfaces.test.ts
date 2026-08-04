import assert from "node:assert/strict";
import test from "node:test";

import {
  FINANCE_DASHBOARD_TEMPLATE_CONTRACT,
  FINANCE_FOUNDATION_CONTRACTS,
  FINANCE_PRINT_READINESS_CONTRACT,
  FINANCE_REPORT_READINESS_CONTRACT,
  financeAppManifest,
} from "@/features/finance/public-api";
import {
  INVENTORY_DASHBOARD_TEMPLATE_CONTRACT,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_PRINT_READINESS_CONTRACT,
  INVENTORY_REPORT_READINESS_CONTRACT,
  inventoryAppManifest,
} from "@/features/inventory/public-api";
import {
  MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT,
  MANUFACTURING_FOUNDATION_CONTRACTS,
  MANUFACTURING_PRINT_READINESS_CONTRACT,
  MANUFACTURING_REPORT_READINESS_CONTRACT,
  manufacturingAppManifest,
} from "@/features/manufacturing/public-api";
import {
  HR_DASHBOARD_TEMPLATE_CONTRACT,
  HR_FOUNDATION_CONTRACTS,
  HR_PRINT_READINESS_CONTRACT,
  HR_REPORT_READINESS_CONTRACT,
  hrAppManifest,
} from "@/features/hr/server-api";
import type { AppManifest } from "@/platform/app-registry/public-api";
import { buildAppCapabilityPlatformModel } from "@/shared/workspace/app-capability-platform";

const acceptedSurfaces = [
  {
    dashboardKey: FINANCE_DASHBOARD_TEMPLATE_CONTRACT.key,
    contracts: FINANCE_FOUNDATION_CONTRACTS,
    manifest: financeAppManifest,
    printKey: FINANCE_PRINT_READINESS_CONTRACT.key,
    reportKey: FINANCE_REPORT_READINESS_CONTRACT.key,
  },
  {
    dashboardKey: INVENTORY_DASHBOARD_TEMPLATE_CONTRACT.key,
    contracts: INVENTORY_FOUNDATION_CONTRACTS,
    manifest: inventoryAppManifest,
    printKey: INVENTORY_PRINT_READINESS_CONTRACT.key,
    reportKey: INVENTORY_REPORT_READINESS_CONTRACT.key,
  },
  {
    dashboardKey: MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT.key,
    contracts: MANUFACTURING_FOUNDATION_CONTRACTS,
    manifest: manufacturingAppManifest,
    printKey: MANUFACTURING_PRINT_READINESS_CONTRACT.key,
    reportKey: MANUFACTURING_REPORT_READINESS_CONTRACT.key,
  },
  {
    dashboardKey: HR_DASHBOARD_TEMPLATE_CONTRACT.key,
    contracts: HR_FOUNDATION_CONTRACTS,
    manifest: hrAppManifest,
    printKey: HR_PRINT_READINESS_CONTRACT.key,
    reportKey: HR_REPORT_READINESS_CONTRACT.key,
  },
] as const;

test("accepted app manifests advertise the same report, print, and dashboard keys as exported contracts", () => {
  for (const surface of acceptedSurfaces) {
    assert.deepEqual(surface.manifest.reports.map((capability) => capability.key), [surface.reportKey]);
    assert.deepEqual(surface.manifest.prints.map((capability) => capability.key), [surface.printKey]);
    assert.deepEqual(surface.manifest.dashboards.map((capability) => capability.key), [surface.dashboardKey]);
    assert.equal(surface.contracts.report.key, surface.reportKey);
    assert.equal(surface.contracts.print.key, surface.printKey);
    assert.equal(surface.contracts.dashboardTemplate.key, surface.dashboardKey);
  }
});

test("capability platform model exposes contract-backed surfaces without synthetic readiness keys", () => {
  const model = buildAppCapabilityPlatformModel(acceptedSurfaces.map((surface) => surface.manifest) satisfies readonly AppManifest[]);
  const allContributionKeys = new Set([
    ...model.reports.map((capability) => capability.key),
    ...model.prints.map((capability) => capability.key),
    ...model.dashboards.map((capability) => capability.key),
  ]);

  for (const surface of acceptedSurfaces) {
    assert.equal(allContributionKeys.has(surface.reportKey), true);
    assert.equal(allContributionKeys.has(surface.printKey), true);
    assert.equal(allContributionKeys.has(surface.dashboardKey), true);
  }

  assert.equal([...allContributionKeys].some((key) => key.endsWith("report-readiness")), false);
  assert.equal([...allContributionKeys].some((key) => key.endsWith("print-readiness")), false);
  assert.equal([...allContributionKeys].some((key) => key.endsWith("dashboard-readiness")), false);
});

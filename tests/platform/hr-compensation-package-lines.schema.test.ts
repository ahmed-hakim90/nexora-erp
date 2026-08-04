import assert from "node:assert/strict";
import test from "node:test";

import {
  hrSalaryPackageLineArchiveSchema,
  hrSalaryPackageLineSchema,
  hrSalaryPackageLineUpdateSchema,
} from "@/features/hr/server-api";

test("salary package line schemas validate create, update, and archive inputs", () => {
  const packageVersionId = "11111111-1111-4111-8111-111111111111";
  const componentVersionId = "22222222-2222-4222-8222-222222222222";
  const lineId = "33333333-3333-4333-8333-333333333333";

  const createInput = hrSalaryPackageLineSchema.parse({
    amount: "8500.50",
    componentVersionId,
    salaryPackageVersionId: packageVersionId,
  });
  assert.equal(createInput.amount, 8500.5);
  assert.equal(createInput.componentVersionId, componentVersionId);

  const updateInput = hrSalaryPackageLineUpdateSchema.parse({
    amount: 9000,
    lineId,
  });
  assert.equal(updateInput.amount, 9000);
  assert.equal(updateInput.lineId, lineId);

  const archiveInput = hrSalaryPackageLineArchiveSchema.parse({ lineId });
  assert.equal(archiveInput.lineId, lineId);
});

test("salary package line schema rejects negative amounts", () => {
  assert.throws(() =>
    hrSalaryPackageLineSchema.parse({
      amount: -1,
      componentVersionId: "22222222-2222-4222-8222-222222222222",
      salaryPackageVersionId: "11111111-1111-4111-8111-111111111111",
    }),
  );
});

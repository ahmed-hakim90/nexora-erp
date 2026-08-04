import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { HR_NOTIFICATION_RUNTIME_HANDLERS } from "@/features/hr/server-api";
import { HR_PRINT_RUNTIME_REGISTRY } from "@/features/hr/server-api";
import { HR_PRINT_TEMPLATE_KEYS } from "@/features/hr/server-api";

describe("HR print and notification runtime", () => {
  test("print runtime exposes top operational templates", () => {
    const keys = new Set(HR_PRINT_RUNTIME_REGISTRY.templates.map((template) => template.key));
    assert.ok(keys.has(HR_PRINT_TEMPLATE_KEYS.employeeProfile));
    assert.ok(keys.has(HR_PRINT_TEMPLATE_KEYS.contract));
    assert.ok(keys.has(HR_PRINT_TEMPLATE_KEYS.salaryLetter));
    assert.ok(keys.has(HR_PRINT_TEMPLATE_KEYS.employeeCertificate));
  });

  test("notification runtime registers expiry scan handlers", () => {
    const keys = new Set(HR_NOTIFICATION_RUNTIME_HANDLERS.map((handler) => handler.key));
    assert.ok(keys.has("hr.contract.expiry_approaching"));
    assert.ok(keys.has("hr.document.expiry_approaching"));
    assert.ok(keys.has("hr.probation.ending_soon"));
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { hrEmployeeListQuerySchema } from "@/features/hr/server-api";

test("employee list query accepts department and unassigned filters", () => {
  const departmentId = "11111111-1111-4111-8111-111111111111";
  const withDepartment = hrEmployeeListQuerySchema.parse({ departmentId, status: "active" });
  assert.equal(withDepartment.departmentId, departmentId);
  assert.equal(withDepartment.status, "active");

  const withUnassigned = hrEmployeeListQuerySchema.parse({ status: "active", unassigned: "1" });
  assert.equal(withUnassigned.unassigned, "1");
  assert.equal(withUnassigned.status, "active");
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPrimaryUploadValueForKind,
  normalizeUploadDocumentType,
} from "../../src/features/hr/application/constants/hr-document-kind.registry";
import {
  evaluateEmployeeDocumentCompliance,
  isEmployeeDocumentComplianceIncomplete,
} from "../../src/features/hr/application/utils/hr-document-compliance.evaluate";

describe("hr document compliance", () => {
  it("maps upload document types to required kinds", () => {
    assert.equal(normalizeUploadDocumentType("work_permit"), "residence");
    assert.equal(normalizeUploadDocumentType("medical_certificate"), "medical");
    assert.equal(normalizeUploadDocumentType("contract_copy"), "contract");
    assert.equal(getPrimaryUploadValueForKind("residence"), "work_permit");
  });

  it("marks missing required documents", () => {
    const result = evaluateEmployeeDocumentCompliance({
      contractTypeId: "type-1",
      contractTypeLabel: "Permanent",
      documentSetId: "set-1",
      documentSetLabel: "Standard hire",
      employeeId: "emp-1",
      hasActiveContract: true,
      requiredKinds: ["national_id", "medical"],
      uploads: [],
    });

    assert.equal(result.resolution, "resolved");
    assert.equal(result.summary.missing, 2);
    assert.equal(result.items.every((item) => item.status === "missing"), true);
    assert.equal(isEmployeeDocumentComplianceIncomplete(result), true);
  });

  it("treats metadata-only uploads as incomplete", () => {
    const result = evaluateEmployeeDocumentCompliance({
      employeeId: "emp-1",
      hasActiveContract: true,
      documentSetId: "set-1",
      requiredKinds: ["national_id"],
      uploads: [
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresOn: null,
          fileName: "ID scan pending",
          hasStorageFile: false,
          id: "doc-1",
          uploadType: "national_id",
        },
      ],
    });

    assert.equal(result.items[0]?.status, "registered_only");
    assert.equal(result.summary.missing, 1);
  });

  it("detects expired and expiring documents", () => {
    const result = evaluateEmployeeDocumentCompliance({
      employeeId: "emp-1",
      hasActiveContract: true,
      documentSetId: "set-1",
      referenceDate: "2026-07-09",
      requiredKinds: ["passport", "national_id"],
      uploads: [
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          expiresOn: "2026-01-01",
          fileName: "passport.pdf",
          hasStorageFile: true,
          id: "doc-1",
          uploadType: "passport",
        },
        {
          createdAt: "2026-02-01T00:00:00.000Z",
          expiresOn: "2026-07-20",
          fileName: "id.pdf",
          hasStorageFile: true,
          id: "doc-2",
          uploadType: "national_id",
        },
      ],
    });

    assert.equal(result.items.find((item) => item.kind === "passport")?.status, "expired");
    assert.equal(result.items.find((item) => item.kind === "national_id")?.status, "expiring_soon");
    assert.equal(result.summary.expired, 1);
    assert.equal(result.summary.complete, 1);
  });

  it("returns resolution when contract or document set is missing", () => {
    assert.equal(
      evaluateEmployeeDocumentCompliance({
        employeeId: "emp-1",
        hasActiveContract: false,
        requiredKinds: [],
        uploads: [],
      }).resolution,
      "no_active_contract",
    );
    assert.equal(
      evaluateEmployeeDocumentCompliance({
        employeeId: "emp-1",
        hasActiveContract: true,
        requiredKinds: [],
        uploads: [],
      }).resolution,
      "no_document_set",
    );
  });

  it("treats waived document kinds as complete", () => {
    const result = evaluateEmployeeDocumentCompliance({
      documentSetId: "set-1",
      employeeId: "emp-1",
      hasActiveContract: true,
      requiredKinds: ["national_id", "medical"],
      uploads: [],
      waivers: [{ documentKind: "medical", id: "waiver-1", reason: "Pending clinic appointment" }],
    });

    assert.equal(result.items.find((item) => item.kind === "medical")?.status, "waived");
    assert.equal(result.summary.missing, 1);
    assert.equal(result.summary.complete, 1);
    assert.equal(isEmployeeDocumentComplianceIncomplete(result), true);
  });

  it("waived documents clear incomplete status when only gaps are waived", () => {
    const result = evaluateEmployeeDocumentCompliance({
      documentSetId: "set-1",
      employeeId: "emp-1",
      hasActiveContract: true,
      requiredKinds: ["medical"],
      uploads: [],
      waivers: [{ documentKind: "medical", id: "waiver-1", reason: "HR approved exception" }],
    });

    assert.equal(isEmployeeDocumentComplianceIncomplete(result), false);
  });
});

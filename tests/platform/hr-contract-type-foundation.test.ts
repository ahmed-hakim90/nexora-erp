import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContractLegalTermsSnapshot,
  HR_CONTRACT_LEGAL_TERMS_SCHEMA,
  HR_CONTRACT_PLACEHOLDERS,
  parseContractLegalTermsSnapshot,
  placeholderToken,
  resolveContractPlaceholders,
} from "../../src/features/hr/contract-type-foundation";
import { renderContractArticlesHtml } from "../../src/features/hr/application/utils/hr-contract-legal-terms.render";

test("contract type foundation: placeholder tokens use snake_case", () => {
  for (const key of HR_CONTRACT_PLACEHOLDERS) {
    assert.equal(placeholderToken(key), `{{${key}}}`);
  }
});

test("contract type foundation: resolve placeholders only for known keys", () => {
  const resolved = resolveContractPlaceholders(
    "Employee {{employee_name}} ({{employee_number}}) at {{company}} from {{start_date}} to {{end_date}} salary {{salary}} unknown {{missing}}",
    {
      company: "Nexora LLC",
      employeeName: "Ahmed Ali",
      employeeNumber: "EMP-001",
      endDate: "2026-12-31",
      salary: "15000",
      startDate: "2026-01-01",
    },
  );
  assert.match(resolved, /Ahmed Ali/);
  assert.match(resolved, /EMP-001/);
  assert.match(resolved, /Nexora LLC/);
  assert.match(resolved, /2026-01-01/);
  assert.match(resolved, /2026-12-31/);
  assert.match(resolved, /15000/);
  assert.match(resolved, /\{\{missing\}\}/);
});

test("contract type foundation: snapshot keeps placeholders unresolved", () => {
  const snapshot = buildContractLegalTermsSnapshot({
    articles: [
      {
        body_ar: "يعمل {{employee_name}}",
        body_en: "Employee {{employee_name}} works for {{company}}",
        code: "ART-01",
        sequence: 1,
        title_ar: "المادة الأولى",
        title_en: "Article 1",
      },
    ],
    contractTypeCode: "FIXED_TERM",
    contractTypeId: "11111111-1111-1111-1111-111111111111",
    contractTypeVersionId: "22222222-2222-2222-2222-222222222222",
    versionNo: 2,
  });

  assert.equal(snapshot.schema, HR_CONTRACT_LEGAL_TERMS_SCHEMA);
  assert.equal(snapshot.placeholders_resolved, false);
  assert.equal(snapshot.version_no, 2);
  assert.equal(snapshot.articles[0]?.version, 2);
  assert.match(snapshot.articles[0]?.body_en ?? "", /\{\{employee_name\}\}/);

  const parsed = parseContractLegalTermsSnapshot(snapshot);
  assert.ok(parsed);
  assert.equal(parsed?.articles.length, 1);
});

test("contract type foundation: parse rejects invalid snapshot payloads", () => {
  assert.equal(parseContractLegalTermsSnapshot(null), null);
  assert.equal(parseContractLegalTermsSnapshot({ schema: "other" }), null);
  assert.equal(parseContractLegalTermsSnapshot({ schema: HR_CONTRACT_LEGAL_TERMS_SCHEMA }), null);
});

test("contract type foundation: render preview resolves placeholders in display order", () => {
  const snapshot = buildContractLegalTermsSnapshot({
    articles: [
      {
        body_ar: "",
        body_en: "Employee {{employee_name}} starts {{start_date}}",
        code: "ART-01",
        sequence: 2,
        title_ar: null,
        title_en: "Second",
      },
      {
        body_ar: "",
        body_en: "Company {{company}}",
        code: "ART-02",
        sequence: 1,
        title_ar: null,
        title_en: "First",
      },
    ],
    contractTypeCode: "PERMANENT",
    contractTypeId: "11111111-1111-1111-1111-111111111111",
    contractTypeVersionId: "22222222-2222-2222-2222-222222222222",
    versionNo: 1,
  });

  const html = renderContractArticlesHtml({
    articles: snapshot.articles,
    companyName: "Nexora LLC",
    contractTypeCode: "PERMANENT",
    contractTypeName: "Permanent",
    generatedOn: "2026-07-08",
    placeholderContext: {
      company: "Nexora LLC",
      employeeName: "Ahmed Ali",
      startDate: "2026-01-01",
    },
    resolvePlaceholders: true,
  });

  const firstIndex = html.indexOf("Company Nexora LLC");
  const secondIndex = html.indexOf("Employee Ahmed Ali");
  assert.ok(firstIndex >= 0);
  assert.ok(secondIndex > firstIndex);
});

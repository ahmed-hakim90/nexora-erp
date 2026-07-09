import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmployeeImportTemplateCsv,
  buildEmployeeImportTemplateXls,
  normalizeAttendanceCodeKey,
  parseEmployeeImportCsv,
  parseEmployeeImportFile,
  parseEmployeeImportSpreadsheet,
  previewEmployeeImportRows,
  previewRowsToCommitPayload,
} from "@/features/hr/application/services/hr-import.service";

type FakeEmployee = Readonly<{
  attendance_code: string | null;
  employee_number: string;
  full_name: string;
  id: string;
}>;

const context = {
  accessToken: "token",
  branchId: "branch-1",
  companyId: "company-1",
  tenantId: "tenant-1",
  userId: "user-1",
} as const;

test("employee import template includes employee code column (attendance aliases still parseable)", () => {
  const csvAr = buildEmployeeImportTemplateCsv("ar");
  assert.match(csvAr, /كود الموظف/);
  assert.match(csvAr, /الاسم بالكامل/);
  assert.doesNotMatch(csvAr, /كود الحضور/);

  const csvEn = buildEmployeeImportTemplateCsv("en");
  assert.match(csvEn, /Employee Code/);
  assert.match(csvEn, /Full Name/);
  assert.doesNotMatch(csvEn, /Attendance Code/);
});

test("employee import Excel template is legacy .xls (BIFF8) with Arabic headers", () => {
  const xls = buildEmployeeImportTemplateXls("ar");
  assert.ok(Buffer.isBuffer(xls));
  assert.ok(xls.length > 100);
  // OLE compound document magic for Excel 97-2003
  assert.equal(xls[0], 0xd0);
  assert.equal(xls[1], 0xcf);
  assert.equal(xls[2], 0x11);
  assert.equal(xls[3], 0xe0);

  const parsed = parseEmployeeImportSpreadsheet(xls);
  assert.ok(parsed.headers.includes("كود الموظف"));
  assert.ok(parsed.headers.includes("الاسم بالكامل"));
  assert.equal(parsed.rows.length, 0);
});

test("parseEmployeeImportCsv maps labeled columns", () => {
  const csv = [
    "Full Name,Employee Code,National ID,Gender,Birth Date (YYYY-MM-DD),Phone,Email",
    "Ada Lovelace,E-1,N-1,female,1990-01-01,0100,ada@example.com",
  ].join("\n");

  const parsed = parseEmployeeImportCsv(csv);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.fullName, "Ada Lovelace");
  assert.equal(parsed.rows[0]?.employeeNumber, "E-1");
});

test("legacy Attendance Code header maps into employeeNumber", () => {
  const csv = [
    "Full Name,Attendance Code,National ID",
    "Ada Lovelace,FP-100,N-1",
  ].join("\n");

  const parsed = parseEmployeeImportCsv(csv);
  assert.equal(parsed.rows[0]?.employeeNumber, "FP-100");
  assert.equal(parsed.rows[0]?.attendanceCode, undefined);
});

test("legacy dual-code sheet prefers Employee Code over Attendance Code", () => {
  const csv = [
    "Full Name,Employee Number,Attendance Code,National ID,Gender,Birth Date (YYYY-MM-DD),Phone,Email",
    "Ada Lovelace,E-1,FP-100,N-1,female,1990-01-01,0100,ada@example.com",
  ].join("\n");

  const parsed = parseEmployeeImportCsv(csv);
  assert.equal(parsed.rows[0]?.employeeNumber, "E-1");
});

test("parseEmployeeImportCsv accepts Arabic headers and gender values", () => {
  const csv = [
    "الاسم بالكامل,كود الموظف,الرقم القومي,النوع,تاريخ الميلاد,الهاتف,البريد الإلكتروني",
    "أحمد محمد,E-2,N-2,ذكر,1990-05-10,0100,ahmed@example.com",
  ].join("\n");

  const parsed = parseEmployeeImportCsv(csv);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.fullName, "أحمد محمد");
  assert.equal(parsed.rows[0]?.employeeNumber, "E-2");
  assert.equal(parsed.rows[0]?.gender, "ذكر");
});

test("Arabic gender values normalize during preview and unify code fields", async () => {
  const stub = {
    from() {
      const api: Record<string, unknown> = {
        select() {
          return api;
        },
        eq() {
          return api;
        },
        neq() {
          return api;
        },
        ilike() {
          return api;
        },
        is() {
          return api;
        },
        not() {
          return api;
        },
        limit() {
          return api;
        },
        then(resolve: (value: { data: []; error: null }) => void) {
          resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        },
      };
      return api;
    },
  };

  const preview = await previewEmployeeImportRows(stub as never, context as never, [
    { fullName: "سارة أحمد", attendanceCode: "FP-AR", gender: "أنثى" },
    { fullName: "محمد علي", attendanceCode: "FP-AR2", gender: "ذكر" },
  ]);

  assert.equal(preview.rows[0]?.action, "create");
  assert.equal(preview.rows[0]?.gender, "female");
  assert.equal(preview.rows[0]?.employeeNumber, "FP-AR");
  assert.equal(preview.rows[0]?.attendanceCode, "FP-AR");
  assert.equal(preview.rows[1]?.action, "create");
  assert.equal(preview.rows[1]?.gender, "male");
  assert.equal(preview.rows[1]?.employeeNumber, "FP-AR2");
});

test("parseEmployeeImportFile reads xlsx/xls workbook rows and Excel serial dates", () => {
  const XLSX = require("xlsx") as typeof import("xlsx");
  const headers = [
    "Full Name",
    "Employee Code",
    "National ID",
    "Gender",
    "Birth Date (YYYY-MM-DD)",
    "Phone",
    "Email",
  ];
  // Excel serial for 1990-01-01
  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ["Ada Lovelace", "E-1", "N-1", "female", 32874, "0100", "ada@example.com"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
  const xlsxBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  const parsedXlsx = parseEmployeeImportFile(xlsxBuffer, "employees.xlsx");
  assert.equal(parsedXlsx.rows.length, 1);
  assert.equal(parsedXlsx.rows[0]?.fullName, "Ada Lovelace");
  assert.equal(parsedXlsx.rows[0]?.employeeNumber, "E-1");
  assert.equal(parsedXlsx.rows[0]?.birthDate, "1990-01-01");

  const xlsBuffer = XLSX.write(workbook, { bookType: "biff8", type: "buffer" }) as Buffer;
  const parsedXls = parseEmployeeImportFile(xlsBuffer, "employees.xls");
  assert.equal(parsedXls.rows[0]?.fullName, "Ada Lovelace");
  assert.equal(parsedXls.rows[0]?.employeeNumber, "E-1");
});

test("normalizeAttendanceCodeKey is case-insensitive and trimmed", () => {
  assert.equal(normalizeAttendanceCodeKey("  Fp-100  "), "fp-100");
  assert.equal(normalizeAttendanceCodeKey(null), "");
});

test("previewEmployeeImportRows classifies create, update, and error rows", async () => {
  // Match lookup + uniqueness checks share one stubbed hr_employees query chain.
  const uniquenessAware = {
    from(table: string) {
      if (table !== "hr_employees") {
        throw new Error(`Unexpected table ${table}`);
      }
      let mode: "match" | "unique" = "match";
      let uniqueHits: FakeEmployee[] = [];
      const api: Record<string, unknown> = {
        select() {
          return api;
        },
        eq(column: string, value: string) {
          if (column === "employee_number" || column === "national_id") {
            mode = "unique";
            uniqueHits = [];
          }
          if (column === "id") {
            // neq path uses different chain; ignore
          }
          void value;
          return api;
        },
        neq() {
          return api;
        },
        ilike() {
          mode = "unique";
          uniqueHits = [];
          return api;
        },
        is() {
          return api;
        },
        not() {
          mode = "match";
          return api;
        },
        limit() {
          return api;
        },
        then(resolve: (value: { data: FakeEmployee[]; error: null }) => void) {
          const data =
            mode === "match"
              ? [
                  {
                    attendance_code: "FP-100",
                    employee_number: "E-EXISTING",
                    full_name: "Existing Employee",
                    id: "emp-1",
                  },
                ]
              : uniqueHits;
          resolve({ data, error: null });
          return Promise.resolve({ data, error: null });
        },
      };
      return api;
    },
  };

  const preview = await previewEmployeeImportRows(uniquenessAware as never, context as never, [
    { fullName: "New Hire", attendanceCode: "FP-NEW", employeeNumber: "E-NEW" },
    { fullName: "Updated Name", attendanceCode: "fp-100", phone: "0111" },
    { fullName: "", attendanceCode: "FP-BAD" },
    { fullName: "Bad Email", email: "not-an-email" },
  ]);

  assert.equal(preview.summary.totalRows, 4);
  assert.equal(preview.summary.createCount, 1);
  assert.equal(preview.summary.updateCount, 1);
  assert.equal(preview.summary.errorCount, 2);

  assert.equal(preview.rows[0]?.action, "create");
  assert.equal(preview.rows[0]?.employeeNumber, "E-NEW");
  assert.equal(preview.rows[0]?.attendanceCode, "E-NEW");
  assert.equal(preview.rows[1]?.action, "update");
  assert.equal(preview.rows[1]?.matchedEmployeeId, "emp-1");
  assert.equal(preview.rows[1]?.employeeNumber, "FP-100");
  assert.equal(preview.rows[2]?.action, "error");
  assert.equal(preview.rows[3]?.action, "error");

  const commitRows = previewRowsToCommitPayload(preview.rows);
  assert.equal(commitRows.length, 2);
  assert.deepEqual(
    commitRows.map((row) => row.action),
    ["create", "update"],
  );
});

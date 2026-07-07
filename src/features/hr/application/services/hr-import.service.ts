import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_EMPLOYEE_IMPORT_COLUMNS } from "../../hr-production-readiness-foundation";
import { validateEmployeeUniqueness } from "./hr-employee-validation.service";

export type HrEmployeeImportRow = Readonly<{
  attendanceCode?: string;
  birthDate?: string;
  email?: string;
  employeeNumber?: string;
  fullName: string;
  gender?: string;
  nationalId?: string;
  phone?: string;
  row: number;
}>;

export type HrEmployeeImportRejectedRow = Readonly<{
  errors: readonly string[];
  row: number;
}>;

export type HrEmployeeImportValidationResult = Readonly<{
  accepted: readonly HrEmployeeImportRow[];
  rejected: readonly HrEmployeeImportRejectedRow[];
}>;

const GENDER_VALUES = new Set(["female", "male", "other", "undisclosed"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const labelToField = new Map(
  HR_EMPLOYEE_IMPORT_COLUMNS.map((column) => [column.label.trim().toLowerCase(), column.field]),
);

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function normalizeCell(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildEmployeeImportTemplateCsv(): string {
  return `${HR_EMPLOYEE_IMPORT_COLUMNS.map((column) => column.label).join(",")}\n`;
}

export function parseEmployeeImportCsv(csvContent: string): Readonly<{ headers: readonly string[]; rows: readonly Record<string, string>[] }> {
  const normalized = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return { headers: [], rows: [] };
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const headerCells = parseCsvLine(lines[0] ?? "");
  const headers = headerCells.map((cell) => cell.trim());
  const fieldIndexes = headers.map((header) => labelToField.get(normalizeHeader(header)) ?? null);

  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const record: Record<string, string> = {};
    fieldIndexes.forEach((field, index) => {
      if (!field) return;
      const value = normalizeCell(cells[index]);
      if (value) record[field] = value;
    });
    return record;
  });

  return { headers, rows };
}

function validateRowShape(rowNumber: number, row: Record<string, string>): { accepted?: HrEmployeeImportRow; errors: string[] } {
  const errors: string[] = [];
  const fullName = normalizeCell(row.fullName);
  if (!fullName) {
    errors.push("Full name is required.");
  }

  const birthDate = normalizeCell(row.birthDate);
  if (birthDate && !DATE_PATTERN.test(birthDate)) {
    errors.push("Birth date must be in YYYY-MM-DD format.");
  }

  const email = normalizeCell(row.email);
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.push("Email must be a valid email address if provided.");
  }

  const gender = normalizeCell(row.gender)?.toLowerCase();
  if (gender && !GENDER_VALUES.has(gender)) {
    errors.push("Gender must be one of: female, male, other, undisclosed.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    accepted: {
      attendanceCode: normalizeCell(row.attendanceCode),
      birthDate,
      email,
      employeeNumber: normalizeCell(row.employeeNumber),
      fullName: fullName!,
      gender,
      nationalId: normalizeCell(row.nationalId),
      phone: normalizeCell(row.phone),
      row: rowNumber,
    },
    errors,
  };
}

export async function validateEmployeeImportRows(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  rows: readonly Record<string, string>[],
): Promise<HrEmployeeImportValidationResult> {
  const accepted: HrEmployeeImportRow[] = [];
  const rejected: HrEmployeeImportRejectedRow[] = [];
  const seenNationalIds = new Map<string, number>();
  const seenAttendanceCodes = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const { accepted: parsedRow, errors } = validateRowShape(rowNumber, rows[index] ?? {});
    if (!parsedRow) {
      rejected.push({ errors, row: rowNumber });
      continue;
    }

    const rowErrors = [...errors];

    if (parsedRow.nationalId) {
      const priorRow = seenNationalIds.get(parsedRow.nationalId);
      if (priorRow) {
        rowErrors.push(`Duplicate national ID in import file (also on row ${priorRow}).`);
      } else {
        seenNationalIds.set(parsedRow.nationalId, rowNumber);
      }
    }

    if (parsedRow.attendanceCode) {
      const normalizedCode = parsedRow.attendanceCode.toLowerCase();
      const priorRow = seenAttendanceCodes.get(normalizedCode);
      if (priorRow) {
        rowErrors.push(`Duplicate attendance code in import file (also on row ${priorRow}).`);
      } else {
        seenAttendanceCodes.set(normalizedCode, rowNumber);
      }
    }

    if (rowErrors.length === 0) {
      const uniquenessIssues = await validateEmployeeUniqueness(supabase, context, {
        attendanceCode: parsedRow.attendanceCode ?? null,
        employeeNumber: parsedRow.employeeNumber ?? null,
        nationalId: parsedRow.nationalId ?? null,
      });
      for (const issue of uniquenessIssues) {
        if (issue.severity === "error") rowErrors.push(issue.message);
      }
    }

    if (rowErrors.length > 0) {
      rejected.push({ errors: rowErrors, row: rowNumber });
      continue;
    }

    accepted.push(parsedRow);
  }

  return { accepted, rejected };
}

export async function validateEmployeeImportCsv(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  csvContent: string,
): Promise<HrEmployeeImportValidationResult> {
  const { rows } = parseEmployeeImportCsv(csvContent);
  return validateEmployeeImportRows(supabase, context, rows);
}

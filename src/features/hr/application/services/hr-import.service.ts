import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import type { BranchRequestContext } from "@/platform/auth/server";

import { HR_EMPLOYEE_IMPORT_COLUMNS, HR_EMPLOYEE_IMPORT_GENDER_ALIASES } from "../../hr-production-readiness-foundation";
import { resolveEmployeeIdentityCode } from "../utils/hr-employee-identity-code";
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

export type HrEmployeeImportPreviewAction = "create" | "update" | "error";

export type HrEmployeeImportPreviewRow = Readonly<{
  action: HrEmployeeImportPreviewAction;
  attendanceCode?: string;
  birthDate?: string;
  email?: string;
  employeeNumber?: string;
  errors: readonly string[];
  fullName: string;
  gender?: string;
  matchedEmployeeId?: string;
  matchedEmployeeNumber?: string;
  matchedFullName?: string;
  nationalId?: string;
  phone?: string;
  row: number;
}>;

export type HrEmployeeImportPreviewSummary = Readonly<{
  createCount: number;
  errorCount: number;
  totalRows: number;
  updateCount: number;
}>;

export type HrEmployeeImportPreviewResult = Readonly<{
  rows: readonly HrEmployeeImportPreviewRow[];
  summary: HrEmployeeImportPreviewSummary;
}>;

export type HrEmployeeImportCommitRow = Readonly<{
  action: "create" | "update";
  attendanceCode?: string;
  birthDate?: string;
  email?: string;
  employeeNumber?: string;
  fullName: string;
  gender?: string;
  matchedEmployeeId?: string;
  nationalId?: string;
  phone?: string;
  row: number;
}>;

type MatchedEmployee = Readonly<{
  attendanceCode: string | null;
  employeeNumber: string;
  fullName: string;
  id: string;
}>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[_\-–—]/g, " ")
    .replace(/\s+/g, " ");
}

const labelToField = (() => {
  const map = new Map<string, (typeof HR_EMPLOYEE_IMPORT_COLUMNS)[number]["field"]>();
  for (const column of HR_EMPLOYEE_IMPORT_COLUMNS) {
    map.set(normalizeHeader(column.label), column.field);
    map.set(normalizeHeader(column.labelAr), column.field);
    for (const alias of column.aliases) {
      map.set(normalizeHeader(alias), column.field);
    }
  }
  return map;
})();

const genderAliasToValue = (() => {
  const map = new Map<string, keyof typeof HR_EMPLOYEE_IMPORT_GENDER_ALIASES>();
  for (const [canonical, aliases] of Object.entries(HR_EMPLOYEE_IMPORT_GENDER_ALIASES) as Array<
    [keyof typeof HR_EMPLOYEE_IMPORT_GENDER_ALIASES, readonly string[]]
  >) {
    map.set(normalizeHeader(canonical), canonical);
    for (const alias of aliases) {
      map.set(normalizeHeader(alias), canonical);
    }
  }
  return map;
})();

function normalizeGenderValue(value: string | undefined) {
  if (!value) return undefined;
  return genderAliasToValue.get(normalizeHeader(value));
}

export type EmployeeImportTemplateLocale = "ar" | "en";

function templateHeaders(locale: EmployeeImportTemplateLocale = "ar") {
  return HR_EMPLOYEE_IMPORT_COLUMNS.map((column) => (locale === "ar" ? column.labelAr : column.label));
}

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

function normalizeCell(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeAttendanceCodeKey(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

export function buildEmployeeImportTemplateCsv(locale: EmployeeImportTemplateLocale = "ar"): string {
  const bom = locale === "ar" ? "\uFEFF" : "";
  return `${bom}${templateHeaders(locale).join(",")}\n`;
}

/** Legacy Excel 97-2003 (.xls / BIFF8) — safest default for old Office installs. Arabic headers by default. */
export function buildEmployeeImportTemplateXls(locale: EmployeeImportTemplateLocale = "ar"): Buffer {
  const headers = templateHeaders(locale);
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, locale === "ar" ? "الموظفين" : "Employees");
  return XLSX.write(workbook, { bookType: "biff8", type: "buffer" }) as Buffer;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatIsoDateParts(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatImportDateValue(value: Date) {
  return formatIsoDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

function formatExcelSerialDate(serial: number) {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return undefined;
  return formatIsoDateParts(parsed.y, parsed.m, parsed.d);
}

function normalizeSpreadsheetCell(value: unknown, field: string | null): string | undefined {
  if (value == null) return undefined;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return field === "birthDate" ? formatImportDateValue(value) : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (field === "birthDate") {
      return formatExcelSerialDate(value) ?? String(value);
    }
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const asText = String(value).trim();
  if (!asText) return undefined;

  if (field === "birthDate") {
    const isoMatch = asText.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (isoMatch) {
      return formatIsoDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }
    const dayFirstMatch = asText.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (dayFirstMatch) {
      return formatIsoDateParts(Number(dayFirstMatch[3]), Number(dayFirstMatch[2]), Number(dayFirstMatch[1]));
    }
  }

  return asText;
}

function mapLabeledRows(
  headers: readonly string[],
  dataRows: readonly unknown[][],
): Readonly<{ headers: readonly string[]; rows: readonly Record<string, string>[] }> {
  const fieldIndexes = headers.map((header) => labelToField.get(normalizeHeader(header)) ?? null);

  const rows = dataRows.map((cells) => {
    const record: Record<string, string> = {};
    fieldIndexes.forEach((field, index) => {
      if (!field) return;
      const value = normalizeSpreadsheetCell(cells[index], field);
      if (!value) return;
      // First non-empty wins so legacy sheets with both Employee Code + Attendance Code keep the job code.
      if (record[field]) return;
      record[field] = value;
    });
    return record;
  });

  return { headers, rows };
}

export function parseEmployeeImportCsv(csvContent: string): Readonly<{ headers: readonly string[]; rows: readonly Record<string, string>[] }> {
  const normalized = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return { headers: [], rows: [] };
  }

  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const headerCells = parseCsvLine(lines[0] ?? "");
  const headers = headerCells.map((cell) => cell.trim());
  const dataRows = lines.slice(1).map((line) => parseCsvLine(line));
  return mapLabeledRows(headers, dataRows);
}

function toNodeBuffer(content: ArrayBuffer | Buffer | Uint8Array) {
  if (Buffer.isBuffer(content)) return content;
  return Buffer.from(content instanceof ArrayBuffer ? new Uint8Array(content) : content);
}

function looksLikeBinarySpreadsheet(buffer: Buffer) {
  if (buffer.length < 4) return false;
  // ZIP container (xlsx/xlsm) or OLE compound document (legacy .xls)
  return (
    (buffer[0] === 0x50 && buffer[1] === 0x4b) ||
    (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0)
  );
}

export function parseEmployeeImportSpreadsheet(
  content: ArrayBuffer | Buffer | Uint8Array,
  options?: Readonly<{ codepage?: number }>,
): Readonly<{ headers: readonly string[]; rows: readonly Record<string, string>[] }> {
  const workbook = XLSX.read(content, {
    cellDates: true,
    // Arabic Windows codepage helps legacy/cracked Office .xls with ANSI Arabic text.
    codepage: options?.codepage ?? 1256,
    type: "buffer",
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    header: 1,
    raw: true,
  }) as unknown[][];

  const nonEmpty = matrix.filter((row) =>
    row.some((cell) => {
      if (cell == null) return false;
      if (typeof cell === "string") return cell.trim().length > 0;
      return true;
    }),
  );

  if (nonEmpty.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = (nonEmpty[0] ?? []).map((cell) => String(cell ?? "").trim());
  return mapLabeledRows(headers, nonEmpty.slice(1));
}

export function isEmployeeImportSpreadsheetFileName(fileName: string | undefined | null) {
  const normalized = (fileName ?? "").trim().toLowerCase();
  return normalized.endsWith(".xls") || normalized.endsWith(".xlsx") || normalized.endsWith(".xlsm");
}

export function isEmployeeImportCsvFileName(fileName: string | undefined | null) {
  const normalized = (fileName ?? "").trim().toLowerCase();
  return normalized.endsWith(".csv") || normalized.endsWith(".txt");
}

export function parseEmployeeImportFile(
  content: ArrayBuffer | Buffer | Uint8Array | string,
  fileName?: string | null,
): Readonly<{ headers: readonly string[]; rows: readonly Record<string, string>[] }> {
  if (typeof content === "string") {
    return parseEmployeeImportCsv(content);
  }

  const buffer = toNodeBuffer(content);
  const lowerName = (fileName ?? "").trim().toLowerCase();
  const isLegacyXls = lowerName.endsWith(".xls") && !lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xlsm");

  if (isEmployeeImportSpreadsheetFileName(fileName) || looksLikeBinarySpreadsheet(buffer)) {
    return parseEmployeeImportSpreadsheet(buffer, { codepage: isLegacyXls ? 1256 : undefined });
  }

  return parseEmployeeImportCsv(buffer.toString("utf8"));
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

  const rawGender = normalizeCell(row.gender);
  const gender = normalizeGenderValue(rawGender);
  if (rawGender && !gender) {
    errors.push("Gender must be ذكر/أنثى (or male/female/other/undisclosed).");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const identityCode = resolveEmployeeIdentityCode({
    attendanceCode: normalizeCell(row.attendanceCode),
    employeeNumber: normalizeCell(row.employeeNumber),
  });

  return {
    accepted: {
      attendanceCode: identityCode ?? undefined,
      birthDate,
      email,
      employeeNumber: identityCode ?? undefined,
      fullName: fullName!,
      gender,
      nationalId: normalizeCell(row.nationalId),
      phone: normalizeCell(row.phone),
      row: rowNumber,
    },
    errors,
  };
}

function toPreviewErrorRow(rowNumber: number, errors: readonly string[], partial?: Partial<HrEmployeeImportRow>): HrEmployeeImportPreviewRow {
  return {
    action: "error",
    attendanceCode: partial?.attendanceCode,
    birthDate: partial?.birthDate,
    email: partial?.email,
    employeeNumber: partial?.employeeNumber,
    errors,
    fullName: partial?.fullName ?? "",
    gender: partial?.gender,
    nationalId: partial?.nationalId,
    phone: partial?.phone,
    row: rowNumber,
  };
}

function summarizePreviewRows(rows: readonly HrEmployeeImportPreviewRow[]): HrEmployeeImportPreviewSummary {
  return {
    createCount: rows.filter((row) => row.action === "create").length,
    errorCount: rows.filter((row) => row.action === "error").length,
    totalRows: rows.length,
    updateCount: rows.filter((row) => row.action === "update").length,
  };
}

async function loadEmployeesByAttendanceCodes(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  attendanceCodes: readonly string[],
): Promise<Map<string, MatchedEmployee>> {
  const uniqueCodes = [...new Set(attendanceCodes.map((code) => code.trim()).filter(Boolean))];
  const matched = new Map<string, MatchedEmployee>();
  if (uniqueCodes.length === 0) return matched;

  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, employee_number, full_name, attendance_code")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const requested = new Set(uniqueCodes.map((code) => normalizeAttendanceCodeKey(code)));
  for (const row of data ?? []) {
    const employee: MatchedEmployee = {
      attendanceCode: row.attendance_code == null ? null : String(row.attendance_code),
      employeeNumber: String(row.employee_number ?? ""),
      fullName: String(row.full_name ?? ""),
      id: String(row.id),
    };

    const attendanceKey = normalizeAttendanceCodeKey(employee.attendanceCode);
    if (attendanceKey && requested.has(attendanceKey) && !matched.has(attendanceKey)) {
      matched.set(attendanceKey, employee);
    }

    const employeeNumberKey = normalizeAttendanceCodeKey(employee.employeeNumber);
    if (employeeNumberKey && requested.has(employeeNumberKey) && !matched.has(employeeNumberKey)) {
      matched.set(employeeNumberKey, employee);
    }
  }

  return matched;
}

export async function previewEmployeeImportRows(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  rows: readonly Record<string, string>[],
): Promise<HrEmployeeImportPreviewResult> {
  const previewRows: HrEmployeeImportPreviewRow[] = [];
  const seenNationalIds = new Map<string, number>();
  const seenAttendanceCodes = new Map<string, number>();
  const seenEmployeeNumbers = new Map<string, number>();
  const parsedRows: Array<{ parsed: HrEmployeeImportRow | null; shapeErrors: string[]; rowNumber: number }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const source = rows[index] ?? {};
    const explicitRow = Number(source.__rowNumber);
    const rowNumber = Number.isFinite(explicitRow) && explicitRow > 0 ? explicitRow : index + 2;
    const { accepted: parsedRow, errors } = validateRowShape(rowNumber, source);
    parsedRows.push({ parsed: parsedRow ?? null, rowNumber, shapeErrors: errors });
  }

  const attendanceCodes = parsedRows
    .map((entry) => {
      if (!entry.parsed) return undefined;
      return (
        resolveEmployeeIdentityCode({
          attendanceCode: entry.parsed.attendanceCode,
          employeeNumber: entry.parsed.employeeNumber,
        }) ?? undefined
      );
    })
    .filter((code): code is string => Boolean(code));
  const matchedByAttendance = await loadEmployeesByAttendanceCodes(supabase, context, attendanceCodes);

  for (const entry of parsedRows) {
    const { parsed, rowNumber, shapeErrors } = entry;
    if (!parsed) {
      previewRows.push(toPreviewErrorRow(rowNumber, shapeErrors));
      continue;
    }

    const identityCode =
      resolveEmployeeIdentityCode({
        attendanceCode: parsed.attendanceCode,
        employeeNumber: parsed.employeeNumber,
      }) ?? undefined;
    const parsedWithIdentity: HrEmployeeImportRow = {
      ...parsed,
      attendanceCode: identityCode,
      employeeNumber: identityCode,
    };

    const rowErrors = [...shapeErrors];
    const attendanceKey = normalizeAttendanceCodeKey(identityCode);
    const matched = attendanceKey ? matchedByAttendance.get(attendanceKey) : undefined;

    if (parsedWithIdentity.nationalId) {
      const priorRow = seenNationalIds.get(parsedWithIdentity.nationalId);
      if (priorRow) {
        rowErrors.push(`Duplicate national ID in import file (also on row ${priorRow}).`);
      } else {
        seenNationalIds.set(parsedWithIdentity.nationalId, rowNumber);
      }
    }

    if (identityCode) {
      const priorCodeRow = seenEmployeeNumbers.get(identityCode) ?? seenAttendanceCodes.get(attendanceKey);
      if (priorCodeRow) {
        rowErrors.push(`Duplicate employee code in import file (also on row ${priorCodeRow}).`);
      } else {
        seenEmployeeNumbers.set(identityCode, rowNumber);
        seenAttendanceCodes.set(attendanceKey, rowNumber);
      }
    }

    if (rowErrors.length === 0) {
      const uniquenessIssues = await validateEmployeeUniqueness(supabase, context, {
        attendanceCode: matched ? null : (identityCode ?? null),
        employeeId: matched?.id,
        employeeNumber: matched ? null : (identityCode ?? null),
        nationalId: parsedWithIdentity.nationalId ?? null,
      });
      for (const issue of uniquenessIssues) {
        if (issue.severity === "error") rowErrors.push(issue.message);
      }
    }

    if (rowErrors.length > 0) {
      const errorRow = toPreviewErrorRow(rowNumber, rowErrors, parsedWithIdentity);
      previewRows.push(
        matched
          ? {
              ...errorRow,
              matchedEmployeeId: matched.id,
              matchedEmployeeNumber: matched.employeeNumber,
              matchedFullName: matched.fullName,
            }
          : errorRow,
      );
      continue;
    }

    if (matched) {
      previewRows.push({
        action: "update",
        attendanceCode: identityCode,
        birthDate: parsedWithIdentity.birthDate,
        email: parsedWithIdentity.email,
        employeeNumber: identityCode,
        errors: [],
        fullName: parsedWithIdentity.fullName,
        gender: parsedWithIdentity.gender,
        matchedEmployeeId: matched.id,
        matchedEmployeeNumber: matched.employeeNumber,
        matchedFullName: matched.fullName,
        nationalId: parsedWithIdentity.nationalId,
        phone: parsedWithIdentity.phone,
        row: rowNumber,
      });
      continue;
    }

    previewRows.push({
      action: "create",
      attendanceCode: identityCode,
      birthDate: parsedWithIdentity.birthDate,
      email: parsedWithIdentity.email,
      employeeNumber: identityCode,
      errors: [],
      fullName: parsedWithIdentity.fullName,
      gender: parsedWithIdentity.gender,
      nationalId: parsedWithIdentity.nationalId,
      phone: parsedWithIdentity.phone,
      row: rowNumber,
    });
  }

  return {
    rows: previewRows,
    summary: summarizePreviewRows(previewRows),
  };
}

export async function previewEmployeeImportCsv(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  csvContent: string,
): Promise<HrEmployeeImportPreviewResult> {
  const { rows } = parseEmployeeImportCsv(csvContent);
  return previewEmployeeImportRows(supabase, context, rows);
}

export async function previewEmployeeImportFile(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  content: ArrayBuffer | Buffer | Uint8Array | string,
  fileName?: string | null,
): Promise<HrEmployeeImportPreviewResult> {
  const { rows } = parseEmployeeImportFile(content, fileName);
  return previewEmployeeImportRows(supabase, context, rows);
}

export async function validateEmployeeImportRows(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  rows: readonly Record<string, string>[],
): Promise<HrEmployeeImportValidationResult> {
  const preview = await previewEmployeeImportRows(supabase, context, rows);
  const accepted: HrEmployeeImportRow[] = [];
  const rejected: HrEmployeeImportRejectedRow[] = [];

  for (const row of preview.rows) {
    if (row.action === "create") {
      accepted.push({
        attendanceCode: row.attendanceCode,
        birthDate: row.birthDate,
        email: row.email,
        employeeNumber: row.employeeNumber,
        fullName: row.fullName,
        gender: row.gender,
        nationalId: row.nationalId,
        phone: row.phone,
        row: row.row,
      });
      continue;
    }

    if (row.action === "error") {
      rejected.push({ errors: row.errors, row: row.row });
    }
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

export async function validateEmployeeImportFile(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  content: ArrayBuffer | Buffer | Uint8Array | string,
  fileName?: string | null,
): Promise<HrEmployeeImportValidationResult> {
  const { rows } = parseEmployeeImportFile(content, fileName);
  return validateEmployeeImportRows(supabase, context, rows);
}

export function previewRowsToCommitPayload(
  rows: readonly HrEmployeeImportPreviewRow[],
): readonly HrEmployeeImportCommitRow[] {
  return rows
    .filter((row) => row.action === "create" || row.action === "update")
    .map((row) => ({
      action: row.action as "create" | "update",
      attendanceCode: row.attendanceCode,
      birthDate: row.birthDate,
      email: row.email,
      employeeNumber: row.employeeNumber,
      fullName: row.fullName,
      gender: row.gender,
      matchedEmployeeId: row.matchedEmployeeId,
      nationalId: row.nationalId,
      phone: row.phone,
      row: row.row,
    }));
}

export async function revalidateCommitRows(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  rows: readonly HrEmployeeImportCommitRow[],
): Promise<HrEmployeeImportPreviewResult> {
  const asRecords = rows.map((row) => {
    const record: Record<string, string> = {
      fullName: row.fullName,
      __rowNumber: String(row.row),
    };
    if (row.attendanceCode) record.attendanceCode = row.attendanceCode;
    if (row.birthDate) record.birthDate = row.birthDate;
    if (row.email) record.email = row.email;
    if (row.employeeNumber) record.employeeNumber = row.employeeNumber;
    if (row.gender) record.gender = row.gender;
    if (row.nationalId) record.nationalId = row.nationalId;
    if (row.phone) record.phone = row.phone;
    return record;
  });

  return previewEmployeeImportRows(supabase, context, asRecords);
}

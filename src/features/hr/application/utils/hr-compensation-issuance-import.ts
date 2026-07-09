import * as XLSX from "xlsx";

export type HrCompensationIssuanceImportRow = Readonly<{
  amount: number | null;
  employeeNumber: string;
  notes: string | null;
  percentage: number | null;
  row: number;
}>;

export type HrCompensationIssuanceImportParsedRow = Readonly<{
  amount: number | null;
  employeeId: string;
  employeeLabel: string;
  employeeNumber: string;
  notes: string | null;
  percentage: number | null;
  row: number;
}>;

export type HrCompensationIssuanceImportParseResult = Readonly<{
  errors: readonly string[];
  rows: readonly HrCompensationIssuanceImportParsedRow[];
  warnings: readonly string[];
}>;

const EMPLOYEE_NUMBER_HEADERS = new Set(
  ["employee number", "employee code", "employee id", "emp no", "emp number", "code", "رقم الموظف", "كود الموظف"].map(
    normalizeHeader,
  ),
);

const AMOUNT_HEADERS = new Set(["amount", "value", "bonus", "incentive", "penalty", "المبلغ", "القيمه", "القيمة"].map(normalizeHeader));

const PERCENTAGE_HEADERS = new Set(["percentage", "percent", "pct", "النسبه", "النسبة"].map(normalizeHeader));

const NOTES_HEADERS = new Set(["notes", "note", "reason", "ملاحظات", "السبب"].map(normalizeHeader));

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

function parseAmount(raw: string | undefined): number | null {
  const normalized = String(raw ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/sar/gi, "")
    .trim();
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parsePercentage(raw: string | undefined): number | null {
  const normalized = String(raw ?? "")
    .trim()
    .replace(/%/g, "");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function sheetToMatrix(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1, raw: false }) as string[][];
}

function matrixToImportRows(matrix: readonly (readonly string[])[]): { errors: string[]; rows: HrCompensationIssuanceImportRow[] } {
  const errors: string[] = [];
  const rows: HrCompensationIssuanceImportRow[] = [];
  if (matrix.length === 0) {
    return { errors: ["Import file is empty."], rows };
  }

  const headerCells = (matrix[0] ?? []).map((cell) => normalizeHeader(String(cell ?? "")));
  const employeeNumberIndex = headerCells.findIndex((cell) => EMPLOYEE_NUMBER_HEADERS.has(cell));
  const amountIndex = headerCells.findIndex((cell) => AMOUNT_HEADERS.has(cell));
  const percentageIndex = headerCells.findIndex((cell) => PERCENTAGE_HEADERS.has(cell));
  const notesIndex = headerCells.findIndex((cell) => NOTES_HEADERS.has(cell));

  if (employeeNumberIndex < 0) {
    errors.push("Missing employee number column. Expected headers like employee_number or رقم الموظف.");
    return { errors, rows };
  }
  if (amountIndex < 0 && percentageIndex < 0) {
    errors.push("Missing amount or percentage column.");
    return { errors, rows };
  }

  const seenNumbers = new Set<string>();
  for (let index = 1; index < matrix.length; index += 1) {
    const cells = matrix[index] ?? [];
    const employeeNumber = String(cells[employeeNumberIndex] ?? "").trim();
    if (!employeeNumber) continue;

    if (seenNumbers.has(employeeNumber)) {
      errors.push(`Row ${index + 1}: duplicate employee number ${employeeNumber}.`);
      continue;
    }
    seenNumbers.add(employeeNumber);

    const amount = amountIndex >= 0 ? parseAmount(String(cells[amountIndex] ?? "")) : null;
    const percentage = percentageIndex >= 0 ? parsePercentage(String(cells[percentageIndex] ?? "")) : null;
    const notes = notesIndex >= 0 ? String(cells[notesIndex] ?? "").trim() || null : null;

    if ((amount === null || amount <= 0) && percentage === null) {
      errors.push(`Row ${index + 1}: amount or percentage is required for employee ${employeeNumber}.`);
      continue;
    }

    rows.push({
      amount: amount !== null && amount > 0 ? amount : null,
      employeeNumber,
      notes,
      percentage,
      row: index + 1,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No import rows found.");
  }

  return { errors, rows };
}

export function buildCompensationIssuanceImportTemplateCsv(locale: "ar" | "en" = "ar"): string {
  if (locale === "ar") {
    return "\uFEFFرقم الموظف,المبلغ,ملاحظات\n1001,1000,عيدية\n1002,1500,\n";
  }
  return "\uFEFFemployee_number,amount,notes\n1001,1000,Eid bonus\n1002,1500,\n";
}

export function parseCompensationIssuanceImportContent(input: Readonly<{
  buffer: ArrayBuffer;
  fileName: string;
}>): { errors: string[]; rows: HrCompensationIssuanceImportRow[] } {
  const lowerName = input.fileName.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(input.buffer).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const matrix = lines.map((line) => parseCsvLine(line));
    return matrixToImportRows(matrix);
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const matrix = sheetToMatrix(input.buffer);
    return matrixToImportRows(matrix);
  }

  return { errors: ["Unsupported file format. Upload CSV or Excel (.xlsx, .xls)."], rows: [] };
}

export function matchCompensationIssuanceImportRows(input: Readonly<{
  employees: readonly { employeeNumber: string; fullName: string; id: string }[];
  rows: readonly HrCompensationIssuanceImportRow[];
}>): HrCompensationIssuanceImportParseResult {
  const employeeByNumber = new Map(input.employees.map((employee) => [employee.employeeNumber.trim(), employee]));
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed: HrCompensationIssuanceImportParsedRow[] = [];

  for (const row of input.rows) {
    const employee = employeeByNumber.get(row.employeeNumber.trim());
    if (!employee) {
      errors.push(`Row ${row.row}: employee number ${row.employeeNumber} was not found.`);
      continue;
    }

    parsed.push({
      amount: row.amount,
      employeeId: employee.id,
      employeeLabel: `${employee.fullName} (${employee.employeeNumber})`,
      employeeNumber: employee.employeeNumber,
      notes: row.notes,
      percentage: row.percentage,
      row: row.row,
    });
  }

  if (parsed.length > 2000) {
    errors.push("Import exceeds maximum of 2000 rows.");
  }

  const duplicateIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const row of parsed) {
    if (seenIds.has(row.employeeId)) duplicateIds.add(row.employeeId);
    seenIds.add(row.employeeId);
  }
  if (duplicateIds.size > 0) {
    warnings.push(`${duplicateIds.size} duplicate employee(s) detected after matching.`);
  }

  return { errors, rows: parsed, warnings };
}

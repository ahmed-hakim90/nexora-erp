import * as XLSX from "xlsx";

export type ZktecoCsvParsedPunch = Readonly<{
  attendanceCode: string;
  deviceCode: string;
  employeeName?: string;
  punchTime: string;
  punchType: "in" | "out";
  row: number;
}>;

export type ZktecoCsvParseResult = Readonly<{
  errors: readonly string[];
  format: "zkteco" | "generic";
  punches: readonly ZktecoCsvParsedPunch[];
  warnings: readonly string[];
}>;

type ParsedRow = Readonly<{
  attendanceCode?: string;
  dateTime?: string;
  dateValue?: string;
  deviceCode?: string;
  employeeName?: string;
  punchType?: "in" | "out";
  row: number;
  statusRaw?: string;
  timeValue?: string;
}>;

const USER_ID_HEADERS = new Set(
  [
    "user id",
    "userid",
    "pin",
    "no",
    "no.",
    "ac no",
    "ac-no",
    "employee id",
    "employee number",
    "badge",
    "enroll number",
    "enroll no",
    "رقم الموظف",
    "الرقم",
    "رقم البصمه",
    "رقم البصمة",
  ].map(normalizeHeader),
);

const NAME_HEADERS = new Set(
  ["name", "employee name", "user name", "full name", "الاسم", "اسم الموظف"].map(normalizeHeader),
);

const DATE_HEADERS = new Set(["date", "work date", "التاريخ"].map(normalizeHeader));

const TIME_HEADERS = new Set(["time", "punch time", "الوقت"].map(normalizeHeader));

const DATETIME_HEADERS = new Set(
  ["date/time", "datetime", "date time", "timestamp", "punch datetime", "التاريخ والوقت"].map(normalizeHeader),
);

const STATUS_HEADERS = new Set(
  ["status", "state", "in/out", "type", "punch state", "attendance status", "الحالة", "الحاله"].map(normalizeHeader),
);

const DEVICE_HEADERS = new Set(
  ["device", "device id", "device name", "terminal", "machine", "الجهاز"].map(normalizeHeader),
);

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

function normalizeCell(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapStatusToPunchType(value: string | undefined): "in" | "out" | undefined {
  if (!value) return undefined;
  const normalized = normalizeHeader(value);
  if (
    ["check in", "checkin", "in", "c in", "cin", "0", "i", "دخول", "حضور", "break in", "breakin"].includes(normalized)
  ) {
    return normalized.includes("break") ? "in" : "in";
  }
  if (
    ["check out", "checkout", "out", "c out", "cout", "1", "o", "خروج", "انصراف", "break out", "breakout"].includes(
      normalized,
    )
  ) {
    return "out";
  }
  return undefined;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoFromParts(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseDateTimeValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoCandidate = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const direct = new Date(isoCandidate);
  if (!Number.isNaN(direct.getTime()) && /\d{4}/.test(trimmed)) {
    return direct.toISOString();
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (slashMatch) {
    const [, part1, part2, yearPart, hour = "0", minute = "0", secondPart = "0"] = slashMatch;
    let year = Number(yearPart);
    if (year < 100) year += 2000;
    const first = Number(part1);
    const dayPart = Number(part2);
    const month = first > 12 ? dayPart : first;
    const day = first > 12 ? first : dayPart;
    return toIsoFromParts(year, month, day, Number(hour), Number(minute), Number(secondPart));
  }

  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dashMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = dashMatch;
    return toIsoFromParts(Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second));
  }

  return null;
}

function combineDateAndTime(dateValue: string, timeValue: string): string | null {
  const dateOnly = dateValue.trim();
  const timeOnly = timeValue.trim();
  if (!dateOnly || !timeOnly) return null;
  return parseDateTimeValue(`${dateOnly} ${timeOnly}`);
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) return "\t";
  if (semicolonCount > commaCount) return ";";
  return ",";
}

function splitDelimitedLine(line: string, delimiter: "," | ";" | "\t"): string[] {
  if (delimiter === ",") return parseCsvLine(line);
  return line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ""));
}

function resolveHeaderIndexes(headers: readonly string[]) {
  const normalized = headers.map(normalizeHeader);
  const find = (candidates: ReadonlySet<string>) => normalized.findIndex((header) => candidates.has(header));

  return {
    attendanceCode: find(USER_ID_HEADERS),
    dateTime: find(DATETIME_HEADERS),
    dateValue: find(DATE_HEADERS),
    deviceCode: find(DEVICE_HEADERS),
    employeeName: find(NAME_HEADERS),
    punchType: find(STATUS_HEADERS),
    timeValue: find(TIME_HEADERS),
  };
}

function parseRowsFromCsvText(csvText: string): { headers: string[]; rows: string[][] } {
  const normalizedText = csvText.replace(/^\uFEFF/, "").trim();
  if (!normalizedText) return { headers: [], rows: [] };

  const lines = normalizedText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = splitDelimitedLine(lines[0] ?? "", delimiter);
  const rows = lines.slice(1).map((line) => splitDelimitedLine(line, delimiter));
  return { headers, rows };
}

export function readAttendanceImportFileToCsvText(input: Readonly<{ buffer: ArrayBuffer; fileName: string }>): string {
  const lowerName = input.fileName.toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(input.buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return "";
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }

  const decoder = new TextDecoder("utf-8");
  return decoder.decode(input.buffer).replace(/^\uFEFF/, "");
}

function parseStructuredRows(
  headers: readonly string[],
  rows: readonly string[][],
  defaultDeviceCode: string,
): { parsedRows: ParsedRow[]; errors: string[]; warnings: string[] } {
  const indexes = resolveHeaderIndexes(headers);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (indexes.attendanceCode < 0) {
    errors.push("Could not find an employee/user ID column. Expected headers like User ID, PIN, or No.");
    return { errors, parsedRows: [], warnings };
  }

  if (indexes.dateTime < 0 && (indexes.dateValue < 0 || indexes.timeValue < 0)) {
    errors.push("Could not find punch time columns. Expected Date/Time or separate Date and Time columns.");
    return { errors, parsedRows: [], warnings };
  }

  const parsedRows: ParsedRow[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const rowNumber = index + 2;
    const attendanceCode = normalizeCell(row[indexes.attendanceCode]);
    if (!attendanceCode) continue;

    const employeeName = indexes.employeeName >= 0 ? normalizeCell(row[indexes.employeeName]) : undefined;
    const deviceCode =
      indexes.deviceCode >= 0 ? normalizeCell(row[indexes.deviceCode]) ?? defaultDeviceCode : defaultDeviceCode;
    const statusRaw = indexes.punchType >= 0 ? normalizeCell(row[indexes.punchType]) : undefined;
    const explicitType = mapStatusToPunchType(statusRaw);

    let punchTime: string | null = null;
    if (indexes.dateTime >= 0) {
      const rawDateTime = normalizeCell(row[indexes.dateTime]);
      punchTime = rawDateTime ? parseDateTimeValue(rawDateTime) : null;
    } else {
      const dateValue = indexes.dateValue >= 0 ? normalizeCell(row[indexes.dateValue]) : undefined;
      const timeValue = indexes.timeValue >= 0 ? normalizeCell(row[indexes.timeValue]) : undefined;
      punchTime = dateValue && timeValue ? combineDateAndTime(dateValue, timeValue) : null;
    }

    if (!punchTime) {
      errors.push(`Row ${rowNumber}: could not parse punch time for employee ${attendanceCode}.`);
      continue;
    }

    parsedRows.push({
      attendanceCode,
      dateTime: punchTime,
      deviceCode,
      employeeName,
      punchType: explicitType,
      row: rowNumber,
      statusRaw,
    });
  }

  if (parsedRows.length === 0 && errors.length === 0) {
    warnings.push("No punch rows were found in the uploaded file.");
  }

  return { errors, parsedRows, warnings };
}

function assignAlternatingPunchTypes(rows: readonly ParsedRow[]): ZktecoCsvParsedPunch[] {
  const punchIndexByUserDay = new Map<string, number>();
  const punches: ZktecoCsvParsedPunch[] = [];

  for (const row of rows) {
    if (!row.dateTime) continue;
    const day = row.dateTime.slice(0, 10);
    const key = `${row.attendanceCode}::${day}`;
    const index = punchIndexByUserDay.get(key) ?? 0;
    punchIndexByUserDay.set(key, index + 1);
    const punchType = row.punchType ?? (index % 2 === 0 ? "in" : "out");

    punches.push({
      attendanceCode: row.attendanceCode!,
      deviceCode: row.deviceCode ?? "CSV-IMPORT",
      employeeName: row.employeeName,
      punchTime: row.dateTime,
      punchType,
      row: row.row,
    });
  }

  return punches;
}

export function parseZktecoAttendanceCsv(csvText: string, defaultDeviceCode = "CSV-IMPORT"): ZktecoCsvParseResult {
  const { headers, rows } = parseRowsFromCsvText(csvText);
  if (headers.length === 0) {
    return {
      errors: ["The uploaded file is empty."],
      format: "generic",
      punches: [],
      warnings: [],
    };
  }

  const { errors, parsedRows, warnings } = parseStructuredRows(headers, rows, defaultDeviceCode);
  if (errors.length > 0 && parsedRows.length === 0) {
    return {
      errors,
      format: "zkteco",
      punches: [],
      warnings,
    };
  }

  const punches = assignAlternatingPunchTypes(parsedRows);
  const unresolvedStatusCount = parsedRows.filter((row) => !row.punchType && !row.statusRaw).length;
  const nextWarnings = [...warnings];
  if (unresolvedStatusCount > 0) {
    nextWarnings.push(
      `${unresolvedStatusCount} punch row(s) had no check-in/check-out status. Alternating in/out was applied per employee per day.`,
    );
  }

  return {
    errors,
    format: "zkteco",
    punches,
    warnings: nextWarnings,
  };
}

export function buildZktecoCsvImportTemplate(): string {
  return "\uFEFFUser ID,Name,Date,Time,Status,Device\n1,Sample Employee,2026-07-08,08:00:00,Check In,Main Gate\n1,Sample Employee,2026-07-08,17:00:00,Check Out,Main Gate\n";
}

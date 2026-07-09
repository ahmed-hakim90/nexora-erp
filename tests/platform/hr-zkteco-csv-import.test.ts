import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildZktecoCsvImportTemplate,
  parseZktecoAttendanceCsv,
  readAttendanceImportFileToCsvText,
} from "@/features/hr/application/utils/hr-zkteco-csv-import";

describe("ZKTeco CSV attendance import", () => {
  it("parses standard ZKT export columns with separate date and time", () => {
    const csv = `User ID,Name,Date,Time,Status,Device
12,Ahmed Ali,2026-07-08,08:02:15,Check In,Gate A
12,Ahmed Ali,2026-07-08,17:05:00,Check Out,Gate A`;

    const result = parseZktecoAttendanceCsv(csv, "GATE-A");
    assert.equal(result.errors.length, 0);
    assert.equal(result.punches.length, 2);
    assert.equal(result.punches[0]?.attendanceCode, "12");
    assert.equal(result.punches[0]?.punchType, "in");
    assert.equal(result.punches[1]?.punchType, "out");
    assert.equal(result.punches[0]?.deviceCode, "Gate A");
  });

  it("parses combined Date/Time column from ZKTime export", () => {
    const csv = `No.,Name,Date/Time,Status
7,Sara Hassan,2026-07-08 08:10:00,Check In
7,Sara Hassan,2026-07-08 16:45:00,Check Out`;

    const result = parseZktecoAttendanceCsv(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.punches.length, 2);
    assert.equal(result.punches[0]?.employeeName, "Sara Hassan");
    assert.equal(result.punches[0]?.punchType, "in");
  });

  it("alternates in/out when status column is missing", () => {
    const csv = `PIN,Name,Date,Time
3,Karim,08/07/2026,08:00:00
3,Karim,08/07/2026,17:00:00`;

    const result = parseZktecoAttendanceCsv(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.punches.length, 2);
    assert.equal(result.punches[0]?.punchType, "in");
    assert.equal(result.punches[1]?.punchType, "out");
    assert.equal(result.warnings.some((warning) => warning.includes("Alternating in/out")), true);
  });

  it("returns a helpful error when required columns are missing", () => {
    const result = parseZktecoAttendanceCsv("Name,Status\nJohn,Check In");
    assert.equal(result.punches.length, 0);
    assert.equal(result.errors.length > 0, true);
  });

  it("builds a downloadable template with UTF-8 BOM", () => {
    const template = buildZktecoCsvImportTemplate();
    assert.equal(template.startsWith("\uFEFF"), true);
    assert.match(template, /User ID,Name,Date,Time,Status,Device/);
  });

  it("reads xlsx buffers through the shared converter", () => {
    const csv = readAttendanceImportFileToCsvText({
      buffer: new TextEncoder().encode("User ID,Date,Time,Status\n1,2026-07-08,08:00:00,Check In").buffer,
      fileName: "attendance.csv",
    });
    assert.match(csv, /User ID/);
  });
});

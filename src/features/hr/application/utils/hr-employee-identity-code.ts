/**
 * Business rule: the operator-entered employee job code is also the attendance device code.
 * Keep both DB columns populated with the same value so device sync / punch matching stay aligned.
 */
export function resolveEmployeeAttendanceCode(employeeNumber: string | null | undefined): string | null {
  const trimmed = (employeeNumber ?? "").trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

/**
 * Prefer explicit employee number; otherwise treat attendance code from imports/sheets as the job code.
 */
export function resolveEmployeeIdentityCode(input: {
  attendanceCode?: string | null;
  employeeNumber?: string | null;
}): string | null {
  const fromEmployee = (input.employeeNumber ?? "").trim();
  if (fromEmployee) return fromEmployee.toUpperCase();
  const fromAttendance = (input.attendanceCode ?? "").trim();
  if (fromAttendance) return fromAttendance.toUpperCase();
  return null;
}

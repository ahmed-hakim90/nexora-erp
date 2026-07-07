export type HrResolvedAssignment = Readonly<{
  assignmentId: string;
  assignmentType: string;
  assignmentScope: string;
  assignmentStatus: string;
  referenceEntityId: string;
  referenceEntityType: string;
  label: string;
  subtitle?: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}>;

export type HrEmployeeAssignmentSnapshot = Readonly<{
  employeeId: string;
  asOfDate: string;
  position: HrResolvedAssignment | null;
  department: HrResolvedAssignment | null;
  section: HrResolvedAssignment | null;
  team: HrResolvedAssignment | null;
  manager: HrResolvedAssignment | null;
  grade: HrResolvedAssignment | null;
  workLocation: HrResolvedAssignment | null;
  shift: HrResolvedAssignment | null;
  payrollGroup: HrResolvedAssignment | null;
  costCenter: HrResolvedAssignment | null;
  branchLabel: string | null;
  payrollGroupLabel: string | null;
}>;

export type HrEmployeeListRow = Readonly<{
  id: string;
  employeeNumber: string;
  attendanceCode: string | null;
  fullName: string;
  status: string;
  branchId: string | null;
  branchLabel: string | null;
  photoFileId: string | null;
  nationalId: string | null;
  email: string | null;
  phone: string | null;
  employmentStatus: string;
  contractStatus: string | null;
  assignment: HrEmployeeAssignmentSnapshot;
}>;

export type HrDashboardMetrics = Readonly<{
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  onProbation: number;
  contractsExpiringSoon: number;
  documentsExpiringSoon: number;
  pendingHrRequests: number;
  pendingApprovals: number;
  openVacancies: number;
  payrollReadinessIssues: number;
}>;

export type HrTimelineEntry = Readonly<{
  id: string;
  eventType: string;
  occurredAt: string;
  label: string;
  sourceDocumentType: string | null;
}>;

export type HrAssignmentConflict = Readonly<{
  code: string;
  message: string;
  severity: "warning" | "error";
}>;

export type HrPayrollReadinessSummary = Readonly<{
  payrollRuns: number;
  payrollResults: number;
  payslips: number;
  publishedPayslips: number;
  draftPayslipsHidden: number;
  validationIssues: number;
  exceptions: number;
}>;

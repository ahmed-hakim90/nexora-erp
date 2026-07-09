/**
 * HR Production Readiness Foundation v1.0
 *
 * Documents and defines the concrete print templates, notifications,
 * bulk operations, validation rules, import/export formats, and search
 * contributions required for the HR module to be production-ready.
 *
 * These are readiness contracts — not runtime handlers.
 * Platform integrations (print engine, notification service, etc.) are
 * wired separately at the manifest level.
 */

// ─── Print Template Keys ──────────────────────────────────────────────────────

export const HR_PRINT_TEMPLATE_KEYS = {
  assignmentLetter: "hr.assignment_letter",
  contract: "hr.contract",
  custodyReceipt: "hr.custody_receipt",
  documentChecklist: "hr.document_checklist",
  employeeCard: "hr.employee_card",
  employeeCertificate: "hr.employment_certificate",
  employeeProfile: "hr.employee_profile",
  leaveSummary: "hr.leave_summary",
  orgChart: "hr.org_chart",
  salaryLetter: "hr.salary_letter",
} as const;

export type HrPrintTemplateKey = (typeof HR_PRINT_TEMPLATE_KEYS)[keyof typeof HR_PRINT_TEMPLATE_KEYS];

export const HR_PRINT_TEMPLATE_DEFINITIONS = [
  {
    description: "Full employee profile with personal, employment, assignment, and emergency contact information.",
    key: HR_PRINT_TEMPLATE_KEYS.employeeProfile,
    label: "Employee Profile",
    paperSize: "A4" as const,
    sensitiveData: "restricted" as const,
  },
  {
    description: "Employment contract with terms, compensation, and signature blocks.",
    key: HR_PRINT_TEMPLATE_KEYS.contract,
    label: "Employment Contract",
    paperSize: "A4" as const,
    sensitiveData: "restricted" as const,
  },
  {
    description: "Official assignment or transfer letter for the employee.",
    key: HR_PRINT_TEMPLATE_KEYS.assignmentLetter,
    label: "Assignment Letter",
    paperSize: "A4" as const,
    sensitiveData: "restricted" as const,
  },
  {
    description: "Official salary confirmation letter for external use (banks, embassies, etc.).",
    key: HR_PRINT_TEMPLATE_KEYS.salaryLetter,
    label: "Salary Letter",
    paperSize: "A4" as const,
    sensitiveData: "payroll" as const,
  },
  {
    description: "Employment certificate confirming employment status and duration.",
    key: HR_PRINT_TEMPLATE_KEYS.employeeCertificate,
    label: "Employment Certificate",
    paperSize: "A4" as const,
    sensitiveData: "restricted" as const,
  },
  {
    description: "Employee ID card template with photo, name, title, and company logo.",
    key: HR_PRINT_TEMPLATE_KEYS.employeeCard,
    label: "Employee ID Card",
    paperSize: "custom" as const,
    sensitiveData: "internal" as const,
  },
  {
    description: "Custody assignment receipt for employee signature on asset handover.",
    key: HR_PRINT_TEMPLATE_KEYS.custodyReceipt,
    label: "Custody Receipt",
    paperSize: "A4" as const,
    sensitiveData: "internal" as const,
  },
  {
    description: "Required document checklist for onboarding, contract renewal, or clearance.",
    key: HR_PRINT_TEMPLATE_KEYS.documentChecklist,
    label: "Document Checklist",
    paperSize: "A4" as const,
    sensitiveData: "internal" as const,
  },
  {
    description: "Annual leave summary with balances, taken, and remaining days.",
    key: HR_PRINT_TEMPLATE_KEYS.leaveSummary,
    label: "Leave Summary",
    paperSize: "A4" as const,
    sensitiveData: "internal" as const,
  },
  {
    description: "Visual organization chart for a department or the full company.",
    key: HR_PRINT_TEMPLATE_KEYS.orgChart,
    label: "Organization Chart",
    paperSize: "A3" as const,
    sensitiveData: "internal" as const,
  },
] as const;

// ─── Notification Trigger Definitions ────────────────────────────────────────

export const HR_NOTIFICATION_EVENT_KEYS = {
  actionRequestSubmitted: "hr.action_request.submitted",
  assignmentChanged: "hr.assignment.changed",
  birthdayFired: "hr.employee.birthday",
  contractExpiryApproaching: "hr.contract.expiry_approaching",
  documentExpiryApproaching: "hr.document.expiry_approaching",
  leaveDecisionMade: "hr.leave.decision_made",
  payrollReadinessBlocked: "hr.payroll.readiness_blocked",
  probationEndingSoon: "hr.probation.ending_soon",
  workAnniversary: "hr.employee.work_anniversary",
} as const;

export type HrNotificationEventKey = (typeof HR_NOTIFICATION_EVENT_KEYS)[keyof typeof HR_NOTIFICATION_EVENT_KEYS];

export const HR_NOTIFICATION_TRIGGER_DEFINITIONS = [
  {
    description: "Fired when an employee contract is within 60 days of expiry.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.contractExpiryApproaching,
    label: "Contract Expiry Approaching",
    recipients: ["hr_manager", "employee_manager", "employee"] as const,
    severity: "warning" as const,
    thresholdDays: 60,
  },
  {
    description: "Fired when an employee document (passport, ID, permit) is within 30 days of expiry.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.documentExpiryApproaching,
    label: "Document Expiry Approaching",
    recipients: ["hr_manager", "employee"] as const,
    severity: "warning" as const,
    thresholdDays: 30,
  },
  {
    description: "Fired when an employee probation period is ending within 14 days.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.probationEndingSoon,
    label: "Probation Period Ending",
    recipients: ["hr_manager", "employee_manager"] as const,
    severity: "info" as const,
    thresholdDays: 14,
  },
  {
    description: "Fired on the employee's birthday.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.birthdayFired,
    label: "Employee Birthday",
    recipients: ["hr_manager", "employee_manager"] as const,
    severity: "info" as const,
    thresholdDays: 0,
  },
  {
    description: "Fired on the employee's work anniversary.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.workAnniversary,
    label: "Work Anniversary",
    recipients: ["hr_manager", "employee_manager", "employee"] as const,
    severity: "info" as const,
    thresholdDays: 0,
  },
  {
    description: "Fired when an assignment (transfer, promotion, acting) is applied to an employee.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.assignmentChanged,
    label: "Assignment Changed",
    recipients: ["employee", "employee_manager", "hr_manager"] as const,
    severity: "info" as const,
    thresholdDays: 0,
  },
  {
    description: "Fired when a leave request is approved or rejected.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.leaveDecisionMade,
    label: "Leave Request Decision",
    recipients: ["employee"] as const,
    severity: "info" as const,
    thresholdDays: 0,
  },
  {
    description: "Fired when payroll readiness validation finds blocking issues.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.payrollReadinessBlocked,
    label: "Payroll Readiness Blocked",
    recipients: ["payroll_manager", "hr_manager"] as const,
    severity: "error" as const,
    thresholdDays: 0,
  },
  {
    description: "Fired when an HR action request (transfer, promotion, etc.) is submitted for approval.",
    eventKey: HR_NOTIFICATION_EVENT_KEYS.actionRequestSubmitted,
    label: "HR Action Request Submitted",
    recipients: ["hr_manager", "approval_chain"] as const,
    severity: "info" as const,
    thresholdDays: 0,
  },
] as const;

// ─── Bulk Operation Definitions ───────────────────────────────────────────────

export const HR_BULK_OPERATION_DEFINITIONS = {
  assignments: [
    { label: "Export assignment history (Excel)", permission: "hr.import-export.manage", value: "export_excel" },
    { label: "Print assignment letters (batch)", permission: "hr.assignments.view", value: "print_assignment_letters" },
  ],
  contracts: [
    { label: "Export selected contracts (Excel)", permission: "hr.import-export.manage", value: "export_excel" },
    { label: "Print selected contracts", permission: "hr.contracts.view", value: "print_contracts" },
    { label: "Archive expired contracts", permission: "hr.contracts.manage", value: "archive_expired" },
  ],
  documents: [
    { label: "Export document list (Excel)", permission: "hr.import-export.manage", value: "export_excel" },
    { label: "Archive selected documents", permission: "hr.employees.manage", value: "archive_documents" },
    { label: "Print document checklist", permission: "hr.employees.view", value: "print_checklist" },
  ],
  employees: [
    { label: "Export selected employees (Excel)", permission: "hr.import-export.manage", value: "export_excel" },
    { label: "Export selected employees (CSV)", permission: "hr.import-export.manage", value: "export_csv" },
    { label: "Print employee profiles", permission: "hr.employees.view", value: "print_profiles" },
    { label: "Print employee ID cards", permission: "hr.employees.view", value: "print_id_cards" },
    { label: "Archive selected employees", permission: "hr.employees.manage", value: "archive" },
    { label: "Activate selected employees", permission: "hr.employees.manage", value: "activate" },
  ],
  requests: [
    { label: "Export requests (Excel)", permission: "hr.import-export.manage", value: "export_excel" },
    { label: "Bulk approve selected requests", permission: "hr.actions.approve", value: "bulk_approve" },
    { label: "Bulk reject selected requests", permission: "hr.actions.approve", value: "bulk_reject" },
  ],
  financial: [
    { label: "Bulk issue bonuses", permission: "hr.compensation.manage", value: "bulk_issue_bonus" },
    { label: "Bulk issue incentives", permission: "hr.compensation.manage", value: "bulk_issue_incentive" },
    { label: "Bulk issue penalties", permission: "hr.compensation.manage", value: "bulk_issue_penalty" },
    { label: "Export compensation batch", permission: "hr.import-export.manage", value: "export_batch" },
  ],
} as const;

// ─── Export Column Definitions ────────────────────────────────────────────────

export const HR_EMPLOYEE_EXPORT_COLUMNS = [
  { field: "employeeNumber", label: "Employee Code", order: 1 },
  { field: "fullName", label: "Full Name", order: 2, pii: true },
  { field: "nationalId", label: "National ID", order: 3, pii: true },
  { field: "employmentStatus", label: "Status", order: 4 },
  { field: "department", label: "Department", order: 5 },
  { field: "position", label: "Position", order: 6 },
  { field: "manager", label: "Manager", order: 7 },
  { field: "contractStatus", label: "Contract Status", order: 8 },
  { field: "email", label: "Email", order: 9, pii: true },
  { field: "phone", label: "Phone", order: 10, pii: true },
  { field: "branchLabel", label: "Branch", order: 11 },
] as const;

export const HR_EMPLOYEE_IMPORT_COLUMNS = [
  {
    aliases: ["الاسم بالكامل", "الاسم الكامل", "الاسم", "full name", "name"],
    field: "fullName",
    label: "Full Name",
    labelAr: "الاسم بالكامل",
    required: true,
  },
  {
    // One operator-facing code: job code = attendance/device code. Legacy sheet headers still parse.
    aliases: [
      "الرقم الوظيفي",
      "رقم الموظف",
      "كود الموظف",
      "كود الحضور",
      "كود البصمة",
      "رقم البصمة",
      "employee number",
      "employee code",
      "emp number",
      "employee no",
      "attendance code",
      "fingerprint code",
      "badge code",
    ],
    field: "employeeNumber",
    label: "Employee Code",
    labelAr: "كود الموظف",
    required: false,
  },
  {
    aliases: ["الرقم القومي", "رقم الهوية", "رقم البطاقة", "national id", "nationality id", "nid"],
    field: "nationalId",
    label: "National ID",
    labelAr: "الرقم القومي",
    required: false,
  },
  {
    aliases: ["النوع", "الجنس", "gender", "sex"],
    field: "gender",
    label: "Gender",
    labelAr: "النوع",
    required: false,
  },
  {
    aliases: ["تاريخ الميلاد", "تاريخ الميلاد (يوم/شهر/سنة)", "birth date", "birth date (yyyy-mm-dd)", "date of birth", "dob"],
    field: "birthDate",
    label: "Birth Date (YYYY-MM-DD)",
    labelAr: "تاريخ الميلاد",
    required: false,
  },
  {
    aliases: ["الهاتف", "الموبايل", "الجوال", "رقم التليفون", "رقم الهاتف", "phone", "mobile", "tel"],
    field: "phone",
    label: "Phone",
    labelAr: "الهاتف",
    required: false,
  },
  {
    aliases: ["البريد الإلكتروني", "البريد الالكتروني", "الإيميل", "الايميل", "email", "e-mail"],
    field: "email",
    label: "Email",
    labelAr: "البريد الإلكتروني",
    required: false,
  },
] as const;

/** Accepted sheet values for gender → stored enum (English). */
export const HR_EMPLOYEE_IMPORT_GENDER_ALIASES = {
  female: ["female", "f", "أنثى", "انثى", "انثي", "نثى", "ست"],
  male: ["male", "m", "ذكر", "رجل"],
  other: ["other", "أخرى", "اخرى", "أخرى / غير ذلك"],
  undisclosed: ["undisclosed", "غير محدد", "غير مفصح", "غير معروف"],
} as const;

export const HR_EMPLOYEE_IMPORT_VALIDATION_RULES = [
  "Full name is required.",
  "National ID must be unique per company.",
  "Employee code (also used as attendance code) must be unique per company (case-insensitive).",
  "Birth date must be in YYYY-MM-DD format.",
  "Email must be a valid email address if provided.",
  "Gender accepts Arabic or English: ذكر/أنثى or male/female.",
] as const;

// ─── Search Provider Definitions ──────────────────────────────────────────────

export const HR_SEARCH_ENTITY_PROVIDERS = [
  {
    description: "Search employees by name, employee number, attendance code, national ID, email, or phone.",
    entityType: "hr_employee" as const,
    fields: ["fullName", "employeeNumber", "attendanceCode", "nationalId", "email", "phone"] as const,
    key: "hr.employees.search",
    label: "Employees",
    permission: "hr.employees.view",
  },
  {
    description: "Search employee contracts by contract number or employee name.",
    entityType: "hr_contract" as const,
    fields: ["contractNumber", "employeeName"] as const,
    key: "hr.contracts.search",
    label: "Contracts",
    permission: "hr.contracts.view",
  },
  {
    description: "Search assignment records by employee name, position, or department.",
    entityType: "hr_assignment" as const,
    fields: ["employeeName", "positionLabel", "departmentLabel"] as const,
    key: "hr.assignments.search",
    label: "Assignments",
    permission: "hr.assignments.view",
  },
  {
    description: "Search positions and jobs by title, code, or department.",
    entityType: "hr_position" as const,
    fields: ["title", "code", "departmentLabel"] as const,
    key: "hr.positions.search",
    label: "Positions & Jobs",
    permission: "hr.positions.view",
  },
  {
    description: "Search employee documents by file name, type, or employee.",
    entityType: "hr_employee_document" as const,
    fields: ["fileName", "documentType", "employeeName"] as const,
    key: "hr.documents.search",
    label: "Employee Documents",
    permission: "hr.employees.view",
  },
  {
    description: "Search HR action requests by request number, type, or employee.",
    entityType: "hr_action_request" as const,
    fields: ["documentNumber", "actionType", "employeeName"] as const,
    key: "hr.requests.search",
    label: "HR Requests",
    permission: "hr.actions.view",
  },
  {
    description: "Search leave requests by employee name, status, or leave dates.",
    entityType: "hr_leave_request" as const,
    fields: ["employeeName", "status", "startsOn", "endsOn"] as const,
    key: "hr.leave.search",
    label: "Leave Requests",
    permission: "hr.leave.view",
  },
  {
    description: "Search overtime candidates by employee name, work date, or status.",
    entityType: "hr_overtime_candidate" as const,
    fields: ["employeeName", "workDate", "status"] as const,
    key: "hr.overtime.search",
    label: "Overtime Candidates",
    permission: "hr.overtime.view",
  },
  {
    description: "Search late/early violations by employee name, violation kind, or status.",
    entityType: "hr_late_early_violation" as const,
    fields: ["employeeName", "violationKind", "status"] as const,
    key: "hr.late-early.search",
    label: "Late / Early Violations",
    permission: "hr.late.view",
  },
] as const;

// ─── Validation Rule Definitions ──────────────────────────────────────────────

export const HR_PRODUCTION_VALIDATION_RULES = {
  assignment: [
    { code: "assignment_overlap", message: "An active assignment of this type already exists for the same effective period.", severity: "error" as const },
    { code: "missing_reference", message: "A reference entity (position, department, or manager) is required.", severity: "error" as const },
    { code: "self_manager", message: "An employee cannot be assigned as their own manager.", severity: "error" as const },
    { code: "circular_manager", message: "This assignment would create a circular management hierarchy.", severity: "error" as const },
    { code: "future_effective_date_info", message: "For future assignments, the effective date must be in the future.", severity: "info" as const },
  ],
  contract: [
    { code: "contract_date_overlap", message: "This employee already has an active contract that overlaps with the selected dates.", severity: "error" as const },
    { code: "ends_before_starts", message: "Contract end date must be after the start date.", severity: "error" as const },
    { code: "missing_employee", message: "A valid employee must be selected.", severity: "error" as const },
    { code: "invalid_contract_type", message: "Contract type is required.", severity: "error" as const },
  ],
  employee: [
    { code: "duplicate_national_id", message: "An employee with this national ID already exists in this company.", severity: "error" as const },
    { code: "duplicate_employee_code", message: "An employee with this employee number already exists.", severity: "error" as const },
    { code: "duplicate_attendance_code", message: "This attendance code is already assigned to another employee.", severity: "error" as const },
    { code: "invalid_birth_date", message: "Birth date must be a valid date in the past.", severity: "error" as const },
    { code: "underage_employee", message: "Employee must be at least 16 years old.", severity: "warning" as const },
    { code: "missing_national_id", message: "National ID is required for payroll processing.", severity: "warning" as const },
    { code: "missing_contact", message: "At least one contact method (email or phone) is required.", severity: "warning" as const },
  ],
  payrollReadiness: [
    { code: "missing_bank_details", message: "Bank account details are required for payroll processing.", severity: "error" as const },
    { code: "missing_compensation", message: "Assign a salary package or set basic salary on the employee profile.", severity: "error" as const },
    { code: "basic_salary_source_conflict", message: "Basic salary is defined in both the employee profile and the salary package.", severity: "error" as const },
    { code: "missing_payroll_group", message: "Employee is not assigned to a payroll group.", severity: "error" as const },
    { code: "missing_contract", message: "No active contract found for this employee.", severity: "error" as const },
    { code: "expired_document", message: "One or more required documents have expired.", severity: "warning" as const },
  ],
} as const;

// ─── Report Definitions ───────────────────────────────────────────────────────

export const HR_PRODUCTION_REPORT_DEFINITIONS = [
  {
    description: "Active employees with assignment-resolved department, position, and manager context.",
    exportFormats: ["xlsx", "csv", "pdf"] as const,
    filters: ["status", "department", "position", "branch", "contract_status"] as const,
    key: "hr.report.employee_directory",
    label: "Employee Directory Report",
    permission: "hr.reports.view",
  },
  {
    description: "Contracts expiring within a configurable window (default: 60 days).",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["expiry_window_days", "department", "contract_type"] as const,
    key: "hr.report.contract_expiry",
    label: "Contract Expiry Report",
    permission: "hr.reports.view",
  },
  {
    description: "Employee documents with expiry status and upcoming expiry alerts.",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["document_type", "expiry_status", "department"] as const,
    key: "hr.report.document_expiry",
    label: "Document Expiry Report",
    permission: "hr.reports.view",
  },
  {
    description: "Payroll readiness issues by employee, with severity and resolution guidance.",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["severity", "issue_type", "department"] as const,
    key: "hr.report.payroll_readiness",
    label: "Payroll Readiness Exception Report",
    permission: "hr.reports.view",
  },
  {
    description: "Leave balance and usage summary per employee for the selected period.",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["period", "department", "leave_type"] as const,
    key: "hr.report.leave_balance",
    label: "Leave Balance Report",
    permission: "hr.reports.view",
  },
  {
    description: "Headcount by department, position, and employment status.",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["as_of_date", "department", "position"] as const,
    key: "hr.report.headcount",
    label: "Headcount Report",
    permission: "hr.reports.view",
  },
  {
    description: "Custody (asset) assignment report with current holders and condition.",
    exportFormats: ["xlsx", "pdf"] as const,
    filters: ["asset_type", "department", "condition"] as const,
    key: "hr.report.custody",
    label: "Custody Report",
    permission: "hr.reports.view",
  },
] as const;

// ─── Security Scope Rules ─────────────────────────────────────────────────────

export const HR_PRODUCTION_SECURITY_SCOPE_RULES = {
  compensationVisibility: [
    "Compensation data is restricted to hr.compensation.view permission.",
    "Employees with hr.payslips.view_self can see only their own payslip (not others).",
    "Managers with hr.payroll.view can see their team payroll status but not raw figures.",
    "Payroll-sensitive fields are hidden unless hr.payroll_snapshots.view is granted.",
  ] as const,
  documentAccess: [
    "Documents are scoped to tenant and company by RLS.",
    "Employees can access only their own documents unless hr.employees.view is granted.",
    "Archive and delete operations require hr.employees.manage.",
  ] as const,
  employeeDataAccess: [
    "Employee records are tenant+company scoped via RLS.",
    "National ID, birth date, and salary are restricted fields.",
    "Export and import require hr.import-export.manage.",
    "Bulk archive requires hr.employees.manage.",
  ] as const,
  requestApproval: [
    "Requests can only be approved by users with hr.actions.approve.",
    "Employees can submit their own requests with hr.actions.submit.",
    "HR managers can view all requests with hr.actions.view.",
    "Approval chain is enforced by the workflow engine.",
  ] as const,
} as const;

// ─── Dashboard Metric Definitions ─────────────────────────────────────────────

export const HR_DASHBOARD_METRIC_DEFINITIONS = [
  { description: "Total count of all employee records regardless of status.", key: "total_employees", label: "Total Employees" },
  { description: "Employees with status = active.", key: "active_employees", label: "Active Employees" },
  { description: "Employees hired within the current calendar month.", key: "new_hires", label: "New Hires (This Month)" },
  { description: "Employees currently on probation.", key: "on_probation", label: "On Probation" },
  { description: "Active contracts with end date within the next 60 days.", key: "contracts_expiring_soon", label: "Contracts Expiring (60 days)" },
  { description: "Documents with expiry within the next 30 days or already expired.", key: "documents_expiring_soon", label: "Documents Expiring (30 days)" },
  { description: "HR action documents in draft, submitted, or under review status.", key: "pending_hr_requests", label: "Pending HR Requests" },
  { description: "Action documents awaiting approval decision.", key: "pending_approvals", label: "Pending Approvals" },
  { description: "Positions with no assigned employee or fewer than the target headcount.", key: "open_vacancies", label: "Open Vacancies" },
  { description: "Payroll validation errors blocking payslip generation.", key: "payroll_readiness_issues", label: "Payroll Readiness Issues" },
  { description: "Employees currently in a temporary or acting assignment.", key: "temporary_assignments_active", label: "Active Temporary Assignments" },
  { description: "Employees with work anniversaries this month.", key: "work_anniversaries_this_month", label: "Work Anniversaries (This Month)" },
] as const;

// ─── Accessibility Checklist ──────────────────────────────────────────────────

export const HR_ACCESSIBILITY_CHECKLIST = [
  { description: "All table columns have visible header text (not icon-only).", item: "table_headers" },
  { description: "Form inputs have associated labels visible to screen readers.", item: "form_labels" },
  { description: "Status badges have text content (not color-only indication).", item: "status_badges" },
  { description: "Action buttons have descriptive aria labels.", item: "action_buttons" },
  { description: "Modal dialogs have focus trap and Escape key support.", item: "modal_focus" },
  { description: "All interactive elements are reachable via keyboard.", item: "keyboard_navigation" },
  { description: "Error messages are associated with the invalid form field.", item: "error_association" },
  { description: "Loading states communicate progress to assistive technology.", item: "loading_states" },
] as const;

// ─── Mobile/Responsive Checklist ─────────────────────────────────────────────

export const HR_RESPONSIVE_CHECKLIST = [
  { description: "Employee list collapses to key columns on mobile (name, status, quick action).", item: "employee_list_mobile" },
  { description: "Dashboard metrics stack to single column on small screens.", item: "dashboard_metrics_mobile" },
  { description: "Create/edit modals are scrollable on small screens.", item: "modal_scrollable" },
  { description: "Form fields are at least 44px touch target.", item: "touch_targets" },
  { description: "Quick action buttons on employee profile are sticky or clearly accessible.", item: "profile_actions_mobile" },
  { description: "Tables have horizontal scroll on overflow, not hidden content.", item: "table_horizontal_scroll" },
] as const;

// ─── Contract Lifecycle Operations ────────────────────────────────────────────

export const HR_CONTRACT_LIFECYCLE_OPERATIONS = [
  { description: "Create a new employment contract for an employee.", label: "Create Contract", permission: "hr.contracts.manage", transition: "create" as const },
  { description: "Renew an expiring contract before its end date.", label: "Renew Contract", permission: "hr.contracts.manage", transition: "renew" as const },
  { description: "Amend contract terms (salary, type, or duration).", label: "Amend Contract", permission: "hr.contracts.manage", transition: "amend" as const },
  { description: "Suspend an active contract due to unpaid leave or investigation.", label: "Suspend Contract", permission: "hr.contracts.manage", transition: "suspend" as const },
  { description: "Resume a previously suspended contract.", label: "Resume Contract", permission: "hr.contracts.manage", transition: "resume" as const },
  { description: "Terminate a contract before its natural end.", label: "Terminate Contract", permission: "hr.contracts.manage", transition: "terminate" as const },
] as const;

export type HrContractTransition = (typeof HR_CONTRACT_LIFECYCLE_OPERATIONS)[number]["transition"];

// ─── Compensation Operations ──────────────────────────────────────────────────

export const HR_COMPENSATION_OPERATIONS = [
  { description: "Add a new salary component with effective start date.", label: "Add Component", permission: "hr.compensation.manage", operation: "add" as const },
  { description: "Amend an existing component's value (triggers new effective-dated version).", label: "Amend Component", permission: "hr.compensation.manage", operation: "amend" as const },
  { description: "End a component with an effective end date.", label: "End Component", permission: "hr.compensation.manage", operation: "end" as const },
] as const;

// ─── Employee Lifecycle Actions ───────────────────────────────────────────────

export const HR_EMPLOYEE_LIFECYCLE_ACTIONS = [
  { description: "Create a new employee record and optionally begin onboarding.", label: "Create Employee", permission: "hr.employees.manage", action: "create" as const },
  { description: "Edit personal, contact, and employment profile fields.", label: "Edit Employee", permission: "hr.employees.manage", action: "edit" as const },
  { description: "Archive an inactive or separated employee (soft delete).", label: "Archive Employee", permission: "hr.employees.manage", action: "archive" as const },
  { description: "Restore a previously archived employee record.", label: "Restore Employee", permission: "hr.employees.manage", action: "restore" as const },
  { description: "Upload or replace the employee photo.", label: "Update Photo", permission: "hr.employees.manage", action: "photo_update" as const },
  { description: "Duplicate an existing employee record as a starting point.", label: "Duplicate Employee", permission: "hr.employees.manage", action: "duplicate" as const },
  { description: "Print the full employee profile document.", label: "Print Profile", permission: "hr.employees.view", action: "print_profile" as const },
  { description: "Export employee record as part of bulk or individual export.", label: "Export Record", permission: "hr.import-export.manage", action: "export" as const },
] as const;

// ─── Production Readiness Gate Contract v1.0 ──────────────────────────────────

export const HR_PRODUCTION_READINESS_GATE_V1 = {
  accessibilityChecklist: HR_ACCESSIBILITY_CHECKLIST,
  bulkOperations: HR_BULK_OPERATION_DEFINITIONS,
  compensationOperations: HR_COMPENSATION_OPERATIONS,
  contractLifecycle: HR_CONTRACT_LIFECYCLE_OPERATIONS,
  dashboardMetrics: HR_DASHBOARD_METRIC_DEFINITIONS,
  employeeImportColumns: HR_EMPLOYEE_IMPORT_COLUMNS,
  employeeImportValidationRules: HR_EMPLOYEE_IMPORT_VALIDATION_RULES,
  employeeExportColumns: HR_EMPLOYEE_EXPORT_COLUMNS,
  employeeLifecycleActions: HR_EMPLOYEE_LIFECYCLE_ACTIONS,
  notificationTriggers: HR_NOTIFICATION_TRIGGER_DEFINITIONS,
  printTemplates: HR_PRINT_TEMPLATE_DEFINITIONS,
  reportDefinitions: HR_PRODUCTION_REPORT_DEFINITIONS,
  responsiveChecklist: HR_RESPONSIVE_CHECKLIST,
  searchProviders: HR_SEARCH_ENTITY_PROVIDERS,
  securityScopeRules: HR_PRODUCTION_SECURITY_SCOPE_RULES,
  validationRules: HR_PRODUCTION_VALIDATION_RULES,
  version: "1.0.0" as const,
} as const;

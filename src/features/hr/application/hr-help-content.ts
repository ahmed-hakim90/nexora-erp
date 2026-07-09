import type { BilingualHelp } from "@/shared/ui/help/help-types";

export type HrPageHelpKey =
  | "dashboard"
  | "employees"
  | "employeeProfile"
  | "organization"
  | "positionsJobs"
  | "assignments"
  | "contracts"
  | "attendanceLeave"
  | "attendanceProcessing"
  | "attendanceExport"
  | "compensation"
  | "payrollReadiness"
  | "requests"
  | "documents"
  | "custody"
  | "advances"
  | "loans"
  | "bonuses"
  | "incentives"
  | "penalties"
  | "bankAccounts"
  | "shifts"
  | "reports"
  | "settings";

export type HrMetricHelpKey =
  | "totalEmployees"
  | "activeEmployees"
  | "newHires"
  | "onProbation"
  | "contractsExpiringSoon"
  | "documentsExpiringSoon"
  | "pendingHrRequests"
  | "pendingApprovals"
  | "openVacancies"
  | "payrollReadinessIssues"
  | "pendingLeaveApprovals"
  | "employeesOnLeaveToday"
  | "openAttendanceExceptionsToday"
  | "pendingOvertimeCandidates"
  | "pendingLateEarlyViolations"
  | "openPayrollPeriods"
  | "temporaryAssignmentsActive"
  | "workAnniversariesThisMonth"
  | "upcomingBirthdays";

export type HrTabHelpKey =
  | "overview"
  | "personal"
  | "employment"
  | "assignments"
  | "contracts"
  | "compensation"
  | "attendanceLeave"
  | "skills"
  | "documents"
  | "custody"
  | "payrollReadiness"
  | "requests"
  | "timeline"
  | "audit";

export type HrFieldHelpKey =
  | "fullName"
  | "employeeNumber"
  | "nationalId"
  | "passportNumber"
  | "birthDate"
  | "email"
  | "phone"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "employmentType"
  | "effectiveFrom"
  | "attendanceCode"
  | "contractType"
  | "contractStartsOn"
  | "probationPeriodDays"
  | "departmentId"
  | "positionId"
  | "managerEmployeeId"
  | "salaryPackageRef"
  | "employeeId"
  | "amount"
  | "reason"
  | "startsOn"
  | "endsOn"
  | "status"
  | "documentType"
  | "expiryDate"
  | "assetType"
  | "requestType"
  | "leaveType"
  | "leaveBalance"
  | "punchTime"
  | "componentType"
  | "packageName"
  | "bankName"
  | "iban"
  | "accountNumber"
  | "advanceDeductionMonths";

export const hrPageHelp: Readonly<Record<HrPageHelpKey, BilingualHelp>> = {
  dashboard: {
    en: "Central HR operations view. Monitor workforce metrics, alerts, and quick actions before diving into detail pages.",
    ar: "لوحة عمليات الموارد البشرية. راقب مؤشرات القوى العاملة والتنبيهات والإجراءات السريعة قبل الدخول للصفحات التفصيلية.",
  },
  employees: {
    en: "Employee directory with search, filters, export, and create/edit workflows. Start here to onboard or update employee records.",
    ar: "دليل الموظفين مع البحث والفلاتر والتصدير وإنشاء/تعديل السجلات. ابدأ من هنا لإضافة موظف جديد أو تحديث بياناته.",
  },
  employeeProfile: {
    en: "Single employee workspace with tabs for personal data, assignments, contracts, compensation, documents, and payroll readiness.",
    ar: "ملف الموظف الكامل مع تبويبات للبيانات الشخصية والتعيينات والعقود والتعويضات والمستندات وجاهزية الرواتب.",
  },
  organization: {
    en: "Build the org hierarchy: departments, sections, teams, and work locations. Required before assignments and position budgeting.",
    ar: "بناء الهيكل التنظيمي: الأقسام والأقسام الفرعية والفرق ومواقع العمل. مطلوب قبل التعيينات وموازنة المناصب.",
  },
  positionsJobs: {
    en: "Define job architecture (families, functions, levels, jobs) and approved positions linked to departments and grades.",
    ar: "تعريف هيكل الوظائف (العائلات والوظائف والمستويات) والمناصب المعتمدة المرتبطة بالأقسام والدرجات.",
  },
  assignments: {
    en: "Track where employees work: department, position, manager, and effective dates. Use assignment changes instead of editing org fields directly.",
    ar: "تتبع مكان عمل الموظف: القسم والمنصب والمدير وتواريخ السريان. استخدم تغيير التعيين بدلاً من تعديل الحقول التنظيمية مباشرة.",
  },
  contracts: {
    en: "Legal employment contracts with lifecycle states (draft → active → terminated). Separate from assignment and compensation records.",
    ar: "عقود العمل القانونية مع دورة حياتها (مسودة → نشط → منتهي). منفصلة عن سجلات التعيين والتعويضات.",
  },
  attendanceLeave: {
    en: "Leave requests, leave balances, and attendance punches. Links to payroll through approved leave and attendance snapshots.",
    ar: "طلبات الإجازات وأرصدة الإجازات وسجلات الحضور. ترتبط بالرواتب عبر الإجازات المعتمدة ولقطات الحضور.",
  },
  attendanceProcessing: {
    en: "Attendance approval queue, missing punch corrections, and daily summary approval before payroll export.",
    ar: "قائمة اعتماد الحضور وتصحيح البصمات الناقصة واعتماد الملخص اليومي قبل تصدير الرواتب.",
  },
  attendanceExport: {
    en: "Lock attendance periods, validate payroll readiness, and export immutable attendance snapshots as payroll inputs.",
    ar: "قفل فترات الحضور والتحقق من الجاهزية وتصدير لقطات حضور ثابتة كمدخلات للرواتب.",
  },
  compensation: {
    en: "Salary packages, pay components, and employee salary assignments. Defines payroll inputs before calculation runs.",
    ar: "حزم الرواتب ومكونات الأجر وتعيينات رواتب الموظفين. تحدد مدخلات الرواتب قبل تشغيل الحساب.",
  },
  payrollReadiness: {
    en: "Payroll run workspace: validate inputs, calculate, approve, and publish payslips. Fix readiness issues before closing a period.",
    ar: "مساحة تشغيل الرواتب: التحقق من المدخلات والحساب والاعتماد ونشر كشوف المرتبات. أصلح مشاكل الجاهزية قبل إغلاق الفترة.",
  },
  requests: {
    en: "HR action request hub. Submit, approve, reject, or return requests that may trigger assignment, leave, or compensation changes.",
    ar: "مركز طلبات HR. قدم أو اعتمد أو ارفض طلبات قد تؤدي لتغييرات في التعيين أو الإجازات أو التعويضات.",
  },
  documents: {
    en: "Employee document register with expiry tracking. Upload IDs, contracts, certificates, and compliance files.",
    ar: "سجل مستندات الموظفين مع متابعة انتهاء الصلاحية. ارفع الهويات والعقود والشهادات وملفات الامتثال.",
  },
  custody: {
    en: "Asset custody assignments (laptops, phones, keys). Track issue, return, transfer, damaged, or lost status.",
    ar: "تسليم العهدة (أجهزة، هواتف، مفاتيح). تتبع الإصدار والإرجاع والنقل أو التلف أو الفقد.",
  },
  advances: {
    en: "Employee salary advances: request, approve, disburse, and reconcile against future payroll deductions.",
    ar: "سلف الموظفين: الطلب والاعتماد والصرف والتسوية مقابل خصومات رواتب مستقبلية.",
  },
  loans: {
    en: "Employee loans with installment schedules. Approve and disburse before payroll starts deducting installments.",
    ar: "قروض الموظفين بجدول أقساط. اعتمد وصرف قبل أن يبدأ النظام بخصم الأقساط من الراتب.",
  },
  bonuses: {
    en: "One-time or periodic bonuses. Requires approval before payroll inclusion in the relevant period.",
    ar: "مكافآت لمرة واحدة أو دورية. تحتاج اعتماداً قبل إدراجها في راتب الفترة المعنية.",
  },
  incentives: {
    en: "Performance or attendance incentives. Track approval status before payroll calculation picks them up.",
    ar: "حوافز الأداء أو الحضور. تتبع حالة الاعتماد قبل أن يلتقطها حساب الرواتب.",
  },
  penalties: {
    en: "Disciplinary penalties with acknowledgment tracking. May reduce net pay when linked to payroll.",
    ar: "جزاءات تأديبية مع متابعة الإقرار. قد تخفض صافي الراتب عند الربط بالرواتب.",
  },
  bankAccounts: {
    en: "Employee bank accounts for salary transfer. Mark primary account before payroll bank file generation.",
    ar: "حسابات الموظفين البنكية لتحويل الراتب. حدد الحساب الأساسي قبل إنشاء ملف البنك للرواتب.",
  },
  shifts: {
    en: "Define shift templates and assign employee schedules for attendance, late/early, and overtime evaluation.",
    ar: "عرّف قوالب الورديات وعيّن جداول الموظفين لتقييم الحضور والتأخير والعمل الإضافي.",
  },
  reports: {
    en: "Operational HR report entry points: directory, org structure, contract expiry, skills matrix, and vacancy views.",
    ar: "مداخل تقارير HR التشغيلية: الدليل والهيكل وانتهاء العقود ومصفوفة المهارات والشواغر.",
  },
  settings: {
    en: "HR module preferences, policy templates, and integration settings. Configure before rolling out workflows company-wide.",
    ar: "تفضيلات HR وقوالب السياسات وإعدادات التكامل. اضبطها قبل تعميم سير العمل على الشركة.",
  },
};

export const hrMetricHelp: Readonly<Record<HrMetricHelpKey, BilingualHelp>> = {
  totalEmployees: {
    en: "All employee records in the company, including inactive and draft statuses.",
    ar: "جميع سجلات الموظفين في الشركة، بما في ذلك غير النشطين والمسودات.",
  },
  activeEmployees: {
    en: "Employees with active employment status and current assignment.",
    ar: "الموظفون بحالة عمل نشطة وتعيين ساري.",
  },
  newHires: {
    en: "Employees hired during the current calendar month.",
    ar: "الموظفون المعيّنون خلال الشهر الحالي.",
  },
  onProbation: {
    en: "Employees still within their probation period per contract or employment profile.",
    ar: "الموظفون ما زالوا في فترة التجربة حسب العقد أو ملف التوظيف.",
  },
  contractsExpiringSoon: {
    en: "Active contracts ending within the next 60 days. Renew or terminate before expiry.",
    ar: "عقود نشطة تنتهي خلال 60 يوماً. جدّد أو أنهِ قبل انتهاء الصلاحية.",
  },
  documentsExpiringSoon: {
    en: "Employee documents approaching expiry (IDs, visas, certifications). Upload renewals promptly.",
    ar: "مستندات موظفين قريبة من الانتهاء (هويات، تأشيرات، شهادات). ارفع التجديدات فوراً.",
  },
  pendingHrRequests: {
    en: "Open HR action requests awaiting processing or approval.",
    ar: "طلبات HR مفتوحة بانتظار المعالجة أو الاعتماد.",
  },
  pendingApprovals: {
    en: "Items in your approval queue across leave, requests, compensation, and payroll.",
    ar: "عناصر في قائمة اعتمادك: إجازات وطلبات وتعويضات ورواتب.",
  },
  openVacancies: {
    en: "Positions that are vacant or partially filled against approved headcount.",
    ar: "مناصب شاغرة أو مملوءة جزئياً مقارنة بالطاقة المعتمدة.",
  },
  payrollReadinessIssues: {
    en: "Validation errors or draft payslip issues blocking payroll publish for the current period.",
    ar: "أخطاء تحقق أو مسودات كشوف مرتبات تمنع نشر الرواتب للفترة الحالية.",
  },
  pendingLeaveApprovals: {
    en: "Leave requests submitted or under review and waiting for an approval decision.",
    ar: "طلبات إجازة مقدّمة أو قيد المراجعة بانتظار قرار الاعتماد.",
  },
  employeesOnLeaveToday: {
    en: "Employees with approved leave covering today's work date.",
    ar: "الموظفون في إجازة معتمدة تغطي تاريخ عمل اليوم.",
  },
  openAttendanceExceptionsToday: {
    en: "Attendance exceptions still open for today's processed attendance days.",
    ar: "استثناءات حضور مفتوحة لأيام الحضور المعالجة لليوم.",
  },
  pendingOvertimeCandidates: {
    en: "Overtime candidates detected from attendance and waiting for review or conversion.",
    ar: "مرشحو وقت إضافي مكتشفون من الحضور وبانتظار المراجعة أو التحويل.",
  },
  pendingLateEarlyViolations: {
    en: "Late or early leave violations submitted and awaiting HR action.",
    ar: "مخالفات تأخير أو انصراف مبكر مقدّمة وبانتظار إجراء الموارد البشرية.",
  },
  openPayrollPeriods: {
    en: "Payroll periods still open for attendance, leave, or payroll input collection.",
    ar: "فترات رواتب ما زالت مفتوحة لإدخال الحضور أو الإجازات أو بيانات الرواتب.",
  },
  temporaryAssignmentsActive: {
    en: "Employees currently on temporary or acting assignments within the active date window.",
    ar: "الموظفون في تعيينات مؤقتة أو بالإنابة ضمن نافذة التاريخ النشطة.",
  },
  workAnniversariesThisMonth: {
    en: "Active employees celebrating a work anniversary during the current calendar month.",
    ar: "الموظفون النشطون الذين يحتفلون بذكرى التعيين خلال الشهر الحالي.",
  },
  upcomingBirthdays: {
    en: "Active employees with a birthday within the next 30 days.",
    ar: "الموظفون النشطون اللي عيد ميلادهم خلال الـ 30 يوم الجايين.",
  },
};

export const hrTabHelp: Readonly<Record<HrTabHelpKey, BilingualHelp>> = {
  overview: {
    en: "Summary of employee identity, current assignment, lifecycle state, and key alerts.",
    ar: "ملخص هوية الموظف والتعيين الحالي وحالة دورة الحياة والتنبيهات الرئيسية.",
  },
  personal: {
    en: "Personal and contact details: ID, birth date, address, emergency contacts.",
    ar: "البيانات الشخصية والتواصل: الهوية وتاريخ الميلاد والعنوان وجهات الطوارئ.",
  },
  employment: {
    en: "Employment type, hire date, lifecycle state, and attendance device linkage.",
    ar: "نوع التوظيف وتاريخ التعيين وحالة دورة الحياة وربط جهاز الحضور.",
  },
  assignments: {
    en: "History of department, position, and manager assignments with effective dates.",
    ar: "سجل تعيينات القسم والمنصب والمدير مع تواريخ السريان.",
  },
  contracts: {
    en: "Legal contracts linked to this employee with status and expiry dates.",
    ar: "العقود القانونية المرتبطة بالموظف مع الحالة وتواريخ الانتهاء.",
  },
  compensation: {
    en: "Active salary package and component assignments affecting payroll.",
    ar: "حزمة الراتب النشطة ومكونات الأجر المؤثرة على كشف المرتبات.",
  },
  attendanceLeave: {
    en: "Leave balances, recent leave requests, and attendance punch history.",
    ar: "أرصدة الإجازات وطلبات الإجازة الأخيرة وسجل الحضور.",
  },
  skills: {
    en: "Employee skills, competencies, certifications, and proficiency levels.",
    ar: "مهارات الموظف وكفاءاته وشهاداته ومستويات الإتقان.",
  },
  documents: {
    en: "Uploaded documents with type, issue date, and expiry tracking.",
    ar: "المستندات المرفوعة مع النوع وتاريخ الإصدار ومتابعة الانتهاء.",
  },
  custody: {
    en: "Assets currently assigned to or previously held by this employee.",
    ar: "الأصول المسلّمة حالياً أو سابقاً لهذا الموظف.",
  },
  payrollReadiness: {
    en: "Payroll validation status, blocking issues, and payslip readiness for this employee.",
    ar: "حالة جاهزية الرواتب والمشاكل المانعة وجاهزية كشف المرتب لهذا الموظف.",
  },
  requests: {
    en: "HR action requests submitted by or about this employee.",
    ar: "طلبات HR المقدمة من أو بخصوص هذا الموظف.",
  },
  timeline: {
    en: "Chronological HR events: hires, transfers, promotions, separations.",
    ar: "أحداث HR الزمنية: التعيين والنقل والترقيات وإنهاء الخدمة.",
  },
  audit: {
    en: "Audit trail of changes to this employee record for compliance review.",
    ar: "سجل التدقيق لتغييرات بيانات الموظف لمراجعة الامتثال.",
  },
};

export const hrFieldHelp: Readonly<Record<HrFieldHelpKey, BilingualHelp>> = {
  fullName: {
    en: "Legal or preferred full name as shown on ID and payslip.",
    ar: "الاسم الكامل القانوني أو المفضل كما يظهر في الهوية وكشف المرتب.",
  },
  employeeNumber: {
    en: "Unique job code you enter manually. The same value is used as the attendance/device code for fingerprint punch matching.",
    ar: "كود الموظف الوظيفي الذي تدخله يدويًا. نفس القيمة تُستخدم ككود الحضور لمطابقة البصمة على الجهاز.",
  },
  nationalId: {
    en: "Government national ID number for compliance and payroll statutory reporting.",
    ar: "رقم الهوية الوطنية للامتثال والتقارير النظامية للرواتب.",
  },
  passportNumber: {
    en: "Passport number for expatriate employees or travel-related compliance.",
    ar: "رقم جواز السفر للموظفين الوافدين أو متطلبات السفر.",
  },
  birthDate: {
    en: "Date of birth used for age-based policies and statutory calculations.",
    ar: "تاريخ الميلاد للسياسات المعتمدة على العمر والحسابات النظامية.",
  },
  email: {
    en: "Work or personal email for notifications and ESS portal access.",
    ar: "البريد الوظيفي أو الشخصي للإشعارات وبوابة الموظف.",
  },
  phone: {
    en: "Primary contact phone for HR and emergency reach-out.",
    ar: "رقم الهاتف الأساسي للتواصل من HR أو في الطوارئ.",
  },
  emergencyContactName: {
    en: "Person to contact if the employee cannot be reached.",
    ar: "الشخص الذي يُتواصل معه إذا تعذر الوصول للموظف.",
  },
  emergencyContactPhone: {
    en: "Phone number for the emergency contact person.",
    ar: "رقم هاتف جهة الاتصال في حالات الطوارئ.",
  },
  employmentType: {
    en: "Full-time, part-time, contractor, etc. Affects benefits, leave rules, and payroll treatment.",
    ar: "دوام كامل، جزئي، متعاقد، إلخ. يؤثر على المزايا وقواعد الإجازات ومعاملة الراتب.",
  },
  effectiveFrom: {
    en: "Date this employment or assignment record becomes active. Must not overlap conflicting records.",
    ar: "تاريخ بدء سريان التوظيف أو التعيين. لا يجب أن يتداخل مع سجلات متعارضة.",
  },
  attendanceCode: {
    en: "Same as the employee job code. Stored for device punch matching; do not enter a separate value.",
    ar: "نفس كود الموظف الوظيفي. يُحفظ لمطابقة بصمات الحضور؛ لا تُدخل قيمة منفصلة.",
  },
  contractType: {
    en: "Contract classification such as fixed-term, unlimited, or project-based.",
    ar: "تصنيف العقد: محدد المدة أو غير محدود أو حسب مشروع.",
  },
  contractStartsOn: {
    en: "Legal start date of the employment contract.",
    ar: "تاريخ بدء العقد القانوني.",
  },
  probationPeriodDays: {
    en: "Number of probation days before full employment rights apply.",
    ar: "عدد أيام التجربة قبل تطبيق حقوق التوظيف الكاملة.",
  },
  departmentId: {
    en: "Organizational unit where the employee is assigned. Drives reporting and cost allocation.",
    ar: "الوحدة التنظيمية التي يُعيَّن فيها الموظف. تحدد التقارير وتوزيع التكلفة.",
  },
  positionId: {
    en: "Approved seat linked to a job and department. Optional at hire if not yet budgeted.",
    ar: "منصب معتمد مرتبط بوظيفة وقسم. اختياري عند التعيين إذا لم تُعتمد الموازنة بعد.",
  },
  managerEmployeeId: {
    en: "Direct manager for approvals, org chart, and MSS workflows.",
    ar: "المدير المباشر للاعتمادات والهيكل وسير عمل المدير.",
  },
  salaryPackageRef: {
    en: "Reference to a predefined salary package. Full compensation can be set later in Compensation.",
    ar: "مرجع لحزمة راتب معرّفة مسبقاً. يمكن ضبط التعويض الكامل لاحقاً في التعويضات.",
  },
  employeeId: {
    en: "Select the employee this record applies to.",
    ar: "اختر الموظف الذي ينطبق عليه هذا السجل.",
  },
  amount: {
    en: "Monetary amount in company base currency unless another currency is specified.",
    ar: "المبلغ بعملة الشركة الأساسية ما لم تُحدد عملة أخرى.",
  },
  reason: {
    en: "Business reason documented for audit and approval workflows.",
    ar: "السبب التجاري الموثّق للتدقيق وسير الاعتماد.",
  },
  startsOn: {
    en: "Start date for this record or period.",
    ar: "تاريخ بدء هذا السجل أو الفترة.",
  },
  endsOn: {
    en: "End date. Leave empty for open-ended records.",
    ar: "تاريخ الانتهاء. اتركه فارغاً للسجلات المفتوحة.",
  },
  status: {
    en: "Lifecycle status controlling which actions are allowed on this record.",
    ar: "حالة دورة الحياة التي تحدد الإجراءات المسموحة على هذا السجل.",
  },
  documentType: {
    en: "Category of document (ID, visa, certificate, contract copy, etc.).",
    ar: "نوع المستند (هوية، تأشيرة، شهادة، نسخة عقد، إلخ).",
  },
  expiryDate: {
    en: "Date the document expires. System alerts before this date.",
    ar: "تاريخ انتهاء المستند. ينبه النظام قبل هذا التاريخ.",
  },
  assetType: {
    en: "Type of asset issued: laptop, phone, vehicle key, uniform, etc.",
    ar: "نوع الأصل المسلّم: لابتوب، هاتف، مفتاح سيارة، زي، إلخ.",
  },
  requestType: {
    en: "Kind of HR action: transfer, promotion, separation, document request, etc.",
    ar: "نوع إجراء HR: نقل، ترقية، إنهاء خدمة، طلب مستند، إلخ.",
  },
  leaveType: {
    en: "Annual, sick, unpaid, or other leave category per company policy.",
    ar: "إجازة سنوية أو مرضية أو بدون أجر أو فئة أخرى حسب سياسة الشركة.",
  },
  leaveBalance: {
    en: "Remaining leave days available for this leave type and period.",
    ar: "أيام الإجازة المتبقية لهذا النوع والفترة.",
  },
  punchTime: {
    en: "Clock-in or clock-out timestamp from device or manual entry.",
    ar: "وقت الدخول أو الخروج من الجهاز أو إدخال يدوي.",
  },
  componentType: {
    en: "Earning or deduction component: basic, allowance, bonus line, etc.",
    ar: "مكون أجر أو خصم: أساسي، بدل، بند مكافأة، إلخ.",
  },
  packageName: {
    en: "Named salary package grouping multiple pay components.",
    ar: "اسم حزمة الراتب التي تجمع عدة مكونات أجر.",
  },
  bankName: {
    en: "Bank where the salary account is held.",
    ar: "البنك الذي يُفتح فيه حساب الراتب.",
  },
  iban: {
    en: "International Bank Account Number for salary transfer.",
    ar: "رقم الحساب البنكي الدولي IBAN لتحويل الراتب.",
  },
  accountNumber: {
    en: "Local bank account number if IBAN is not used.",
    ar: "رقم الحساب المحلي إذا لم يُستخدم IBAN.",
  },
  advanceDeductionMonths: {
    en: "Number of payroll months to recover this advance (default: 1).",
    ar: "عدد شهور الراتب اللي هيتخصم منها السلفة (الافتراضي: 1).",
  },
};

export const hrFoundationFieldHelp: Readonly<Record<string, BilingualHelp>> = {
  orgUnitKey: {
    en: "Short unique code for this org unit within the company.",
    ar: "رمز قصير فريد لهذه الوحدة التنظيمية داخل الشركة.",
  },
  locationKey: {
    en: "Unique code for the work location or site.",
    ar: "رمز فريد لموقع العمل أو الفرع.",
  },
  gradeKey: {
    en: "Job grade code used by positions and compensation bands.",
    ar: "رمز الدرجة الوظيفية المستخدم في المناصب وشرائح الأجر.",
  },
  familyCode: {
    en: "Code for the job family grouping related roles.",
    ar: "رمز عائلة الوظائف التي تجمع الأدوار المتشابهة.",
  },
  functionCode: {
    en: "Code for the job function within a family.",
    ar: "رمز وظيفة العمل ضمن العائلة.",
  },
  levelCode: {
    en: "Hierarchy level code indicating seniority in the job structure.",
    ar: "رمز مستوى التسلسل الهرمي يدل على الأقدمية في هيكل الوظائف.",
  },
  jobCode: {
    en: "Canonical job definition code. Positions and assignments reference jobs.",
    ar: "رمز تعريف الوظيفة الأساسي. المناصب والتعيينات تشير للوظائف.",
  },
  pathCode: {
    en: "Career path identifier linking progression between jobs.",
    ar: "معرف المسار المهني يربط التقدم بين الوظائف.",
  },
  positionKey: {
    en: "Unique code for an approved position seat in the org.",
    ar: "رمز فريد لمنصب معتمد في الهيكل.",
  },
  categoryKey: {
    en: "Category code for grouping skills or competencies.",
    ar: "رمز الفئة لتجميع المهارات أو الكفاءات.",
  },
  skillCode: {
    en: "Skill library code. Distinct from competency codes.",
    ar: "رمز مهارة في المكتبة. منفصل عن رموز الكفاءات.",
  },
  competencyCode: {
    en: "Competency library code. Distinct from skill codes.",
    ar: "رمز كفاءة في المكتبة. منفصل عن رموز المهارات.",
  },
  certificationCode: {
    en: "Certification definition code for compliance tracking.",
    ar: "رمز تعريف الشهادة لمتابعة الامتثال.",
  },
  licenseCode: {
    en: "Professional license definition code.",
    ar: "رمز تعريف الترخيص المهني.",
  },
  languageCode: {
    en: "Language definition code (e.g. EN, AR).",
    ar: "رمز تعريف اللغة (مثل EN, AR).",
  },
  qualificationCode: {
    en: "Educational or professional qualification code.",
    ar: "رمز المؤهل التعليمي أو المهني.",
  },
  name: {
    en: "Display name shown in lists, lookups, and reports.",
    ar: "الاسم المعروض في القوائم والبحث والتقارير.",
  },
  kind: {
    en: "Org unit type: department, section, or team.",
    ar: "نوع الوحدة: قسم أو قسم فرعي أو فريق.",
  },
  parentOrgUnitId: {
    en: "Parent unit in the hierarchy. Departments have no parent; sections belong to departments.",
    ar: "الوحدة الأب في الهيكل. الأقسام بلا أب؛ الأقسام الفرعية تتبع الأقسام.",
  },
  managerEmployeeId: {
    en: "Employee who manages this org unit for reporting lines.",
    ar: "الموظف الذي يدير هذه الوحدة لخطوط الإبلاغ.",
  },
  workLocationId: {
    en: "Physical site where this unit primarily operates.",
    ar: "الموقع الفعلي الذي تعمل فيه هذه الوحدة أساساً.",
  },
  branchId: {
    en: "Company branch linked to this work location.",
    ar: "فرع الشركة المرتبط بموقع العمل.",
  },
  rank: {
    en: "Numeric rank for sorting grades from junior to senior.",
    ar: "ترتيب رقمي لفرز الدرجات من junior إلى senior.",
  },
  gradeLevel: {
    en: "Optional sub-level within a grade band.",
    ar: "مستوى فرعي اختياري ضمن شريحة الدرجة.",
  },
  jobFamilyId: {
    en: "Job family this function or job belongs to.",
    ar: "عائلة الوظائف التي تنتمي إليها هذه الوظيفة.",
  },
  jobFunctionId: {
    en: "Job function within the selected family.",
    ar: "وظيفة العمل ضمن العائلة المختارة.",
  },
  jobLevelId: {
    en: "Seniority level in the job hierarchy.",
    ar: "مستوى الأقدمية في التسلسل الوظيفي.",
  },
  defaultGradeId: {
    en: "Default pay grade suggested when hiring for this job.",
    ar: "الدرجة الافتراضية المقترحة عند التعيين على هذه الوظيفة.",
  },
  jobId: {
    en: "Canonical job this position is based on.",
    ar: "الوظيفة الأساسية التي يُبنى عليها هذا المنصب.",
  },
  departmentId: {
    en: "Department owning this position in the org chart.",
    ar: "القسم المالك لهذا المنصب في الهيكل.",
  },
  sectionId: {
    en: "Optional section within the department.",
    ar: "قسم فرعي اختياري داخل القسم.",
  },
  gradeId: {
    en: "Pay grade assigned to this position.",
    ar: "الدرجة الوظيفية المعينة لهذا المنصب.",
  },
  budgetedHeadcount: {
    en: "Approved number of employees for this position.",
    ar: "عدد الموظفين المعتمد لهذا المنصب.",
  },
  currentHeadcount: {
    en: "Current occupied seats. Updated when assignments change.",
    ar: "المقاعد المشغولة حالياً. تُحدَّث عند تغيير التعيينات.",
  },
  effectiveFrom: {
    en: "Date this position becomes active in the org structure.",
    ar: "تاريخ بدء سريان هذا المنصب في الهيكل.",
  },
  vacancyStatus: {
    en: "Whether the position is vacant, filled, or overstaffed vs budget.",
    ar: "هل المنصب شاغر أو مملوء أو مزدحم مقارنة بالموازنة.",
  },
  skillCategoryId: {
    en: "Category grouping this skill in the library.",
    ar: "الفئة التي تُجمّع هذه المهارة في المكتبة.",
  },
  competencyCategoryId: {
    en: "Category grouping this competency.",
    ar: "الفئة التي تُجمّع هذه الكفاءة.",
  },
  sequence: {
    en: "Order in the proficiency scale from lowest to highest.",
    ar: "الترتيب في مقياس الإتقان من الأدنى للأعلى.",
  },
  hierarchySequence: {
    en: "Order of this level in the job hierarchy.",
    ar: "ترتيب هذا المستوى في التسلسل الوظيفي.",
  },
  description: {
    en: "Optional longer description for search and documentation.",
    ar: "وصف اختياري أطول للبحث والتوثيق.",
  },
  responsibilities: {
    en: "Key responsibilities expected in this job role.",
    ar: "المسؤوليات الرئيسية المتوقعة في هذا الدور.",
  },
  issuingAuthority: {
    en: "Organization that issues this certification.",
    ar: "الجهة التي تصدر هذه الشهادة.",
  },
  expirationRequired: {
    en: "Whether employees must renew this certification periodically.",
    ar: "هل يجب على الموظفين تجديد هذه الشهادة دورياً.",
  },
  validityPeriodDays: {
    en: "Number of days the license remains valid after issue.",
    ar: "عدد أيام صلاحية الترخيص بعد الإصدار.",
  },
  qualificationType: {
    en: "Type such as degree, diploma, or professional certificate.",
    ar: "نوع مثل شهادة جامعية أو دبلوم أو شهادة مهنية.",
  },
  sortOrder: {
    en: "Display order in lists and dropdowns.",
    ar: "ترتيب العرض في القوائم والقوائم المنسدلة.",
  },
  employmentType: {
    en: "Default employment type for hires on this job.",
    ar: "نوع التوظيف الافتراضي للتعيين على هذه الوظيفة.",
  },
  status: {
    en: "Record lifecycle status: draft, active, inactive, archived.",
    ar: "حالة السجل: مسودة، نشط، غير نشط، مؤرشف.",
  },
};

export const hrFoundationPageHelp: Readonly<Record<string, BilingualHelp>> = {
  organization: hrPageHelp.organization,
  "positions-jobs": hrPageHelp.positionsJobs,
  "skills-competencies": {
    en: "Skills, competencies, certifications, and proficiency scales. Separate from job definitions.",
    ar: "المهارات والكفاءات والشهادات ومقاييس الإتقان. منفصلة عن تعريفات الوظائف.",
  },
};

export function resolveHrTabHelp(tabKey: string): BilingualHelp | undefined {
  const map: Record<string, HrTabHelpKey> = {
    overview: "overview",
    personal: "personal",
    employment: "employment",
    assignments: "assignments",
    contracts: "contracts",
    compensation: "compensation",
    "attendance-leave": "attendanceLeave",
    skills: "skills",
    documents: "documents",
    custody: "custody",
    "payroll-readiness": "payrollReadiness",
    requests: "requests",
    timeline: "timeline",
    audit: "audit",
  };
  const key = map[tabKey];
  return key ? hrTabHelp[key] : undefined;
}

export function resolveHrPageHelp(pageKey: HrPageHelpKey): BilingualHelp {
  return hrPageHelp[pageKey];
}

export function resolveHrFieldHelp(fieldKey: HrFieldHelpKey): BilingualHelp {
  return hrFieldHelp[fieldKey];
}

export function resolveHrFoundationFieldHelp(field: { name: string; helpText?: string; helpTextAr?: string }): BilingualHelp | undefined {
  if (field.helpText) {
    return { en: field.helpText, ar: field.helpTextAr ?? field.helpText };
  }
  return hrFoundationFieldHelp[field.name];
}

export const hrFoundationResourceHelp: Readonly<Record<string, BilingualHelp>> = {
  departments: {
    en: "Top-level organizational units. Create departments before sections, teams, and positions.",
    ar: "الوحدات التنظيمية الرئيسية. أنشئ الأقسام قبل الأقسام الفرعية والفرق والمناصب.",
  },
  sections: {
    en: "Sub-units within a department. Each section must belong to a parent department.",
    ar: "وحدات فرعية داخل القسم. كل قسم فرعي يجب أن يتبع قسماً أباً.",
  },
  teams: {
    en: "Small working groups within sections for operational reporting.",
    ar: "فرق عمل صغيرة داخل الأقسام الفرعية للتقارير التشغيلية.",
  },
  "work-locations": {
    en: "Physical sites and branches where employees work.",
    ar: "المواقع الفعلية والفروع التي يعمل فيها الموظفون.",
  },
  grades: {
    en: "Pay grades used to classify positions and compensation bands.",
    ar: "الدرجات الوظيفية لتصنيف المناصب وشرائح الأجر.",
  },
  "job-families": {
    en: "Groups of related job roles (e.g. Engineering, Sales).",
    ar: "مجموعات الأدوار المتشابهة (مثل الهندسة والمبيعات).",
  },
  "job-functions": {
    en: "Functions within a job family defining role specialization.",
    ar: "وظائف ضمن عائلة الوظائف تحدد التخصص.",
  },
  "job-levels": {
    en: "Seniority levels in the job hierarchy from junior to executive.",
    ar: "مستويات الأقدمية في التسلسل الوظيفي من junior إلى executive.",
  },
  jobs: {
    en: "Canonical job definitions. Positions and assignments reference jobs, not the reverse.",
    ar: "تعريفات الوظائف الأساسية. المناصب والتعيينات تشير للوظائف وليس العكس.",
  },
  "career-paths": {
    en: "Defined progression routes between jobs for talent planning.",
    ar: "مسارات التقدم المعرفة بين الوظائف لتخطيط المواهب.",
  },
  positions: {
    en: "Approved seats with headcount budget linked to jobs and departments.",
    ar: "مناصب معتمدة بموازنة headcount مرتبطة بالوظائف والأقسام.",
  },
  "skill-categories": {
    en: "Categories for grouping skills in the skills library.",
    ar: "فئات لتجميع المهارات في مكتبة المهارات.",
  },
  skills: {
    en: "Technical or soft skills tracked separately from competencies.",
    ar: "مهارات تقنية أو soft skills تُتابع منفصلة عن الكفاءات.",
  },
  "competency-categories": {
    en: "Categories for grouping behavioral competencies.",
    ar: "فئات لتجميع الكفاءات السلوكية.",
  },
  competencies: {
    en: "Behavioral competencies distinct from technical skills.",
    ar: "كفاءات سلوكية منفصلة عن المهارات التقنية.",
  },
  "proficiency-levels": {
    en: "Scale levels (e.g. Beginner → Expert) for skills and competencies.",
    ar: "مستويات المقياس (مثل مبتدئ → خبير) للمهارات والكفاءات.",
  },
  certifications: {
    en: "Certification types employees may hold with optional expiry.",
    ar: "أنواع الشهادات التي قد يحملها الموظفون مع انتهاء اختياري.",
  },
  licenses: {
    en: "Professional license definitions with validity periods.",
    ar: "تعريفات التراخيص المهنية مع فترات الصلاحية.",
  },
  languages: {
    en: "Language definitions for employee language proficiency.",
    ar: "تعريفات اللغات لإتقان الموظفين للغات.",
  },
  qualifications: {
    en: "Educational or professional qualification types.",
    ar: "أنواع المؤهلات التعليمية أو المهنية.",
  },
};

export function resolveHrFoundationResourceHelp(resourceKey: string, fallbackDescription: string): BilingualHelp {
  return hrFoundationResourceHelp[resourceKey] ?? { en: fallbackDescription, ar: fallbackDescription };
}

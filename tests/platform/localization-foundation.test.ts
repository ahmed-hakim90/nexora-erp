import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LOCALE,
  directionForLocale,
  htmlLangForLocale,
  parseLocale,
  translate,
} from "@/platform/localization/public-api";

test("parseLocale accepts ar/en and falls back to default", () => {
  assert.equal(parseLocale("ar"), "ar");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("fr"), DEFAULT_LOCALE);
  assert.equal(parseLocale(undefined), DEFAULT_LOCALE);
});

test("direction and html lang follow locale", () => {
  assert.equal(directionForLocale("ar"), "rtl");
  assert.equal(directionForLocale("en"), "ltr");
  assert.equal(htmlLangForLocale("ar"), "ar");
  assert.equal(htmlLangForLocale("en"), "en");
});

test("translate resolves Egyptian Arabic shell chrome messages", () => {
  assert.equal(translate("en", "shell.settings.language"), "Language");
  assert.equal(translate("ar", "shell.settings.language"), "اللغة");
  assert.equal(translate("ar", "shell.search.placeholder"), "دوّر على التطبيقات والأوامر والسجلات...");
  assert.equal(
    translate("ar", "shell.user.menuOpen", { name: "أحمد" }),
    "افتح قائمة المستخدم لـ أحمد",
  );
});

test("translate resolves app and workspace navigation group labels", () => {
  assert.equal(translate("ar", "apps.hr"), "الموارد البشرية");
  assert.equal(translate("ar", "nav.group.attendance"), "الحضور");
  assert.equal(translate("ar", "workspace.nav.quickAccess"), "وصول سريع");
});

test("translate resolves HR page chrome messages", () => {
  assert.equal(translate("ar", "hr.employees.title"), "الموظفين");
  assert.equal(translate("ar", "hr.leave.title"), "إدارة الإجازات");
  assert.equal(translate("ar", "hr.attendance.live.title"), "مراقبة الحضور المباشر");
  assert.equal(translate("ar", "hr.payrollReadiness.title"), "جاهزية الرواتب");
  assert.equal(
    translate("ar", "hr.employees.bulk.selected", { count: 3 }),
    "3 محدد",
  );
});

test("translate resolves attendance devices and operational HR chrome", () => {
  assert.equal(translate("ar", "hr.attendance.devices.title"), "أجهزة الحضور");
  assert.equal(translate("ar", "hr.attendance.live.kpi.lateToday"), "تأخير النهاردة");
  assert.equal(translate("ar", "hr.shifts.title"), "إدارة الورديات");
  assert.equal(translate("ar", "hr.contracts.title"), "العقود");
  assert.equal(translate("ar", "hr.advances.title"), "السلف");
  assert.equal(translate("ar", "hr.assignments.create"), "إنشاء تعيين");
});

test("translate resolves overtime, late-early, settings, and financial HR chrome", () => {
  assert.equal(translate("ar", "hr.overtime.title"), "الوقت الإضافي");
  assert.equal(translate("ar", "hr.overtime.tab.candidates"), "المرشحين");
  assert.equal(translate("ar", "hr.lateEarly.title"), "التأخير والانصراف المبكر");
  assert.equal(translate("ar", "hr.lateEarly.reports.title"), "تقارير التأخير والانصراف المبكر");
  assert.equal(translate("ar", "hr.settings.title"), "إعدادات الموارد البشرية");
  assert.equal(translate("ar", "hr.compensation.title"), "التعويضات");
  assert.equal(translate("ar", "hr.bonuses.title"), "المكافآت");
  assert.equal(translate("ar", "hr.loans.title"), "القروض");
  assert.equal(translate("ar", "hr.attendance.devices.card.controlCenter"), "مركز التحكم");
  assert.equal(translate("ar", "hr.common.viewProfile"), "عرض الملف");
  assert.equal(translate("ar", "hr.recruitment.title"), "التوظيف");
  assert.equal(translate("ar", "hr.onboarding.title"), "التأهيل");
  assert.equal(translate("ar", "hr.bonuses.add"), "إضافة مكافأة");
  assert.equal(translate("ar", "hr.loans.disburse"), "صرف");
  assert.equal(translate("ar", "hr.penalties.acknowledge"), "إقرار");
  assert.equal(translate("ar", "hr.bankAccounts.add"), "إضافة حساب");
  assert.equal(translate("ar", "hr.compensation.addComponent"), "إضافة مكوّن");
  assert.equal(translate("ar", "hr.overtime.submit"), "تقديم وقت إضافي");
  assert.equal(translate("ar", "hr.lateEarly.createPolicy"), "إنشاء سياسة");
  assert.equal(translate("ar", "hr.settings.emptyLeaveTypes"), "مفيش أنواع إجازات لسه. أنشئ واحد لتفعيل طلبات الإجازة.");
  assert.equal(translate("ar", "hr.settings.modal.createPayrollPeriod"), "إنشاء فترة رواتب");
  assert.equal(translate("ar", "hr.attendance.processing.queueTitle"), "طابور الموافقة");
  assert.equal(translate("ar", "hr.attendance.devices.drawer.editDevice"), "تعديل الجهاز");
  assert.equal(translate("ar", "hr.attendance.devices.form.createTitle"), "تسجيل جهاز");
  assert.equal(translate("ar", "hr.settings.tab.contractTypes"), "أنواع العقود");
  assert.equal(translate("ar", "hr.attendance.devices.sync.title"), "مزامنة الجهاز المتقدمة");
  assert.equal(
    translate("ar", "hr.settings.expiryScanBanner", { total: 5, contracts: "2", documents: "1", probation: "2" }),
    "تم جدولة فحص انتهاء الصلاحية لـ 5 تنبيه: عقود 2، مستندات 1، تجربة 2.",
  );
});

test("translate resolves HR dashboard, employee wizard, contracts, and recruitment chrome", () => {
  assert.equal(translate("ar", "hr.dashboard.title"), "لوحة الموارد البشرية");
  assert.equal(translate("ar", "hr.dashboard.quick.addEmployee"), "إضافة موظف");
  assert.equal(translate("ar", "hr.employees.wizard.title"), "إضافة موظف");
  assert.equal(translate("ar", "hr.employees.wizard.step.basics"), "أساسيات الموظف");
  assert.equal(translate("ar", "hr.contracts.create"), "إنشاء عقد");
  assert.equal(translate("ar", "hr.contracts.expiring", { count: 3 }), "3 عقود هتنتهي خلال 60 يوم.");
  assert.equal(translate("ar", "hr.recruitment.form.createVacancy"), "إنشاء شاغر");
  assert.equal(translate("ar", "hr.common.email"), "البريد الإلكتروني");
  assert.equal(translate("ar", "hr.common.phone"), "الهاتف");
});

test("translate resolves talent, performance, assignments, and employee profile chrome", () => {
  assert.equal(translate("ar", "hr.performance.form.create"), "إنشاء دورة تقييم");
  assert.equal(translate("ar", "hr.succession.form.create"), "إنشاء خطة");
  assert.equal(translate("ar", "hr.talent.form.createProgram"), "إنشاء برنامج");
  assert.equal(translate("ar", "hr.assignments.quick.changeDepartment"), "تغيير القسم");
  assert.equal(translate("ar", "hr.employees.edit.saveChanges"), "حفظ التغييرات");
  assert.equal(translate("ar", "hr.employees.profile.overview"), "نظرة عامة");
  assert.equal(translate("ar", "hr.payrollReadiness.reopenReason"), "سبب إعادة الفتح");
});

test("translate resolves shifts, import, and attendance-leave chrome", () => {
  assert.equal(translate("ar", "hr.shifts.form.createShift"), "إنشاء وردية");
  assert.equal(translate("ar", "hr.employees.import.title"), "استيراد الموظفين");
  assert.equal(translate("ar", "hr.attendanceLeave.title"), "الحضور والإجازات");
  assert.equal(translate("ar", "hr.attendance.live.searchPlaceholder"), "موظف، كود");
  assert.equal(translate("ar", "hr.employees.import.confirm", { count: 5 }), "تأكيد الاستيراد (5)");
});

test("translate resolves employee profile, leave reports, and dashboard alerts", () => {
  assert.equal(translate("ar", "hr.employees.profile.quickActions"), "إجراءات سريعة");
  assert.equal(translate("ar", "hr.leave.reports.title"), "تقارير الإجازات");
  assert.equal(translate("ar", "hr.dashboard.alert.leavePending", { count: 2 }), "2 طلب إجازة في انتظار الموافقة");
  assert.equal(
    translate("ar", "hr.dashboard.queue.leave", { employee: "أحمد", date: "2026-07-01" }),
    "إجازة أحمد من 2026-07-01",
  );
});

test("translate resolves operational workspaces and HR status catalog", () => {
  assert.equal(translate("ar", "hr.documents.title"), "المستندات");
  assert.equal(translate("ar", "hr.requests.title"), "الطلبات");
  assert.equal(translate("ar", "hr.common.status.under_review"), "قيد المراجعة");
  assert.equal(translate("ar", "hr.documentType.national_id"), "الرقم القومي");
  assert.equal(translate("ar", "hr.requestType.leave"), "طلب إجازة");
});

test("translate resolves attendance export and live monitor chrome", () => {
  assert.equal(translate("ar", "hr.attendance.export.title"), "تصدير الحضور");
  assert.equal(translate("ar", "hr.attendance.live.drawer.todayTimeline"), "خط اليوم");
  assert.equal(translate("ar", "hr.attendance.live.status.present"), "حاضر");
  assert.equal(translate("ar", "hr.foundation.searchPlaceholder"), "بحث بالكود أو الاسم");
});

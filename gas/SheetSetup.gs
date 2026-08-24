/**
 * دوال إنشاء الجداول في قاعدة البيانات.
 * كل دالة مستقلة وتضيف فقط — لا تحذف ولا تعيد إنشاء أي شيء موجود مسبقًا
 * (Additive only)، التزامًا ببند سلامة البيانات في المعايير الثابتة.
 *
 * Sheet-creation functions. Each one is independent and additive only —
 * nothing existing is ever deleted or recreated.
 */

/**
 * نقطة الدخول الرئيسية للإعداد الأولي لقاعدة البيانات.
 * تُشغَّل يدويًا مرة واحدة من محرر Apps Script (▶ Run) للموافقة على
 * أذونات الوصول للشيت، ثم تُنشئ ورقتي "الرئيسية" و"سجل المراحل".
 * آمنة للتشغيل أكثر من مرة (Idempotent) — لن تكرر الأوراق أو تمسح بياناتها.
 *
 * Main entry point for the initial database setup. Run once manually
 * from the Apps Script editor to grant permissions; creates the two
 * base sheets. Safe to re-run — idempotent, never deletes existing data.
 */
function تهيئة_قاعدة_البيانات() {
  إنشاء_ورقة_الرئيسية();
  إنشاء_ورقة_سجل_المراحل();
}

/**
 * ينشئ ورقة "الرئيسية" (نظرة عامة على كل المشاريع) إن لم تكن موجودة.
 * Creates the "الرئيسية" overview sheet if it doesn't already exist.
 */
function إنشاء_ورقة_الرئيسية() {
  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة = الحصول_على_ورقة_أو_إنشاؤها(الملف, اسم_ورقة_الرئيسية);

  تنسيق_الجدول(ورقة, أعمدة_الرئيسية);

  const رقم_عمود_الحالة_العامة = أعمدة_الرئيسية.indexOf('الحالة العامة') + 1;
  إضافة_قائمة_منسدلة(ورقة, رقم_عمود_الحالة_العامة, قيم_الحالة_العامة);
}

/**
 * ينشئ ورقة "سجل المراحل" (مرجع خطط الإصلاح متعددة المراحل) إن لم تكن موجودة.
 * Creates the "سجل المراحل" multi-stage plan log sheet if it doesn't exist.
 */
function إنشاء_ورقة_سجل_المراحل() {
  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة = الحصول_على_ورقة_أو_إنشاؤها(الملف, اسم_ورقة_سجل_المراحل);

  تنسيق_الجدول(ورقة, أعمدة_سجل_المراحل);

  const رقم_عمود_حالة_المرحلة = أعمدة_سجل_المراحل.indexOf('حالة المرحلة') + 1;
  إضافة_قائمة_منسدلة(ورقة, رقم_عمود_حالة_المرحلة, قيم_حالة_المرحلة);
}

/**
 * ينشئ ورقة تفاصيل مشروع جديد باسم المشروع نفسه (إن لم تكن موجودة مسبقًا)،
 * وتُستدعى هذه الدالة لاحقًا عند إضافة كل مشروع جديد لقاعدة البيانات.
 * لا تُنفَّذ تلقائيًا ضمن تهيئة_قاعدة_البيانات لأنها تحتاج اسم مشروع فعليًا.
 *
 * Creates a per-project detail sheet named after the project (if it
 * doesn't already exist). Called later whenever a new project is added —
 * intentionally NOT run automatically during initial setup, since it
 * needs an actual project name.
 *
 * @param {string} اسم_المشروع
 */
function إنشاء_جدول_تفاصيل_مشروع(اسم_المشروع) {
  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة = الحصول_على_ورقة_أو_إنشاؤها(الملف, اسم_المشروع);

  تنسيق_الجدول(ورقة, أعمدة_تفاصيل_المشروع);

  إضافة_قائمة_منسدلة(ورقة, أعمدة_تفاصيل_المشروع.indexOf('نوع الحالة') + 1, قيم_نوع_الحالة);
  إضافة_قائمة_منسدلة(ورقة, أعمدة_تفاصيل_المشروع.indexOf('شدة الحالة') + 1, قيم_شدة_الحالة);
  إضافة_قائمة_منسدلة(ورقة, أعمدة_تفاصيل_المشروع.indexOf('القرار') + 1, قيم_القرار);
  إضافة_قائمة_منسدلة(ورقة, أعمدة_تفاصيل_المشروع.indexOf('حالة التنفيذ') + 1, قيم_حالة_التنفيذ);

  تلوين_شدة_الحالة_شرطيًا(ورقة, أعمدة_تفاصيل_المشروع.indexOf('شدة الحالة') + 1);

  return ورقة;
}

/**
 * دالة مساعدة: تُرجع الورقة إن كانت موجودة، أو تنشئها إن لم تكن —
 * دون المساس بأي ورقة أو بيانات أخرى في الملف.
 *
 * Helper: returns the sheet if it exists, otherwise creates it —
 * without touching any other sheet or existing data.
 *
 * @param {Spreadsheet} الملف
 * @param {string} الاسم
 * @return {Sheet}
 */
function الحصول_على_ورقة_أو_إنشاؤها(الملف, الاسم) {
  return الملف.getSheetByName(الاسم) || الملف.insertSheet(الاسم);
}

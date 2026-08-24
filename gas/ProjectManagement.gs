/**
 * دوال إدارة المشاريع: إضافة مشروع جديد لقاعدة البيانات.
 * دالة `إضافة_مشروع_جديد` عامة وقابلة لإعادة الاستخدام — ستُستخدم لاحقًا
 * من واجهة إضافة المشاريع (البطاقة) في الموقع، بدل تكرار نفس المنطق.
 *
 * Project management functions: adding a new project to the database.
 * `إضافة_مشروع_جديد` is generic and reusable — it will later be called
 * from the web UI's "add project" form as well, instead of duplicating logic.
 */

/**
 * يضيف مشروعًا جديدًا: صف في جدول "الرئيسية" + جدول تفاصيل فارغ خاص به.
 * آمنة للتشغيل أكثر من مرة لنفس المشروع (Idempotent) — لا تكرر الصف
 * ولا تعيد إنشاء جدول التفاصيل إن كان موجودًا مسبقًا.
 *
 * Adds a new project: a row in the "الرئيسية" sheet + its own empty
 * detail sheet. Safe to re-run for the same project — idempotent.
 *
 * @param {string} اسم_المشروع
 * @param {string} رابط_الموقع
 */
function إضافة_مشروع_جديد(اسم_المشروع, رابط_الموقع) {
  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة_الرئيسية = الحصول_على_ورقة_أو_إنشاؤها(الملف, اسم_ورقة_الرئيسية);
  تنسيق_الجدول(ورقة_الرئيسية, أعمدة_الرئيسية);

  // لا تكرر المشروع إن كان موجودًا بالفعل في الجدول
  // Skip if the project already has a row
  if (!البحث_عن_صف_المشروع(ورقة_الرئيسية, اسم_المشروع)) {
    const رقم_عمود_الاسم = أعمدة_الرئيسية.indexOf('اسم المشروع') + 1;
    const رقم_عمود_الرابط = أعمدة_الرئيسية.indexOf('رابط الموقع') + 1;
    const رقم_عمود_عدد_الأخطاء = أعمدة_الرئيسية.indexOf('عدد الأخطاء المفتوحة') + 1;
    const رقم_عمود_عدد_الخطط = أعمدة_الرئيسية.indexOf('عدد الخطط بانتظار الموافقة') + 1;
    const رقم_عمود_الجدول_التفصيلي = أعمدة_الرئيسية.indexOf('اسم الجدول التفصيلي') + 1;

    const صف_جديد = ورقة_الرئيسية.getLastRow() + 1;
    ورقة_الرئيسية.getRange(صف_جديد, رقم_عمود_الاسم).setValue(اسم_المشروع);
    ورقة_الرئيسية.getRange(صف_جديد, رقم_عمود_الرابط).setValue(رابط_الموقع);
    // عدد الأخطاء وعدد الخطط = صفر فعليًا الآن (لا توجد حالات مسجلة بعد)
    // Both counts are genuinely 0 right now (no cases logged yet)
    ورقة_الرئيسية.getRange(صف_جديد, رقم_عمود_عدد_الأخطاء).setValue(0);
    ورقة_الرئيسية.getRange(صف_جديد, رقم_عمود_عدد_الخطط).setValue(0);
    ورقة_الرئيسية.getRange(صف_جديد, رقم_عمود_الجدول_التفصيلي).setValue(اسم_المشروع);
    // الحالة العامة ونسبة السلامة وآخر فحص تُترك فارغة حتى يشتغل الفحص الآلي
    // "الحالة العامة" / "نسبة السلامة" / "آخر فحص" are left empty until
    // the automated check actually runs and produces real values.

    تنسيق_الجدول(ورقة_الرئيسية, أعمدة_الرئيسية);
  }

  إنشاء_جدول_تفاصيل_مشروع(اسم_المشروع);
}

/**
 * يبحث عن رقم صف مشروع معيّن في ورقة "الرئيسية" بالاسم.
 * يُرجع رقم الصف إن وُجد، أو null إن لم يكن مسجّلًا بعد.
 *
 * Finds the row number of a given project by name in the "الرئيسية" sheet.
 * Returns the row number if found, or null if not registered yet.
 *
 * @param {Sheet} ورقة_الرئيسية
 * @param {string} اسم_المشروع
 * @return {number|null}
 */
function البحث_عن_صف_المشروع(ورقة_الرئيسية, اسم_المشروع) {
  const رقم_عمود_الاسم = أعمدة_الرئيسية.indexOf('اسم المشروع') + 1;
  const آخر_صف = ورقة_الرئيسية.getLastRow();
  if (آخر_صف < 2) return null;

  const الأسماء = ورقة_الرئيسية.getRange(2, رقم_عمود_الاسم, آخر_صف - 1, 1).getValues();
  for (let i = 0; i < الأسماء.length; i++) {
    if (الأسماء[i][0] === اسم_المشروع) return i + 2;
  }
  return null;
}

/**
 * تهيئة لمرة واحدة: تسجّل مشاريع محمد الحالية الأربعة في قاعدة البيانات.
 * تُشغَّل يدويًا مرة واحدة من محرر Apps Script. آمنة لإعادة التشغيل.
 *
 * One-time seed: registers Mohammed's four current projects in the
 * database. Run once manually from the Apps Script editor. Safe to re-run.
 */
function إضافة_المشاريع_الأولية() {
  const المشاريع_الحالية = [
    { اسم: 'سهم', رابط: 'https://malsllami.github.io/share/' },
    { اسم: 'عائلة السلامي فخذ العافاريت', رابط: 'https://malsllami.github.io/alsallami-family/' },
    { اسم: 'احداثيات المحطات', رابط: 'https://malsllami.github.io/Maps-of-Substations/' },
    { اسم: 'تصاريح العمل - PTW - SFT', رابط: 'https://malsllami.github.io/Permits-PTW-SFT/' }
  ];

  المشاريع_الحالية.forEach(function (مشروع) {
    إضافة_مشروع_جديد(مشروع.اسم, مشروع.رابط);
  });
}

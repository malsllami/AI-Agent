/**
 * واجهة برمجة التطبيقات (API) الخاصة بلوحة الويب — نقطة الاتصال الوحيدة
 * بين موقع GitHub Pages وقاعدة البيانات، عبر Google Apps Script فقط.
 *
 * يوفّر: تسجيل دخول بكلمة مرور واحدة، قراءة نظرة عامة على المشاريع،
 * قراءة الحالات بانتظار القرار، وتحديث قرار محمد على حالة معيّنة فقط
 * (تسجيل القرار وحده — بلا أي تنفيذ فعلي تلقائي على أي مشروع آخر).
 *
 * Web dashboard API — the sole connection point between the GitHub
 * Pages site and the database, through Google Apps Script only.
 */

// اسم الخاصية في Script Properties التي تحمل كلمة مرور لوحة الويب
const مفتاح_كلمة_مرور_اللوحة = 'كلمة_مرور_لوحة_الويب';

// مدة صلاحية جلسة الدخول (بالثواني) — 6 ساعات
const مدة_صلاحية_الجلسة_ثانية = 6 * 60 * 60;

/** فحص بسيط أن الخدمة تعمل — لا يتطلب أي مصادقة */
function doGet(e) {
  return استجابة_json_({ status: 'ok' });
}

/**
 * نقطة الدخول الرئيسية لكل طلبات اللوحة. تقرأ الجسم كنص عادي (وليس
 * JSON مباشرة من postData) لتوافق مع طلبات fetch من متصفح بدون رأس
 * Content-Type مخصّص (يتجنّب Preflight الخاص بـ CORS — نفس أسلوب
 * مشروع سهم المُجرَّب فعليًا).
 */
function doPost(e) {
  let طلب;
  try {
    طلب = JSON.parse(e.postData.contents);
  } catch (خطأ) {
    return استجابة_json_({ error: 'طلب غير صالح' });
  }

  const الإجراء = طلب.action;
  const بيانات = طلب.data || {};

  try {
    switch (الإجراء) {
      case 'تسجيل_الدخول':
        return استجابة_json_(تسجيل_الدخول_(بيانات.كلمة_المرور));

      case 'جلب_النظرة_العامة':
        return استجابة_json_(مع_تحقق_الجلسة_(بيانات.توكن, جلب_النظرة_العامة_));

      case 'جلب_الحالات_بانتظار_القرار':
        return استجابة_json_(مع_تحقق_الجلسة_(بيانات.توكن, جلب_الحالات_بانتظار_القرار_));

      case 'تحديث_قرار_حالة':
        return استجابة_json_(مع_تحقق_الجلسة_(بيانات.توكن, function () {
          return تحديث_قرار_حالة_(بيانات.اسم_المشروع, بيانات.رقم_الحالة, بيانات.القرار);
        }));

      default:
        return استجابة_json_({ error: 'إجراء غير معروف: ' + الإجراء });
    }
  } catch (خطأ) {
    return استجابة_json_({ error: خطأ.toString() });
  }
}

/** يبني استجابة JSON نصية موحّدة */
function استجابة_json_(كائن) {
  return ContentService.createTextOutput(JSON.stringify(كائن)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * يتحقق من صحة كلمة المرور، ويُصدر توكن جلسة عشوائي صالح لمدة محدودة
 * عند النجاح — يُخزَّن التوكن في CacheService فقط (لا يُخزَّن في أي جدول).
 */
function تسجيل_الدخول_(كلمة_المرور) {
  const كلمة_المرور_الصحيحة = PropertiesService.getScriptProperties().getProperty(مفتاح_كلمة_مرور_اللوحة);
  if (!كلمة_المرور_الصحيحة) {
    return { error: 'لم تُضبَط كلمة مرور اللوحة بعد من محرر Apps Script' };
  }
  if (كلمة_المرور !== كلمة_المرور_الصحيحة) {
    return { error: 'كلمة المرور غير صحيحة' };
  }

  const توكن = Utilities.getUuid();
  CacheService.getScriptCache().put('جلسة_' + توكن, 'صالحة', مدة_صلاحية_الجلسة_ثانية);
  return { success: true, توكن: توكن };
}

/**
 * يتحقق أن التوكن يمثّل جلسة صالحة قبل تنفيذ أي دالة تتطلب دخولًا —
 * يمنع أي وصول لبيانات المشاريع أو تحديث أي قرار بدون تسجيل دخول ناجح.
 *
 * @param {string} توكن
 * @param {function():Object} دالة
 * @return {Object}
 */
function مع_تحقق_الجلسة_(توكن, دالة) {
  if (!توكن || !CacheService.getScriptCache().get('جلسة_' + توكن)) {
    return { error: 'الجلسة منتهية أو غير صالحة — الرجاء تسجيل الدخول من جديد' };
  }
  return دالة();
}

/**
 * يُرجع نظرة عامة على كل المشاريع من جدول "الرئيسية" — مخزَّن مؤقتًا
 * (300 ثانية) لتسريع اللوحة بدل قراءة الشيت في كل طلب، حسب معيار
 * التخزين المؤقت المعتمد.
 */
function جلب_النظرة_العامة_() {
  const مفتاح_الكاش = 'نظرة_عامة_المشاريع';
  const مخزَّن = CacheService.getScriptCache().get(مفتاح_الكاش);
  if (مخزَّن) return { success: true, مشاريع: JSON.parse(مخزَّن) };

  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة_الرئيسية = الملف.getSheetByName(اسم_ورقة_الرئيسية);
  const آخر_صف = ورقة_الرئيسية.getLastRow();
  const صفوف = آخر_صف < 2 ? [] : ورقة_الرئيسية.getRange(2, 1, آخر_صف - 1, أعمدة_الرئيسية.length).getValues();

  const مشاريع = صفوف.map(function (صف) {
    const كائن = {};
    أعمدة_الرئيسية.forEach(function (عمود, i) { كائن[عمود] = صف[i]; });
    return كائن;
  });

  CacheService.getScriptCache().put(مفتاح_الكاش, JSON.stringify(مشاريع), 300);
  return { success: true, مشاريع: مشاريع };
}

/**
 * يمرّ على كل مشروع مسجَّل في "الرئيسية"، ويجمع من جدول تفاصيله كل
 * حالة "القرار" فيها لا يزال "بانتظار الرد" — مخزَّن مؤقتًا (300 ثانية).
 */
function جلب_الحالات_بانتظار_القرار_() {
  const مفتاح_الكاش = 'حالات_بانتظار_القرار';
  const مخزَّن = CacheService.getScriptCache().get(مفتاح_الكاش);
  if (مخزَّن) return { success: true, حالات: JSON.parse(مخزَّن) };

  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة_الرئيسية = الملف.getSheetByName(اسم_ورقة_الرئيسية);
  const رقم_عمود_الاسم = أعمدة_الرئيسية.indexOf('اسم المشروع') + 1;
  const آخر_صف_رئيسية = ورقة_الرئيسية.getLastRow();
  const أسماء_المشاريع = آخر_صف_رئيسية < 2 ? [] :
    ورقة_الرئيسية.getRange(2, رقم_عمود_الاسم, آخر_صف_رئيسية - 1, 1).getValues().map(function (صف) { return صف[0]; });

  const رقم_عمود_القرار = أعمدة_تفاصيل_المشروع.indexOf('القرار') + 1;
  let حالات = [];

  أسماء_المشاريع.forEach(function (اسم_المشروع) {
    const ورقة_التفاصيل = الملف.getSheetByName(اسم_المشروع);
    if (!ورقة_التفاصيل) return;
    const آخر_صف = ورقة_التفاصيل.getLastRow();
    if (آخر_صف < 2) return;

    const صفوف = ورقة_التفاصيل.getRange(2, 1, آخر_صف - 1, أعمدة_تفاصيل_المشروع.length).getValues();
    صفوف.forEach(function (صف) {
      if (صف[رقم_عمود_القرار - 1] !== 'بانتظار الرد') return;
      const كائن = { اسم_المشروع: اسم_المشروع };
      أعمدة_تفاصيل_المشروع.forEach(function (عمود, i) { كائن[عمود] = صف[i]; });
      حالات.push(كائن);
    });
  });

  CacheService.getScriptCache().put(مفتاح_الكاش, JSON.stringify(حالات), 300);
  return { success: true, حالات: حالات };
}

/**
 * يحدّث عمود "القرار" فقط لحالة واحدة محدَّدة برقمها، ضمن جدول تفاصيل
 * مشروع معيّن — لا يلمس أي عمود آخر ولا يُنفّذ أي تعديل فعلي على أي
 * مشروع آخر، فقط تسجيل قرار محمد. يُبطل الكاش فورًا بعد الكتابة.
 *
 * @param {string} اسم_المشروع
 * @param {string} رقم_الحالة
 * @param {string} القرار_الجديد يجب أن يكون أحد قيم_القرار المعرَّفة
 */
function تحديث_قرار_حالة_(اسم_المشروع, رقم_الحالة, القرار_الجديد) {
  if (قيم_القرار.indexOf(القرار_الجديد) === -1) {
    return { error: 'قيمة قرار غير صالحة' };
  }

  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة_التفاصيل = الملف.getSheetByName(اسم_المشروع);
  if (!ورقة_التفاصيل) return { error: 'المشروع غير موجود' };

  const رقم_عمود_رقم_الحالة = أعمدة_تفاصيل_المشروع.indexOf('رقم الحالة') + 1;
  const رقم_عمود_القرار = أعمدة_تفاصيل_المشروع.indexOf('القرار') + 1;
  const رقم_عمود_آخر_تحديث = أعمدة_تفاصيل_المشروع.indexOf('تاريخ آخر تحديث') + 1;

  const آخر_صف = ورقة_التفاصيل.getLastRow();
  const أرقام_الحالات = ورقة_التفاصيل.getRange(2, رقم_عمود_رقم_الحالة, آخر_صف - 1, 1).getValues();

  for (let i = 0; i < أرقام_الحالات.length; i++) {
    if (أرقام_الحالات[i][0] === رقم_الحالة) {
      const صف = i + 2;
      ورقة_التفاصيل.getRange(صف, رقم_عمود_القرار).setValue(القرار_الجديد);
      ورقة_التفاصيل.getRange(صف, رقم_عمود_آخر_تحديث).setValue(new Date());
      CacheService.getScriptCache().remove('حالات_بانتظار_القرار');
      return { success: true };
    }
  }

  return { error: 'الحالة غير موجودة' };
}

/**
 * محرك الفحص الدوري الآلي: يفحص كل مشروع مسجّل، يحدّث حالته في جدول
 * "الرئيسية"، ويرسل تقريرًا بالإيميل. يعمل تلقائيًا كل 12 ساعة عبر
 * مشغّل زمني (Trigger) — قراءة وفحص فقط، لا يعدّل أي شيء في المشاريع
 * الأخرى إطلاقًا (لا كتابة، فقط تسجيل دخول وتحميل بيانات للتحقق).
 *
 * Automated periodic check engine: checks every registered project,
 * updates its status in the "الرئيسية" sheet, and emails a report.
 * Runs automatically every 12 hours via a time-based trigger — read-only
 * against the monitored projects (login + data fetch to verify only,
 * never writes anything to them).
 */

// روابط واجهة البرمجة (Web App) الخاصة بكل مشروع
// Each project's Web App API endpoint
const رابط_سهم = 'https://script.google.com/macros/s/AKfycbw349NF15pxwkEdrxp1E87d2dFpPybHD36Rg4t10GF00ch4k33ktWaf2WscA23bRd-3/exec';
const رابط_تصاريح_العمل = 'https://script.google.com/macros/s/AKfycbzjoEvy_CWsYMQ8r3cG7b0W6biDI1vA28s3P6t5dz_f6eZ6Fkn-SvEOKy2wm6KZJTxYFg/exec';
const رابط_احداثيات_المحطات = 'https://script.google.com/macros/s/AKfycbyxZUSLZNa6UlZLINsfAEe8CmQPoNGJbpnNtUDxP019TfL8uLh_5fuP0e5HE6daP8dh1w/exec';

const البريد_المستلم_للتقرير = 'malsllami@gmail.com';

/**
 * نقطة الدخول: تُشغَّل تلقائيًا كل 12 ساعة عبر مشغّل زمني (وتُشغَّل
 * يدويًا أول مرة من محرر Apps Script لاختبارها والموافقة على الأذونات).
 */
function تشغيل_الفحص_الدوري() {
  const نتائج = [
    فحص_سهم_(),
    فحص_تصاريح_العمل_(),
    فحص_عائلة_السلامي_(),
    فحص_احداثيات_المحطات_()
  ];

  نتائج.forEach(function (نتيجة) {
    تحديث_حالة_المشروع_(نتيجة.اسم_المشروع, نتيجة.سليم);
  });

  إرسال_تقرير_الفحص_(نتائج);
}

/**
 * يستدعي واجهة برمجة تطبيقات (API) عبر POST ويُرجع الاستجابة كـJSON.
 * لا يُطلق استثناءً أبدًا — أي خطأ (اتصال/مهلة/JSON غير صالح) يُرجَع
 * كنتيجة فاشلة عادية، حتى لا يتوقف فحص بقية المشاريع بسبب خطأ بواحد.
 *
 * @param {string} الرابط
 * @param {Object} الحمولة
 * @return {{نجح:boolean, بيانات?:Object, خطأ?:string}}
 */
function استدعاء_api_(الرابط, الحمولة) {
  try {
    const استجابة = UrlFetchApp.fetch(الرابط, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(الحمولة),
      muteHttpExceptions: true,
      followRedirects: true
    });
    return { نجح: true, بيانات: JSON.parse(استجابة.getContentText()) };
  } catch (خطأ) {
    return { نجح: false, خطأ: خطأ.toString() };
  }
}

/** فحص "سهم": تسجيل دخول بحساب "فحص تلقائي" + تحميل بيانات أساسية */
function فحص_سهم_() {
  const دخول = استدعاء_api_(رابط_سهم, { action: 'loginByPhone', phone: '+966555555555' });
  if (!دخول.نجح || (دخول.بيانات && دخول.بيانات.error)) {
    return { اسم_المشروع: 'سهم', سليم: false, ملاحظة: 'فشل تسجيل الدخول: ' + وصف_الخطأ_(دخول) };
  }

  const بيانات = استدعاء_api_(رابط_سهم, { action: 'getOverviewBundle' });
  if (!بيانات.نجح || (بيانات.بيانات && بيانات.بيانات.error)) {
    return { اسم_المشروع: 'سهم', سليم: false, ملاحظة: 'فشل تحميل البيانات: ' + وصف_الخطأ_(بيانات) };
  }

  return { اسم_المشروع: 'سهم', سليم: true, ملاحظة: 'تسجيل الدخول وتحميل البيانات يعملان بنجاح' };
}

/** فحص "تصاريح العمل": تسجيل دخول بحساب "فحص تلقائي" + تحميل بيانات أساسية */
function فحص_تصاريح_العمل_() {
  const دخول = استدعاء_api_(رابط_تصاريح_العمل, { action: 'login', data: { employeeId: '000001' } });
  if (!دخول.نجح || !دخول.بيانات || !دخول.بيانات.ok) {
    const رسالة = وصف_الخطأ_(دخول);
    const لم_يُضف_الحساب_بعد = /غير مسجَّل|غير مسجل/.test(رسالة);
    return {
      اسم_المشروع: 'تصاريح العمل - PTW - SFT',
      سليم: لم_يُضف_الحساب_بعد ? null : false,
      ملاحظة: لم_يُضف_الحساب_بعد ? 'الفحص معطّل مؤقتًا — بانتظار إضافة حساب الفحص التلقائي يدويًا (رقم وظيفي 000001)' : ('فشل تسجيل الدخول: ' + رسالة)
    };
  }

  const توكن = دخول.بيانات.result.token;
  const بيانات = استدعاء_api_(رابط_تصاريح_العمل, { action: 'getMyProfile', token: توكن, data: {} });
  if (!بيانات.نجح || !بيانات.بيانات || !بيانات.بيانات.ok) {
    return { اسم_المشروع: 'تصاريح العمل - PTW - SFT', سليم: false, ملاحظة: 'فشل تحميل البيانات: ' + وصف_الخطأ_(بيانات) };
  }

  return { اسم_المشروع: 'تصاريح العمل - PTW - SFT', سليم: true, ملاحظة: 'تسجيل الدخول وتحميل البيانات يعملان بنجاح' };
}

/** فحص "عائلة السلامي": معطّل حتى تتوفر بيانات حساب الفحص (يُضاف يدويًا للشجرة) */
function فحص_عائلة_السلامي_() {
  const كلمة_المرور = PropertiesService.getScriptProperties().getProperty('كلمة_مرور_فحص_عائلة_السلامي');
  if (!كلمة_المرور) {
    return {
      اسم_المشروع: 'عائلة السلامي فخذ العافاريت',
      سليم: null,
      ملاحظة: 'الفحص معطّل مؤقتًا — بانتظار إضافة حساب الفحص التلقائي للشجرة (مؤرشف) وتزويد كلمة المرور'
    };
  }
  // يُستكمل لاحقًا بعد توفر بيانات الحساب: استدعاء دالة تسجيل الدخول
  // الخادمية (Supabase Edge Function) بنفس نمط باقي الفحوصات أعلاه.
  return { اسم_المشروع: 'عائلة السلامي فخذ العافاريت', سليم: null, ملاحظة: 'الفحص لم يُفعَّل بعد' };
}

/** فحص "احداثيات المحطات": تحميل بيانات فقط (تسجيل الدخول غير قابل للفحص الآلي — بصمة إجبارية) */
function فحص_احداثيات_المحطات_() {
  const بيانات = استدعاء_api_(رابط_احداثيات_المحطات, { action: 'getStats' });
  if (!بيانات.نجح || (بيانات.بيانات && بيانات.بيانات.error)) {
    return { اسم_المشروع: 'احداثيات المحطات', سليم: false, ملاحظة: 'فشل تحميل البيانات: ' + وصف_الخطأ_(بيانات) };
  }
  return { اسم_المشروع: 'احداثيات المحطات', سليم: true, ملاحظة: 'تحميل البيانات يعمل بنجاح (تسجيل الدخول غير قابل للفحص الآلي — بصمة إجبارية، مسجَّلة كحالة مفتوحة)' };
}

/** يستخرج نص وصف الخطأ من نتيجة استدعاء_api_ لعرضه بالتقرير */
function وصف_الخطأ_(نتيجة_استدعاء) {
  if (!نتيجة_استدعاء.نجح) return نتيجة_استدعاء.خطأ || 'تعذّر الاتصال';
  const ب = نتيجة_استدعاء.بيانات;
  return (ب && (ب.error || ب.message)) || 'خطأ غير معروف';
}

/**
 * يحدّث "الحالة العامة" و"نسبة السلامة" و"آخر فحص" لمشروع في جدول
 * "الرئيسية" بناءً على نتيجة الفحص. لو كانت هناك حالات/أخطاء مفتوحة
 * مسجَّلة لذلك المشروع، تصير الحالة "تحذير" بدل "سليم" حتى لو الفحص
 * الأساسي نجح — لأن وجود خطأ مسجَّل غير محلول هو تحذير حقيقي بحد ذاته.
 * سليم=null (فحص معطّل مؤقتًا) → لا يُكتب شيء، حفاظًا على عدم كتابة
 * بيانات غير مؤكدة.
 */
function تحديث_حالة_المشروع_(اسم_المشروع, سليم) {
  if (سليم === null) return;

  const الملف = SpreadsheetApp.openById(معرف_الشيت);
  const ورقة_الرئيسية = الملف.getSheetByName(اسم_ورقة_الرئيسية);
  const صف = البحث_عن_صف_المشروع(ورقة_الرئيسية, اسم_المشروع);
  if (!صف) return;

  const رقم_عمود_عدد_الأخطاء = أعمدة_الرئيسية.indexOf('عدد الأخطاء المفتوحة') + 1;
  const عدد_الأخطاء = Number(ورقة_الرئيسية.getRange(صف, رقم_عمود_عدد_الأخطاء).getValue()) || 0;

  const حالة = !سليم ? 'متوقف' : (عدد_الأخطاء > 0 ? 'تحذير' : 'سليم');
  const نسبة = سليم ? 1 : 0;

  const رقم_عمود_الحالة = أعمدة_الرئيسية.indexOf('الحالة العامة') + 1;
  const رقم_عمود_النسبة = أعمدة_الرئيسية.indexOf('نسبة السلامة') + 1;
  const رقم_عمود_آخر_فحص = أعمدة_الرئيسية.indexOf('آخر فحص') + 1;

  ورقة_الرئيسية.getRange(صف, رقم_عمود_الحالة).setValue(حالة);
  ورقة_الرئيسية.getRange(صف, رقم_عمود_النسبة).setValue(نسبة).setNumberFormat('0%');
  ورقة_الرئيسية.getRange(صف, رقم_عمود_آخر_فحص).setValue(new Date());
}

/** يبني ويُرسل تقرير الفحص الدوري كإيميل HTML بجدول ملوّن حسب حالة كل مشروع */
function إرسال_تقرير_الفحص_(نتائج) {
  const الآن = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy/MM/dd HH:mm');

  const صفوف = نتائج.map(function (نتيجة) {
    const لون = نتيجة.سليم === true ? '#5c7a63' : (نتيجة.سليم === false ? '#c0392b' : '#999999');
    const نص_الحالة = نتيجة.سليم === true ? 'سليم' : (نتيجة.سليم === false ? 'متوقف' : 'لم يُفحص');
    const نسبة = نتيجة.سليم === true ? '100%' : (نتيجة.سليم === false ? '0%' : '—');
    return '<tr>' +
      '<td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;font-size:12px;">' + نتيجة.اسم_المشروع + '</td>' +
      '<td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;font-size:12px;color:#fff;background:' + لون + ';">' + نص_الحالة + '</td>' +
      '<td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;font-size:12px;">' + نسبة + '</td>' +
      '<td style="padding:10px;border:1px solid #ddd;text-align:right;font-size:12px;">' + نتيجة.ملاحظة + '</td>' +
      '</tr>';
  }).join('');

  const جسم_الرسالة =
    '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;">' +
    '<h2 style="color:#5c7a63;">تقرير فحص مدير المشاريع الذكي</h2>' +
    '<p>وقت الفحص: ' + الآن + ' (بتوقيت السعودية)</p>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    '<tr style="background:#5c7a63;color:#fff;">' +
    '<th style="padding:10px;border:1px solid #ddd;font-size:12px;">المشروع</th>' +
    '<th style="padding:10px;border:1px solid #ddd;font-size:12px;">الحالة</th>' +
    '<th style="padding:10px;border:1px solid #ddd;font-size:12px;">نسبة السلامة</th>' +
    '<th style="padding:10px;border:1px solid #ddd;font-size:12px;">ملاحظة</th>' +
    '</tr>' +
    صفوف +
    '</table>' +
    '</div>';

  MailApp.sendEmail({
    to: البريد_المستلم_للتقرير,
    subject: 'تقرير فحص مدير المشاريع الذكي — ' + الآن,
    htmlBody: جسم_الرسالة
  });
}

/**
 * يُنشئ مشغّلين زمنيين لتشغيل الفحص الدوري تلقائيًا الساعة 12 منتصف
 * الليل و12 ظهرًا (بتوقيت السعودية) كل يوم. تُشغَّل يدويًا مرة واحدة.
 * تحذف أي مشغلات سابقة لنفس الدالة أولًا لتفادي التكرار عند إعادة التشغيل.
 */
function تفعيل_مشغل_الفحص_الدوري() {
  ScriptApp.getProjectTriggers().forEach(function (مشغل) {
    if (مشغل.getHandlerFunction() === 'تشغيل_الفحص_الدوري') {
      ScriptApp.deleteTrigger(مشغل);
    }
  });

  ScriptApp.newTrigger('تشغيل_الفحص_الدوري').timeBased().atHour(0).everyDays(1).create();
  ScriptApp.newTrigger('تشغيل_الفحص_الدوري').timeBased().atHour(12).everyDays(1).create();
}

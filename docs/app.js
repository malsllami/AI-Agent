// منطق لوحة مدير المشاريع الذكي: تسجيل الدخول، جلب البيانات، بناء
// الواجهة، ومعالجة قرارات محمد على الحالات المفتوحة.
// Smart Project Manager dashboard logic.
import { استدعاء_api } from './services/api.js';
import { تسجيل_الدخول, توكن_الجلسة, تسجيل_الخروج } from './services/auth.js';

const شاشة_الدخول = document.getElementById('شاشة-الدخول');
const اللوحة = document.getElementById('اللوحة');
const نموذج_الدخول = document.getElementById('نموذج-الدخول');
const حقل_كلمة_المرور = document.getElementById('حقل-كلمة-المرور');
const رسالة_خطأ_الدخول = document.getElementById('رسالة-خطأ-الدخول');
const شبكة_المشاريع = document.getElementById('شبكة-المشاريع');
const قسم_الحالات = document.getElementById('قسم-الحالات');
const زر_الخروج = document.getElementById('زر-الخروج');

بدء_التطبيق();

function بدء_التطبيق() {
  if (توكن_الجلسة()) {
    عرض_اللوحة_();
  } else {
    عرض_شاشة_الدخول_();
  }
}

function عرض_شاشة_الدخول_() {
  شاشة_الدخول.classList.remove('hidden');
  اللوحة.classList.add('hidden');
  حقل_كلمة_المرور.focus();
}

async function عرض_اللوحة_() {
  شاشة_الدخول.classList.add('hidden');
  اللوحة.classList.remove('hidden');
  await تحميل_بيانات_اللوحة_();
}

نموذج_الدخول.addEventListener('submit', async function (حدث) {
  حدث.preventDefault();
  رسالة_خطأ_الدخول.textContent = '';
  try {
    await تسجيل_الدخول(حقل_كلمة_المرور.value);
    حقل_كلمة_المرور.value = '';
    عرض_اللوحة_();
  } catch (خطأ) {
    رسالة_خطأ_الدخول.textContent = خطأ.message;
  }
});

زر_الخروج.addEventListener('click', function () {
  تسجيل_الخروج();
  عرض_شاشة_الدخول_();
});

async function تحميل_بيانات_اللوحة_() {
  شبكة_المشاريع.innerHTML = '<div class="loading-note">جارِ تحميل بيانات المشاريع…</div>';
  قسم_الحالات.innerHTML = '';

  try {
    const توكن = توكن_الجلسة();
    const [نظرة_عامة, حالات_معلقة] = await Promise.all([
      استدعاء_api('جلب_النظرة_العامة', { توكن }),
      استدعاء_api('جلب_الحالات_بانتظار_القرار', { توكن })
    ]);

    رسم_بطاقات_المشاريع_(نظرة_عامة.مشاريع || []);
    رسم_قسم_الحالات_(حالات_معلقة.حالات || []);
  } catch (خطأ) {
    // جلسة منتهية أو أي خطأ اتصال آخر — نعيد شاشة الدخول لو كان السبب انتهاء الجلسة
    if (/الجلسة/.test(خطأ.message)) {
      تسجيل_الخروج();
      عرض_شاشة_الدخول_();
      رسالة_خطأ_الدخول.textContent = خطأ.message;
    } else {
      شبكة_المشاريع.innerHTML = '<div class="loading-note">' + خطأ.message + '</div>';
    }
  }
}

function رسم_بطاقات_المشاريع_(مشاريع) {
  if (مشاريع.length === 0) {
    شبكة_المشاريع.innerHTML = '<div class="loading-note">لا توجد مشاريع مسجَّلة بعد</div>';
    return;
  }

  شبكة_المشاريع.innerHTML = مشاريع.map(function (مشروع) {
    const نسبة_عرض = مشروع['نسبة السلامة'] !== '' && مشروع['نسبة السلامة'] !== undefined
      ? Math.round(Number(مشروع['نسبة السلامة']) * 100) : null;
    const صنف_الحلقة = تصنيف_الحلقة_(مشروع['الحالة العامة']);
    const صنف_الوسم = تصنيف_الوسم_(مشروع['الحالة العامة']);
    const نص_الحالة = مشروع['الحالة العامة'] || 'بانتظار أول فحص';
    const نص_آخر_فحص = مشروع['آخر فحص'] ? 'آخر فحص: ' + تنسيق_تاريخ_(مشروع['آخر فحص']) : 'لم يُفحص بعد';

    // تدرج دائري (Conic Gradient) يرسم فعليًا نسبة السلامة حول الحلقة،
    // بلون يطابق حالة المشروع (أخضر=سليم، طيني=تحذير، أحمر=متوقف)
    const ألوان_الحلقة = {
      ok: ['var(--sage)', 'var(--sage-l)'],
      warn: ['var(--clay)', 'var(--clay-l)'],
      down: ['var(--danger)', 'var(--danger-l)'],
      unknown: ['var(--muted)', 'var(--bg)']
    };
    const [لون_تقدم, لون_خلفية] = ألوان_الحلقة[صنف_الحلقة];
    const نمط_الحلقة = 'background:conic-gradient(' + لون_تقدم + ' ' + (نسبة_عرض || 0) + '%,' + لون_خلفية + ' 0)';

    return '<div class="proj">' +
      '<div class="ring ' + صنف_الحلقة + '" style="' + نمط_الحلقة + '"><span>' + (نسبة_عرض !== null ? نسبة_عرض + '٪' : '؟') + '</span></div>' +
      '<div class="p-name">' + مشروع['اسم المشروع'] + '</div>' +
      '<div class="p-status">' + نص_آخر_فحص + '</div>' +
      '<div class="p-tag ' + صنف_الوسم + '">' + نص_الحالة + '</div>' +
      (مشروع['رابط الموقع'] ? '<a class="p-link" href="' + مشروع['رابط الموقع'] + '" target="_blank" rel="noopener">فتح الموقع ↗</a>' : '') +
      '</div>';
  }).join('');
}

function تصنيف_الحلقة_(حالة) {
  if (حالة === 'سليم') return 'ok';
  if (حالة === 'تحذير') return 'warn';
  if (حالة === 'متوقف') return 'down';
  return 'unknown';
}
function تصنيف_الوسم_(حالة) {
  if (حالة === 'سليم') return 'ok';
  if (حالة === 'تحذير') return 'watch';
  if (حالة === 'متوقف') return 'down';
  return 'watch';
}

function تنسيق_تاريخ_(نص_تاريخ) {
  try {
    return new Date(نص_تاريخ).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (خطأ) {
    return نص_تاريخ;
  }
}

function رسم_قسم_الحالات_(حالات) {
  const عنوان =
    '<div class="sec-title"><span class="dot"></span> خطط بانتظار قرارك (' + حالات.length + ')</div>';

  if (حالات.length === 0) {
    قسم_الحالات.innerHTML = '<div class="section">' + عنوان +
      '<div class="empty-note">لا توجد حالات بانتظار قرارك حاليًا 🎉</div></div>';
    return;
  }

  قسم_الحالات.innerHTML = '<div class="section">' + عنوان +
    حالات.map(function (حالة, فهرس) { return بطاقة_حالة_(حالة, فهرس); }).join('') + '</div>';

  قسم_الحالات.querySelectorAll('[data-قرار]').forEach(function (زر) {
    زر.addEventListener('click', معالجة_قرار_);
  });
  قسم_الحالات.querySelectorAll('[data-فهرس]').forEach(function (زر) {
    زر.addEventListener('click', function () {
      نسخ_تفاصيل_الحالة_(حالات[Number(زر.dataset.فهرس)], زر);
    });
  });
}

/**
 * ينسخ نصًا جاهزًا يحوي كل تفاصيل الحالة إلى الحافظة، ليُلصَق مباشرة
 * في محادثة جديدة مع Claude Code لمناقشتها بالتفصيل — بدل الحاجة
 * لفتح الشيت يدويًا ونسخ كل حقل على حدة.
 */
async function نسخ_تفاصيل_الحالة_(حالة, زر) {
  const نص =
    'أريد مناقشة هذه الحالة من مدير المشاريع الذكي:\n\n' +
    'المشروع: ' + حالة.اسم_المشروع + '\n' +
    'رقم الحالة: ' + حالة['رقم الحالة'] + '\n' +
    'نوع الحالة: ' + حالة['نوع الحالة'] + '\n' +
    'شدة الحالة: ' + حالة['شدة الحالة'] + '\n' +
    'الوصف: ' + حالة['الوصف'] + '\n' +
    'الخطة المقترحة: ' + حالة['الخطة المقترحة'];

  try {
    await navigator.clipboard.writeText(نص);
    const نص_الزر_الأصلي = زر.textContent;
    زر.textContent = 'تم النسخ ✓';
    زر.disabled = true;
    setTimeout(function () { زر.textContent = نص_الزر_الأصلي; زر.disabled = false; }, 2000);
  } catch (خطأ) {
    alert('تعذّر النسخ التلقائي — انسخ التفاصيل يدويًا:\n\n' + نص);
  }
}

function بطاقة_حالة_(حالة, فهرس) {
  const مُعرِّف = حالة['رقم الحالة'];
  return '<div class="plan-item" data-حالة="' + مُعرِّف + '" data-مشروع="' + حالة.اسم_المشروع + '">' +
    '<div class="p-badge">' + حالة.اسم_المشروع + ' — ' + حالة['شدة الحالة'] + '</div>' +
    '<div class="error-box">' +
    '<div class="box-label">⚠ المشكلة</div>' +
    '<div class="t">' + حالة['نوع الحالة'] + '</div>' +
    '<div class="d">' + حالة['الوصف'] + '</div>' +
    '</div>' +
    '<div class="solution-box">' +
    '<div class="box-label">✓ الحل المقترح</div>' +
    '<div class="d">' + حالة['الخطة المقترحة'] + '</div>' +
    '</div>' +
    '<div class="btn-row">' +
    '<button class="btn approve" data-قرار="موافقة">موافقة</button>' +
    '<button class="btn revise" data-قرار="تعديل مطلوب">تعديل مطلوب</button>' +
    '<button class="btn reject" data-قرار="رفض">رفض</button>' +
    '<button class="btn discuss" data-فهرس="' + فهرس + '">مناقشة التفاصيل (نسخ)</button>' +
    '</div>' +
    '<div class="decision-note hidden"></div>' +
    '</div>';
}

async function معالجة_قرار_(حدث) {
  const زر = حدث.currentTarget;
  const بطاقة = زر.closest('.plan-item');
  const أزرار_القرار = بطاقة.querySelectorAll('[data-قرار]');
  const ملاحظة = بطاقة.querySelector('.decision-note');
  const القرار = زر.dataset.قرار;

  أزرار_القرار.forEach(function (ز) { ز.disabled = true; });

  try {
    await استدعاء_api('تحديث_قرار_حالة', {
      توكن: توكن_الجلسة(),
      اسم_المشروع: بطاقة.dataset.مشروع,
      رقم_الحالة: بطاقة.dataset.حالة,
      القرار: القرار
    });

    const صنف = القرار === 'موافقة' ? 'approve' : (القرار === 'رفض' ? 'reject' : 'revise');
    ملاحظة.textContent = '✓ تم تسجيل قرارك: ' + القرار;
    ملاحظة.className = 'decision-note ' + صنف;
  } catch (خطأ) {
    ملاحظة.textContent = 'تعذّر حفظ القرار: ' + خطأ.message;
    ملاحظة.className = 'decision-note reject';
    أزرار_القرار.forEach(function (ز) { ز.disabled = false; });
  }
}

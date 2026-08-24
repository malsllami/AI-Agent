// عميل موحّد للاتصال بخلفية Apps Script — POST بدون رأس Content-Type
// مخصّص لتفادي CORS Preflight (نفس أسلوب مشروع سهم المُجرَّب فعليًا).
// Unified Apps Script backend client — POST without a custom
// Content-Type header to avoid a CORS preflight (same proven pattern
// used in the "سهم" project).
import { API_BASE_URL } from '../config/config.js';

const مهلة_الطلب_مللي = 25000;
const تأخير_إعادة_المحاولة_مللي = 800;

async function محاولة_اتصال_(body) {
  const controller = new AbortController();
  const مؤقت = setTimeout(() => controller.abort(), مهلة_الطلب_مللي);
  let رد;
  try {
    رد = await fetch(API_BASE_URL, { method: 'POST', body, signal: controller.signal });
  } catch (خطأ) {
    return { نوع: خطأ.name === 'AbortError' ? 'مهلة' : 'شبكة' };
  } finally {
    clearTimeout(مؤقت);
  }
  if (!رد.ok) return { نوع: 'http' };
  return { نوع: 'نجاح', رد };
}

/**
 * يستدعي إجراءً في خلفية مدير المشاريع الذكي، مع إعادة محاولة تلقائية
 * واحدة عند فشل شبكي عابر — يعيد رمي خطأ برسالة عربية واضحة عند الفشل
 * النهائي، أو يُرجع بيانات الخادم عند النجاح.
 *
 * @param {string} إجراء
 * @param {Object} [بيانات]
 * @return {Promise<Object>}
 */
export async function استدعاء_api(إجراء, بيانات = {}) {
  const جسم = JSON.stringify({ action: إجراء, data: بيانات });

  let نتيجة = await محاولة_اتصال_(جسم);
  if (نتيجة.نوع !== 'نجاح') {
    await new Promise(resolve => setTimeout(resolve, تأخير_إعادة_المحاولة_مللي));
    نتيجة = await محاولة_اتصال_(جسم);
  }

  if (نتيجة.نوع === 'مهلة') throw new Error('استغرق الخادم وقتًا طويلًا للرد — حاول مرة أخرى');
  if (نتيجة.نوع === 'شبكة') throw new Error('تعذّر الاتصال بالخادم — تحقق من الإنترنت');
  if (نتيجة.نوع === 'http') throw new Error('تعذّر الاتصال بالخادم');

  let بيانات_الرد;
  try {
    بيانات_الرد = await نتيجة.رد.json();
  } catch (خطأ) {
    throw new Error('تعذّر قراءة رد الخادم — حاول مرة أخرى');
  }

  if (بيانات_الرد && بيانات_الرد.error) {
    throw new Error(بيانات_الرد.error);
  }
  return بيانات_الرد;
}

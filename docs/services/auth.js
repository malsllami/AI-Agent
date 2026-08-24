// إدارة جلسة الدخول للوحة — تخزين توكن الجلسة محليًا في المتصفح فقط
// Dashboard session management — session token stored locally only
import { استدعاء_api } from './api.js';

const مفتاح_التخزين = 'مدير_المشاريع_الذكي_توكن';

/** يحاول تسجيل الدخول بكلمة المرور، ويحفظ التوكن محليًا عند النجاح */
export async function تسجيل_الدخول(كلمة_المرور) {
  const نتيجة = await استدعاء_api('تسجيل_الدخول', { كلمة_المرور });
  localStorage.setItem(مفتاح_التخزين, نتيجة.توكن);
  return نتيجة;
}

/** يقرأ توكن الجلسة المحفوظ محليًا — null إن لم يكن مسجَّلًا دخوله */
export function توكن_الجلسة() {
  return localStorage.getItem(مفتاح_التخزين);
}

/** تسجيل خروج: مسح التوكن المحلي فقط (الجلسة بالخادم تنتهي تلقائيًا بمدتها) */
export function تسجيل_الخروج() {
  localStorage.removeItem(مفتاح_التخزين);
}

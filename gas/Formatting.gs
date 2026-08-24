/**
 * دوال التنسيق المشتركة — تُستخدم من قِبل كل دوال إنشاء الجداول
 * لتفادي تكرار نفس منطق التنسيق في أكثر من مكان (Clean Code / DRY).
 *
 * Shared formatting helpers reused by every sheet-creation function,
 * so the formatting logic is written once and stays consistent.
 */

/**
 * يطبّق التنسيق الأساسي الموحّد على أي ورقة: صف أول ثابت وملوّن،
 * محاذاة وسط لكل الخلايا، خط عريض حجم 12، وضبط عرض الأعمدة تلقائيًا.
 *
 * Applies the standard look to any sheet: a frozen + colored header row,
 * centered alignment everywhere, bold size-12 font, and auto-resized columns.
 *
 * @param {Sheet} ورقة - ورقة Google Sheets المطلوب تنسيقها
 * @param {string[]} أعمدة - قائمة أسماء الأعمدة (تُكتب في الصف الأول)
 */
function تنسيق_الجدول(ورقة, أعمدة) {
  const عدد_الأعمدة = أعمدة.length;

  // كتابة رأس الجدول (الصف الأول) إن لم يكن مكتوبًا مسبقًا
  // Write the header row only if it isn't already there
  const نطاق_الرأس = ورقة.getRange(1, 1, 1, عدد_الأعمدة);
  if (ورقة.getRange(1, 1).getValue() === '') {
    نطاق_الرأس.setValues([أعمدة]);
  }

  // تلوين الرأس + تجميده (Sticky) حتى يبقى ظاهرًا أثناء التمرير
  // Color and freeze the header row so it stays visible while scrolling
  نطاق_الرأس
    .setBackground(لون_رأس_الجدول)
    .setFontColor(لون_نص_الرأس)
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  ورقة.setFrozenRows(1);

  // محاذاة وسط + خط عريض حجم 12 لكل الجدول (وليس الرأس فقط)
  // Center alignment + bold size-12 font across the whole sheet
  const نطاق_كامل = ورقة.getRange(1, 1, Math.max(ورقة.getMaxRows(), 1), عدد_الأعمدة);
  نطاق_كامل
    .setFontSize(12)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // ضبط عرض الأعمدة تلقائيًا حسب المحتوى
  // Auto-resize every column to fit its content
  ورقة.autoResizeColumns(1, عدد_الأعمدة);
}

/**
 * يضيف قائمة منسدلة (Data Validation) على عمود كامل ضمن ورقة معيّنة.
 * Adds a dropdown data-validation rule to a whole column in a sheet.
 *
 * @param {Sheet} ورقة
 * @param {number} رقم_العمود - رقم العمود (يبدأ من 1)
 * @param {string[]} القيم_المسموحة
 */
function إضافة_قائمة_منسدلة(ورقة, رقم_العمود, القيم_المسموحة) {
  const القاعدة = SpreadsheetApp.newDataValidation()
    .requireValueInList(القيم_المسموحة, true)
    .setAllowInvalid(false)
    .build();
  // تُطبَّق من الصف 2 حتى آخر صف ممكن (الصف 1 هو الرأس)
  // Applied from row 2 to the last possible row (row 1 is the header)
  ورقة.getRange(2, رقم_العمود, Math.max(ورقة.getMaxRows() - 1, 1), 1)
    .setDataValidation(القاعدة);
}

/**
 * يضيف تنسيقًا شرطيًا لعمود "شدة الحالة": يلوّن كل خلية تلقائيًا
 * حسب قيمتها (حرجة جدًا = أحمر، حرجة متوسطة = برتقالي، حرجة غير مستعجلة = أصفر).
 *
 * Adds conditional formatting to the "شدة الحالة" column so each cell
 * is colored automatically based on its value.
 *
 * @param {Sheet} ورقة
 * @param {number} رقم_العمود
 */
function تلوين_شدة_الحالة_شرطيًا(ورقة, رقم_العمود) {
  const نطاق = ورقة.getRange(2, رقم_العمود, Math.max(ورقة.getMaxRows() - 1, 1), 1);

  // إزالة أي قواعد سابقة لنفس النطاق لتفادي التكرار عند إعادة التشغيل
  // Remove any previous rules on this range to avoid duplicates on re-run
  const القواعد_الحالية = ورقة.getConditionalFormatRules().filter(function (قاعدة) {
    return !قاعدة.getRanges().some(function (نطاق_قاعدة) {
      return نطاق_قاعدة.getColumn() === رقم_العمود && نطاق_قاعدة.getSheet().getName() === ورقة.getName();
    });
  });

  const قواعد_جديدة = Object.keys(ألوان_شدة_الحالة).map(function (قيمة) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(قيمة)
      .setBackground(ألوان_شدة_الحالة[قيمة])
      .setRanges([نطاق])
      .build();
  });

  ورقة.setConditionalFormatRules(القواعد_الحالية.concat(قواعد_جديدة));
}

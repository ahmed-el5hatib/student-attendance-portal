/**
 * ==============================================================================
 * Google Apps Script - خادم مزامنة الحضور والغياب والبونص
 * إشراف: المهندس أحمد الخطيب (Eng. Ahmed El-khatib)
 * ==============================================================================
 * 
 * طريقة التركيب السريع (في دقيقتين فقط):
 * 1. افتح Google Sheets وأنشئ ملفاً جديداً باسم:
 *    Attendance - Eng Ahmed El-khatib
 * 2. من القائمة العلوية: Extensions (الإضافات) > Apps Script
 * 3. امسح أي كود موجود في المحرر، والصق هذا الكود بالكامل.
 * 4. اضغط على الزر الأزرق: Deploy (نشر) > New deployment (نشر جديد)
 * 5. اضغط على الترس بجانب "Select type" واختر "Web app" (تطبيق ويب).
 * 6. ضع الإعدادات كالتالي:
 *    - Description: Attendance Sync API
 *    - Execute as: Me (حسابك الشخصي)
 *    - Who has access: Anyone (أي شخص - لكي يستطيع الموقع المزامنة دون طلب تسجيل دخول)
 * 7. اضغط Deploy ووافق على الصلاحيات (Authorize access).
 * 8. انسخ الـ Web app URL وضعه في إعدادات المنظومة في الموقع!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No data received" });
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // نوع العملية: تسجيل حضور جلسة أسبوعية أو رصد بونص فردي
    var actionType = payload.type || 'attendance';

    if (actionType === 'bonus') {
      // مزامنة سجل بونص خاص
      var bonusSheet = getOrCreateSheet(ss, "Bonuses_سجل_البونص", [
        "التاريخ والوقت", "كود الطالب", "اسم الطالب", "المقرر", "المجموعة", "النقاط", "السبب", "المسؤول"
      ]);
      
      bonusSheet.appendRow([
        payload.timestamp || new Date().toLocaleString('ar-EG'),
        payload.studentId,
        payload.studentName,
        payload.courseName || payload.courseId,
        payload.groupName || payload.groupId,
        payload.points,
        payload.reason || "مشاركة متميزة",
        payload.instructor || "Eng. Ahmed El-khatib"
      ]);

      return jsonResponse({ status: "success", action: "bonus_saved" });
    }

    // المعالجة الافتراضية: مزامنة جلسة حضور أسبوعية
    var sheetName = sanitizeSheetName((payload.courseId || "Course") + "_" + (payload.groupId || "Group"));
    var sheet = getOrCreateSheet(ss, sheetName, [
      "تاريخ الجلسة", "الأسبوع", "كود الطالب", "اسم الطالب", "البرنامج الأكاديمي", "حالة الحضور", "البونص", "ملاحظات", "وقت المزامنة"
    ]);

    var syncTime = new Date().toLocaleString('ar-EG');
    var records = payload.records || [];

    if (records.length > 0) {
      var rowsToInsert = [];
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        rowsToInsert.push([
          payload.date || new Date().toLocaleDateString('ar-EG'),
          "الأسبوع " + (payload.week || 1),
          r.id,
          r.name,
          r.program || "",
          r.status === 'present' ? 'حاضر' : (r.status === 'absent' ? 'غائب' : 'عذر مقبول'),
          r.bonus || 0,
          r.notes || "",
          syncTime
        ]);
      }

      // إضافة السجلات دفعة واحدة لتحسين السرعة
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    }

    return jsonResponse({
      status: "success",
      message: "تم حفظ " + records.length + " سجلاً بنجاح",
      count: records.length,
      sheet: sheetName
    });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  // فحص حالة الاتصال من الموقع
  return jsonResponse({
    status: "alive",
    instructor: "Eng. Ahmed El-khatib",
    timestamp: new Date().toISOString(),
    system: "Smart Student Attendance & Bonus Portal"
  });
}

/**
 * دالة مساعدة لإنشاء الورقة وتنسيق ترويستها إذا لم تكن موجودة
 */
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    
    // تنسيق شريط العناوين بالألوان الحديثة
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e293b"); // كحلي غامق أنيق
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true); // اتجاه عربي من اليمين لليسار
  }
  return sheet;
}

/**
 * حماية وتعديل اسم الورقة ليتوافق مع قيود Google Sheets
 */
function sanitizeSheetName(name) {
  return name.replace(/[\\\/\?\*\[\]]/g, "_").substring(0, 30);
}

/**
 * دالة لإرجاع JSON Output مع الترويسة الصحيحة
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

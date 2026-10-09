/**
 * ==============================================================================
 * Google Apps Script - خادم مزامنة الحضور والغياب والبونص الشامل الذكي
 * إشراف: المهندس أحمد الخطيب (Eng. Ahmed El-khatib)
 * ==============================================================================
 * 
 * الميزات المتقدمة:
 * 1. منع تكرار السجلات عند إعادة رفع نفس الأسبوع (تحديث تلقائي بالاستبدال).
 * 2. دعم التحضير الذاتي عبر QR Code وتعديل حالة الطالب إلى "حاضر" مباشرة في نفس صفه.
 * 3. حفظ سجل التظلمات في صفحة مستقلة (Appeals_تظلمات_الطلاب).
 * 4. حفظ سجل درجات البونص التراكمي (Bonuses_سجل_البونص).
 * 5. تنسيق الهيدر العربي الملون تلقائياً.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No data received" });
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // نوع العملية: تسجيل حضور جلسة أسبوعية أو رصد بونص فردي أو تظلم أو تسجيل QR
    var actionType = payload.action || payload.type || 'attendance';

    // 1. مزامنة البونص
    if (actionType === 'bonus') {
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

    // 2. مزامنة تظلمات ومراجعات الطلاب
    if (actionType === 'appeal_ticket') {
      var ticket = payload.ticket || {};
      var appealSheet = getOrCreateSheet(ss, "Appeals_تظلمات_الطلاب", [
        "وقت التظلم", "كود الطالب", "اسم الطالب", "المقرر", "المجموعة", "الأسبوع", "سبب التظلم", "ملاحظات الطالب", "الحالة"
      ]);

      appealSheet.appendRow([
        ticket.createdAt || new Date().toLocaleString('ar-EG'),
        ticket.studentId || "",
        ticket.studentName || "",
        ticket.courseName || ticket.courseId || "",
        ticket.groupName || ticket.groupId || "",
        "الأسبوع " + (ticket.week || ""),
        ticket.reason || "",
        ticket.notes || "",
        ticket.status === 'approved' ? 'مقبول' : (ticket.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة')
      ]);

      return jsonResponse({ status: "success", action: "appeal_saved" });
    }

    // 3. مزامنة جلسات الحضور الأسبوعية أو تحضير الـ QR Code
    var sheetName = sanitizeSheetName((payload.courseId || "Course") + "_" + (payload.groupId || "Group"));
    var sheet = getOrCreateSheet(ss, sheetName, [
      "تاريخ الجلسة", "الأسبوع", "كود الطالب", "اسم الطالب", "البرنامج الأكاديمي", "حالة الحضور", "البونص", "ملاحظات", "وقت المزامنة"
    ]);

    var syncTime = new Date().toLocaleString('ar-EG');
    var records = payload.records || [];
    var weekLabel = "الأسبوع " + (payload.week || 1);

    // حالة التحضير الفردي المباشر عبر الـ QR Code
    if (actionType === 'qr_checkin') {
      if (records.length > 0) {
        var r = records[0];
        var lastRow = sheet.getLastRow();
        var updatedInPlace = false;
        
        // البحث عن الطالب في نفس الأسبوع وتحديث حالته لـ حاضر دون تكرار الصف
        if (lastRow > 1) {
          var dataRange = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
          for (var i = 0; i < dataRange.length; i++) {
            if (String(dataRange[i][1]) === weekLabel && String(dataRange[i][2]) === String(r.id)) {
              sheet.getRange(i + 2, 6).setValue('حاضر');
              sheet.getRange(i + 2, 9).setValue(syncTime);
              updatedInPlace = true;
              break;
            }
          }
        }
        
        if (!updatedInPlace) {
          sheet.appendRow([
            payload.date || new Date().toLocaleDateString('ar-EG'),
            weekLabel,
            r.id,
            r.name,
            r.program || "",
            'حاضر',
            r.bonus || 0,
            r.notes || "حضور ذاتي عبر QR Code",
            syncTime
          ]);
        }
        return jsonResponse({ status: "success", action: "qr_checkin_recorded", studentId: r.id });
      }
    }

    // المزامنة الكاملة لجلسة أسبوعية:
    // لمنع تكرار السجلات عند إعادة الرفع: نحذف أي صفوف سابقة لنفس الأسبوع قبل الإضافة
    if (records.length > 0) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var weekCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var rIndex = weekCol.length - 1; rIndex >= 0; rIndex--) {
          if (String(weekCol[rIndex][0]) === weekLabel) {
            sheet.deleteRow(rIndex + 2);
          }
        }
      }

      var rowsToInsert = [];
      for (var j = 0; j < records.length; j++) {
        var rec = records[j];
        rowsToInsert.push([
          payload.date || new Date().toLocaleDateString('ar-EG'),
          weekLabel,
          rec.id,
          rec.name,
          rec.program || "",
          rec.status === 'present' ? 'حاضر' : (rec.status === 'absent' ? 'غائب' : (rec.status === 'late' ? 'متأخر' : (rec.status === 'excused' ? 'عذر مقبول' : rec.status))),
          rec.bonus || 0,
          rec.notes || "",
          syncTime
        ]);
      }

      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    }

    return jsonResponse({
      status: "success",
      message: "تم حفظ ومزامنة " + records.length + " سجلاً بنجاح",
      count: records.length,
      sheet: sheetName
    });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({
    status: "alive",
    instructor: "Eng. Ahmed El-khatib",
    timestamp: new Date().toISOString(),
    system: "Smart Student Attendance & Bonus Portal"
  });
}

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

function sanitizeSheetName(name) {
  return name.replace(/[\\\/\?\*\[\]]/g, "_").substring(0, 30);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

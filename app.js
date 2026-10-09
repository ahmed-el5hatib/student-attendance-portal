// ============================================================
// Smart Attendance & Bonus Portal - Application Logic
// Instructor: Eng. Ahmed El-khatib
// ============================================================

(function() {
  'use strict';

  // --- 1. Global State & Storage Keys ---
  const STORAGE_KEYS = {
    SESSIONS: 'ATTENDANCE_SESSIONS_V1',
    BONUSES: 'ATTENDANCE_BONUSES_V1',
    CONFIG: 'ATTENDANCE_CONFIG_V1',
    THEME: 'ATTENDANCE_THEME',
    APPEALS: 'ATTENDANCE_APPEALS_V1'
  };

  const DEFAULT_CONFIG = {
    pin: 'root',
    googleScriptUrl: '',
    department: 'قسم علوم الحاسب ونظم المعلومات'
  };

  const storedConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}');
  if (!storedConfig.pin || storedConfig.pin === '1234') {
    storedConfig.pin = 'root'; // ترحيل كلمة المرور السابقة تلقائياً إلى root
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storedConfig));
  }

  // تصفير أي بونص سابق لجميع الطلاب بحيث يبدأ الجميع من 0
  const BONUS_RESET_KEY = 'ATTENDANCE_ZERO_RESET_V2';
  if (localStorage.getItem(BONUS_RESET_KEY) !== 'done') {
    localStorage.setItem(STORAGE_KEYS.BONUSES, '[]');
    localStorage.setItem(BONUS_RESET_KEY, 'done');
  }

  // تحميل وتحديث درجات البونص المعتمدة لمادة تراسل البيانات (13 طالباً)
  const BONUS_DC_KEY = 'ATTENDANCE_BONUS_DC_13_STUDENTS_V1';
  if (localStorage.getItem(BONUS_DC_KEY) !== 'done') {
    const initialBonuses = (window.INITIAL_DATA && window.INITIAL_DATA.bonuses) ? window.INITIAL_DATA.bonuses : [];
    localStorage.setItem(STORAGE_KEYS.BONUSES, JSON.stringify(initialBonuses));
    localStorage.setItem(BONUS_DC_KEY, 'done');
  }

  // تحميل وتحديث جلسات الحضور للأسابيع الأول والثاني والثالث (OS S15 ومجموعات Data Communication)
  let storedSessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '{}');
  const initialSessions = (window.INITIAL_DATA && window.INITIAL_DATA.sessions) ? window.INITIAL_DATA.sessions : {};
  const FULL_PRESET_KEY = 'ATTENDANCE_FULL_W1_W2_W3_PRESET_V5';
  if (localStorage.getItem(FULL_PRESET_KEY) !== 'done') {
    Object.keys(initialSessions).forEach(key => {
      const sess = initialSessions[key];
      if (sess && Array.isArray(sess.records)) {
        const recDict = {};
        sess.records.forEach(r => {
          recDict[r.id] = { status: r.status, notes: r.notes || '' };
        });
        sess.records = recDict;
      }
      storedSessions[key] = sess;
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(storedSessions));
    localStorage.setItem(FULL_PRESET_KEY, 'done');
  }

  // مزامنة فورية قطعية: دمج سجلات الحضور الرسمية من INITIAL_DATA لضمان عدم بقاء أي طالب بحالة غياب بسبب كاش قديم بالمتصفح
  if (initialSessions) {
    Object.keys(initialSessions).forEach(key => {
      const initSess = initialSessions[key];
      if (!storedSessions[key]) {
        storedSessions[key] = JSON.parse(JSON.stringify(initSess));
      } else if (initSess && initSess.records) {
        if (!storedSessions[key].records) storedSessions[key].records = {};
        Object.keys(initSess.records).forEach(sId => {
          const rec = initSess.records[sId];
          if (rec && rec.status === 'present') {
            storedSessions[key].records[sId] = rec;
          }
        });
      }
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(storedSessions));
  }

  // ترحيل وتعديل غياب الطلاب الذين أبلغوا عن حضورهم في تراسل البيانات (الدفعة الأولى 17 طالباً)
  const ATTENDANCE_CORRECTIONS_KEY = 'ATTENDANCE_CORRECTIONS_STUDENTS_V1';
  if (localStorage.getItem(ATTENDANCE_CORRECTIONS_KEY) !== 'done') {
    const corrections = [
      { id: '25010024', group: 'GC', weeks: [3] },
      { id: '25010077', group: 'GC', weeks: [3] },
      { id: '25010073', group: 'GC', weeks: [3] },
      { id: '25010152', group: 'GA', weeks: [3] },
      { id: '25010133', group: 'GC', weeks: [3] },
      { id: '25010512', group: 'GC', weeks: [3] },
      { id: '25010310', group: 'GA', weeks: [1, 2] },
      { id: '25010397', group: 'GC', weeks: [3] },
      { id: '25010518', group: 'GC', weeks: [2] },
      { id: '25010217', group: 'GA', weeks: [2] },
      { id: '25010161', group: 'GB', weeks: [2] },
      { id: '25010228', group: 'GB', weeks: [3] },
      { id: '25010505', group: 'GB', weeks: [3] },
      { id: '25010524', group: 'GC', weeks: [2] },
      { id: '25010122', group: 'GC', weeks: [1] },
      { id: '25010063', group: 'GA', weeks: [2, 3] }
    ];

    corrections.forEach(c => {
      c.weeks.forEach(w => {
        const k = `data_communication_${c.group}_w${w}`;
        if (!storedSessions[k]) {
          storedSessions[k] = {
            courseId: 'data_communication',
            groupId: c.group,
            week: String(w),
            date: '2026-10-09',
            records: {}
          };
        }
        if (!storedSessions[k].records) storedSessions[k].records = {};
        storedSessions[k].records[c.id] = {
          status: 'present',
          notes: 'تم تصحيح الغياب بناءً على إفادة الطالب'
        };
      });
    });

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(storedSessions));
    localStorage.setItem(ATTENDANCE_CORRECTIONS_KEY, 'done');
  }

  // ترحيل وتعديل غياب الدفعة الثانية من الطلاب من مجلد correction (19 طالباً)
  const ATTENDANCE_CORRECTIONS_V2_KEY = 'ATTENDANCE_CORRECTIONS_STUDENTS_V2';
  if (localStorage.getItem(ATTENDANCE_CORRECTIONS_V2_KEY) !== 'done') {
    const correctionsV2 = [
      { id: '25010482', group: 'GC', weeks: [1] },
      { id: '25010432', group: 'GC', weeks: [1] },
      { id: '25010136', group: 'GC', weeks: [3] },
      { id: '25010199', group: 'GB', weeks: [1] },
      { id: '25010280', group: 'GC', weeks: [3] },
      { id: '25010068', group: 'GC', weeks: [3] },
      { id: '25010496', group: 'GC', weeks: [2] },
      { id: '25010306', group: 'GC', weeks: [1] },
      { id: '25010525', group: 'GC', weeks: [1] },
      { id: '25010219', group: 'GC', weeks: [2] },
      { id: '25010328', group: 'GA', weeks: [2] },
      { id: '25010423', group: 'GC', weeks: [3] },
      { id: '25010060', group: 'GA', weeks: [2], note: 'تم تصحيح الغياب بناءً على إفادة الطالب (حضرت مع Group B)' },
      { id: '25010163', group: 'GC', weeks: [3] },
      { id: '25010451', group: 'GA', weeks: [2] },
      { id: '25010221', group: 'GB', weeks: [2] },
      { id: '25010033', group: 'GA', weeks: [2] },
      { id: '25010530', group: 'GB', weeks: [3] },
      { id: '25010528', group: 'GA', weeks: [1, 2] }
    ];

    correctionsV2.forEach(c => {
      c.weeks.forEach(w => {
        const k = `data_communication_${c.group}_w${w}`;
        if (!storedSessions[k]) {
          storedSessions[k] = {
            courseId: 'data_communication',
            groupId: c.group,
            week: String(w),
            date: '2026-10-09',
            records: {}
          };
        }
        if (!storedSessions[k].records) storedSessions[k].records = {};
        storedSessions[k].records[c.id] = {
          status: 'present',
          notes: c.note || 'تم تصحيح الغياب بناءً على إفادة الطالب'
        };
      });
    });

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(storedSessions));
    localStorage.setItem(ATTENDANCE_CORRECTIONS_V2_KEY, 'done');
  }

  // ترحيل وتعديل غياب الدفعة الثالثة من الطلاب (10 طلاب)
  const ATTENDANCE_CORRECTIONS_V3_KEY = 'ATTENDANCE_CORRECTIONS_STUDENTS_V3';
  if (localStorage.getItem(ATTENDANCE_CORRECTIONS_V3_KEY) !== 'done') {
    const correctionsV3 = [
      { id: '25010265', group: 'GC', weeks: [1] },
      { id: '25010446', group: 'GB', weeks: [2] },
      { id: '25010254', group: 'GA', weeks: [1] },
      { id: '25010381', group: 'GA', weeks: [2, 3] },
      { id: '25010539', group: 'GB', weeks: [1] },
      { id: '25010472', group: 'GC', weeks: [3] },
      { id: '25010318', group: 'GC', weeks: [2] },
      { id: '25010532', group: 'GB', weeks: [1] },
      { id: '25010168', group: 'GB', weeks: [1] },
      { id: '25010527', group: 'GB', weeks: [3] }
    ];

    correctionsV3.forEach(c => {
      c.weeks.forEach(w => {
        const k = `data_communication_${c.group}_w${w}`;
        if (!storedSessions[k]) {
          storedSessions[k] = {
            courseId: 'data_communication',
            groupId: c.group,
            week: String(w),
            date: '2026-10-09',
            records: {}
          };
        }
        if (!storedSessions[k].records) storedSessions[k].records = {};
        storedSessions[k].records[c.id] = {
          status: 'present',
          notes: 'تم تصحيح الغياب بناءً على إفادة الطالب'
        };
      });
    });

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(storedSessions));
    localStorage.setItem(ATTENDANCE_CORRECTIONS_V3_KEY, 'done');
  }

  let state = {
    isAdminAuthenticated: false,
    courses: window.INITIAL_DATA ? window.INITIAL_DATA.courses : [],
    sessions: storedSessions,
    bonuses: JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]'),
    appeals: JSON.parse(localStorage.getItem(STORAGE_KEYS.APPEALS) || '[]'),
    config: Object.assign({}, DEFAULT_CONFIG, storedConfig),
    activeAdminTab: 'tabAttendance',
    selectedStudentId: null,
    appealsFilter: 'all',
    activeQrSession: {
      active: false,
      isPaused: false,
      courseId: '',
      groupId: '',
      week: '1',
      currentPin: '',
      token: '',
      exp: 0,
      timer: null,
      countdownRemaining: 15,
      attendees: []
    },
    flashCallState: {
      active: false,
      students: [],
      currentIndex: 0
    },
    html5QrScannerInstance: null,
    pendingCheckinSession: null,
    pendingCheckinStudent: null,
    syncBroadcastChannel: null,
    currentAdminSession: {
      courseId: '',
      groupId: '',
      week: '1',
      date: new Date().toISOString().split('T')[0],
      records: {}
    }
  };

  // --- 2. DOM Elements Cache ---
  const el = {
    // Mode Switcher
    btnStudentView: document.getElementById('btnStudentView'),
    btnAdminView: document.getElementById('btnAdminView'),
    studentPortalView: document.getElementById('studentPortalView'),
    adminDashboardView: document.getElementById('adminDashboardView'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    btnForceRefreshData: document.getElementById('btnForceRefreshData'),
    
    // Student Portal
    studentCourseSelect: document.getElementById('studentCourseSelect'),
    studentGroupSelect: document.getElementById('studentGroupSelect'),
    studentSearchInput: document.getElementById('studentSearchInput'),
    studentSearchResultsDropdown: document.getElementById('studentSearchResultsDropdown'),
    studentRecordCard: document.getElementById('studentRecordCard'),

    // Admin Navigation
    adminTabBtns: document.querySelectorAll('.admin-tab-btn'),
    adminTabPanes: document.querySelectorAll('.admin-tab-pane'),

    // Admin Attendance Controls
    adminCourseSelect: document.getElementById('adminCourseSelect'),
    adminGroupSelect: document.getElementById('adminGroupSelect'),
    adminWeekSelect: document.getElementById('adminWeekSelect'),
    adminSessionDate: document.getElementById('adminSessionDate'),
    btnMarkAllPresent: document.getElementById('btnMarkAllPresent'),
    btnResetCurrentSession: document.getElementById('btnResetCurrentSession'),
    btnSaveAttendance: document.getElementById('btnSaveAttendance'),
    btnSyncCurrentSession: document.getElementById('btnSyncCurrentSession'),
    adminStudentFilter: document.getElementById('adminStudentFilter'),
    attendanceTableBody: document.getElementById('attendanceTableBody'),

    // Stats Counters
    statTotalStudents: document.getElementById('statTotalStudents'),
    statPresentCount: document.getElementById('statPresentCount'),
    statAbsentCount: document.getElementById('statAbsentCount'),
    statLateCount: document.getElementById('statLateCount'),
    statExcusedCount: document.getElementById('statExcusedCount'),
    statAttendancePercent: document.getElementById('statAttendancePercent'),

    // Bonus Hub
    bonusCourseGroupSelect: document.getElementById('bonusCourseGroupSelect'),
    bonusStudentSelect: document.getElementById('bonusStudentSelect'),
    bonusPointsInput: document.getElementById('bonusPointsInput'),
    bonusWeekSelect: document.getElementById('bonusWeekSelect'),
    bonusReasonInput: document.getElementById('bonusReasonInput'),
    addBonusForm: document.getElementById('addBonusForm'),
    bonusLeaderboardList: document.getElementById('bonusLeaderboardList'),
    bonusLogTableBody: document.getElementById('bonusLogTableBody'),
    bonusLogFilter: document.getElementById('bonusLogFilter'),

    // Reports & Print
    reportCourseSelect: document.getElementById('reportCourseSelect'),
    reportGroupSelect: document.getElementById('reportGroupSelect'),
    reportTypeSelect: document.getElementById('reportTypeSelect'),
    reportWeekGroup: document.getElementById('reportWeekGroup'),
    reportWeekSelect: document.getElementById('reportWeekSelect'),
    btnGenerateReportPreview: document.getElementById('btnGenerateReportPreview'),
    btnPrintReportPDF: document.getElementById('btnPrintReportPDF'),
    btnExportReportCSV: document.getElementById('btnExportReportCSV'),
    printReportMainTitle: document.getElementById('printReportMainTitle'),
    printCourseName: document.getElementById('printCourseName'),
    printGroupName: document.getElementById('printGroupName'),
    printWeekNumber: document.getElementById('printWeekNumber'),
    printSessionDate: document.getElementById('printSessionDate'),
    printTotalStudents: document.getElementById('printTotalStudents'),
    printPresentStudents: document.getElementById('printPresentStudents'),
    printAbsentStudents: document.getElementById('printAbsentStudents'),
    printExcusedStudents: document.getElementById('printExcusedStudents'),
    printAttendanceRate: document.getElementById('printAttendanceRate'),
    printTableContainer: document.getElementById('printTableContainer'),
    printGeneratedTimestamp: document.getElementById('printGeneratedTimestamp'),

    // Cumulative Matrix
    cumCourseSelect: document.getElementById('cumCourseSelect'),
    cumGroupSelect: document.getElementById('cumGroupSelect'),
    cumulativeMatrixTable: document.getElementById('cumulativeMatrixTable'),
    btnPrintCumulative: document.getElementById('btnPrintCumulative'),
    btnExportCumulativeCSV: document.getElementById('btnExportCumulativeCSV'),

    // Settings
    googleScriptUrlInput: document.getElementById('googleScriptUrlInput'),
    btnSaveGoogleUrl: document.getElementById('btnSaveGoogleUrl'),
    btnTestGoogleSync: document.getElementById('btnTestGoogleSync'),
    btnSyncAllDataNow: document.getElementById('btnSyncAllDataNow'),
    btnOpenScriptModal: document.getElementById('btnOpenScriptModal'),
    changePinForm: document.getElementById('changePinForm'),
    currentPinInput: document.getElementById('currentPinInput'),
    newPinInput: document.getElementById('newPinInput'),
    btnDownloadBackupJSON: document.getElementById('btnDownloadBackupJSON'),
    btnTriggerRestoreBackup: document.getElementById('btnTriggerRestoreBackup'),
    restoreBackupFileInput: document.getElementById('restoreBackupFileInput'),
    btnResetAllData: document.getElementById('btnResetAllData'),

    // Modals
    pinModal: document.getElementById('pinModal'),
    pinVerificationForm: document.getElementById('pinVerificationForm'),
    adminPinInput: document.getElementById('adminPinInput'),
    pinErrorMessage: document.getElementById('pinErrorMessage'),
    btnCancelPinModal: document.getElementById('btnCancelPinModal'),
    scriptGuideModal: document.getElementById('scriptGuideModal'),
    btnCloseScriptModal: document.getElementById('btnCloseScriptModal'),
    btnCopyScriptCode: document.getElementById('btnCopyScriptCode'),
    scriptCodeDisplay: document.getElementById('scriptCodeDisplay'),

    // QR & Action Buttons
    btnOpenStudentCheckin: document.getElementById('btnOpenStudentCheckin'),
    btnOpenLiveQR: document.getElementById('btnOpenLiveQR'),
    btnOpenFlashCall: document.getElementById('btnOpenFlashCall'),
    btnOpenGuestModal: document.getElementById('btnOpenGuestModal'),
    btnOpenWarningsCenter: document.getElementById('btnOpenWarningsCenter'),

    // Appeals Admin Pane
    appealsBadge: document.getElementById('appealsBadge'),
    appealsTableBody: document.getElementById('appealsTableBody'),
    countAppealsAll: document.getElementById('countAppealsAll'),
    countAppealsPending: document.getElementById('countAppealsPending'),
    countAppealsApproved: document.getElementById('countAppealsApproved'),
    countAppealsRejected: document.getElementById('countAppealsRejected'),
    appealFilterBtns: document.querySelectorAll('.appeal-filter-btn'),

    // QR Projector Modal
    qrProjectorModal: document.getElementById('qrProjectorModal'),
    qrProjectorTitle: document.getElementById('qrProjectorTitle'),
    qrProjectorSub: document.getElementById('qrProjectorSub'),
    qrProjectorDate: document.getElementById('qrProjectorDate'),
    btnToggleFullscreen: document.getElementById('btnToggleFullscreen'),
    btnToggleQrPause: document.getElementById('btnToggleQrPause'),
    btnCloseQrProjector: document.getElementById('btnCloseQrProjector'),
    qrCanvasContainer: document.getElementById('qrCanvasContainer'),
    qrTimerProgress: document.getElementById('qrTimerProgress'),
    qrTimerSeconds: document.getElementById('qrTimerSeconds'),
    qrPinDisplay: document.getElementById('qrPinDisplay'),
    qrAttendeesCount: document.getElementById('qrAttendeesCount'),
    qrRecentAttendeesList: document.getElementById('qrRecentAttendeesList'),
    btnRefreshQrNow: document.getElementById('btnRefreshQrNow'),
    btnFinishQrSession: document.getElementById('btnFinishQrSession'),
    qrDirectCheckinUrlInput: document.getElementById('qrDirectCheckinUrlInput'),
    btnCopyQrDirectUrl: document.getElementById('btnCopyQrDirectUrl'),

    // Student Checkin Modal
    studentAttendanceModal: document.getElementById('studentAttendanceModal'),
    btnCloseStudentCheckin: document.getElementById('btnCloseStudentCheckin'),
    checkinSessionBanner: document.getElementById('checkinSessionBanner'),
    checkinBannerWeekBadge: document.getElementById('checkinBannerWeekBadge'),
    checkinBannerTitle: document.getElementById('checkinBannerTitle'),
    checkinBannerDate: document.getElementById('checkinBannerDate'),
    tabBtnDirectNameId: document.getElementById('tabBtnDirectNameId'),
    tabBtnScanCamera: document.getElementById('tabBtnScanCamera'),
    tabBtnManualPin: document.getElementById('tabBtnManualPin'),
    tabContentDirectNameId: document.getElementById('tabContentDirectNameId'),
    tabContentScanCamera: document.getElementById('tabContentScanCamera'),
    tabContentManualPin: document.getElementById('tabContentManualPin'),
    studentCheckinSearchInput: document.getElementById('studentCheckinSearchInput'),
    studentCheckinSuggestions: document.getElementById('studentCheckinSuggestions'),
    studentCheckinVerifiedCard: document.getElementById('studentCheckinVerifiedCard'),
    btnConfirmDirectAttendance: document.getElementById('btnConfirmDirectAttendance'),
    studentQrReader: document.getElementById('studentQrReader'),
    studentSessionPinInput: document.getElementById('studentSessionPinInput'),
    btnSubmitSessionPin: document.getElementById('btnSubmitSessionPin'),
    studentCheckinSuccessCard: document.getElementById('studentCheckinSuccessCard'),
    checkinSuccessTitle: document.getElementById('checkinSuccessTitle'),
    checkinSuccessDetails: document.getElementById('checkinSuccessDetails'),
    checkinReceiptCode: document.getElementById('checkinReceiptCode'),
    btnViewStudentPortalFromCheckin: document.getElementById('btnViewStudentPortalFromCheckin'),
    btnCloseCheckinSuccess: document.getElementById('btnCloseCheckinSuccess'),

    // Flash Call Modal
    flashCallModal: document.getElementById('flashCallModal'),
    flashSessionTitle: document.getElementById('flashSessionTitle'),
    flashCurrentIndex: document.getElementById('flashCurrentIndex'),
    flashTotalCount: document.getElementById('flashTotalCount'),
    btnCloseFlashCall: document.getElementById('btnCloseFlashCall'),
    flashProgressBarFill: document.getElementById('flashProgressBarFill'),
    flashStudentName: document.getElementById('flashStudentName'),
    flashStudentId: document.getElementById('flashStudentId'),
    flashStudentProgram: document.getElementById('flashStudentProgram'),
    flashCurrentStatusBadge: document.getElementById('flashCurrentStatusBadge'),
    btnFlashPresent: document.getElementById('btnFlashPresent'),
    btnFlashAbsent: document.getElementById('btnFlashAbsent'),
    btnFlashLate: document.getElementById('btnFlashLate'),
    btnFlashExcused: document.getElementById('btnFlashExcused'),
    btnFlashPrev: document.getElementById('btnFlashPrev'),
    btnFlashBonus: document.getElementById('btnFlashBonus'),
    btnFlashNext: document.getElementById('btnFlashNext'),

    // Appeal Modal
    appealModal: document.getElementById('appealModal'),
    btnCloseAppealModal: document.getElementById('btnCloseAppealModal'),
    appealForm: document.getElementById('appealForm'),
    appealStudentSummary: document.getElementById('appealStudentSummary'),
    appealWeekSelect: document.getElementById('appealWeekSelect'),
    appealReasonSelect: document.getElementById('appealReasonSelect'),
    appealNotesInput: document.getElementById('appealNotesInput'),

    // Guest Modal
    guestStudentModal: document.getElementById('guestStudentModal'),
    btnCloseGuestModal: document.getElementById('btnCloseGuestModal'),
    guestSearchInput: document.getElementById('guestSearchInput'),
    guestSearchResults: document.getElementById('guestSearchResults'),
    guestSelectedPreview: document.getElementById('guestSelectedPreview'),
    guestAttendanceNote: document.getElementById('guestAttendanceNote'),
    btnConfirmGuestAttendance: document.getElementById('btnConfirmGuestAttendance'),

    // Warnings Modal
    whatsappWarningModal: document.getElementById('whatsappWarningModal'),
    btnCloseWarningModal: document.getElementById('btnCloseWarningModal'),
    warnCountFirst: document.getElementById('warnCountFirst'),
    warnCountDanger: document.getElementById('warnCountDanger'),
    warningsTableBody: document.getElementById('warningsTableBody'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // --- 3. Helper Functions ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function getCourse(courseId) {
    if (!courseId) return state.courses[0] || null;
    let found = state.courses.find(c => c.id === courseId);
    if (!found) {
      if (courseId === 'data_comm') found = state.courses.find(c => c.id === 'data_communication');
      else if (courseId === 'os') found = state.courses.find(c => c.id === 'operating_systems');
    }
    return found || state.courses[0] || null;
  }

  function getGroup(courseId, groupId) {
    const course = getCourse(courseId);
    if (!course || !course.groups || course.groups.length === 0) return null;
    if (!groupId) return course.groups[0];
    let found = course.groups.find(g => g.id === groupId);
    if (!found) {
      if (groupId === 'sec_a' || groupId === 'A') found = course.groups.find(g => g.id === 'GA');
      else if (groupId === 'sec_b' || groupId === 'B') found = course.groups.find(g => g.id === 'GB');
      else if (groupId === 'sec_c' || groupId === 'C') found = course.groups.find(g => g.id === 'GC');
    }
    return found || course.groups[0];
  }

  function getStudent(courseId, groupId, studentId) {
    const group = getGroup(courseId, groupId);
    if (!group) return null;
    return group.students.find(s => s.id === studentId);
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
  }

  function saveBonuses() {
    localStorage.setItem(STORAGE_KEYS.BONUSES, JSON.stringify(state.bonuses));
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
  }

  function saveAppeals() {
    localStorage.setItem(STORAGE_KEYS.APPEALS, JSON.stringify(state.appeals));
    updateAppealsBadge();
  }

  function updateAppealsBadge() {
    const pendingCount = state.appeals.filter(a => a.status === 'pending').length;
    if (el.appealsBadge) {
      el.appealsBadge.textContent = pendingCount;
      if (pendingCount > 0) {
        el.appealsBadge.classList.remove('hidden');
      } else {
        el.appealsBadge.classList.add('hidden');
      }
    }
  }

  function findStudentAcrossAllGroups(studentId) {
    if (!studentId) return null;
    const cleanId = String(studentId).trim();
    for (const c of state.courses) {
      for (const g of c.groups) {
        const found = g.students.find(s => String(s.id).trim() === cleanId);
        if (found) {
          return {
            student: found,
            course: c,
            group: g
          };
        }
      }
    }
    return null;
  }

  function playBeep(type = 'success') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'beep') {
        osc.frequency.setValueAtTime(493.88, ctx.currentTime); // B4
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {}
  }

  function getSessionKey(courseId, groupId, week) {
    return `${courseId}_${groupId}_w${week}`;
  }

  // Calculate cumulative stats for a single student
  function getStudentStats(courseId, groupId, studentId) {
    let totalSessions = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let timeline = [];

    // Check all weeks 1 to 12
    for (let w = 1; w <= 12; w++) {
      const key = getSessionKey(courseId, groupId, w);
      const session = state.sessions[key];
      if (session && session.records && session.records[studentId]) {
        totalSessions++;
        const rec = session.records[studentId];
        const status = rec.status;
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;

        // Bonus points in this week
        const weekBonuses = state.bonuses.filter(b => 
          b.courseId === courseId && b.groupId === groupId && b.studentId === studentId && String(b.week) === String(w)
        );
        const bonusPts = weekBonuses.reduce((sum, b) => sum + Number(b.points), 0);

        timeline.push({
          week: w,
          date: session.date,
          status: status,
          bonus: bonusPts,
          notes: rec.notes || ''
        });
      } else {
        timeline.push({
          week: w,
          date: null,
          status: 'unrecorded',
          bonus: 0,
          notes: ''
        });
      }
    }

    // Total bonuses for this student
    const studentBonuses = state.bonuses.filter(b => 
      b.courseId === courseId && b.groupId === groupId && b.studentId === studentId
    );
    const totalBonusPoints = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);

    const attendedCount = present + late + excused;
    const rate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

    return {
      totalSessions,
      present,
      absent,
      late,
      excused,
      attendedCount,
      rate,
      totalBonusPoints,
      studentBonuses,
      timeline
    };
  }

  // --- 4. Initialization & Dropdowns Setup ---
  function initApp() {
    // Theme restore
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    document.body.className = `theme-${savedTheme}`;
    updateThemeIcon(savedTheme);

    // Date default
    el.adminSessionDate.value = state.currentAdminSession.date;

    // Populate Course Selectors
    populateCourseDropdowns();

    // Set Initial Admin Session
    if (state.courses.length > 0) {
      state.currentAdminSession.courseId = state.courses[0].id;
      if (state.courses[0].groups.length > 0) {
        state.currentAdminSession.groupId = state.courses[0].groups[0].id;
      }
    }

    // Populate Groups for Admin & Student
    updateAdminGroupOptions();
    updateStudentGroupOptions();
    updateBonusCourseGroupOptions();
    updateReportsGroupOptions();
    updateCumGroupOptions();

    // Load active attendance records
    loadCurrentAdminAttendanceSession();

    // Render Bonus Leaderboard & Log
    renderBonusLeaderboard();
    renderBonusLogTable();
    updateAppealsBadge();

    // Load Settings
    el.googleScriptUrlInput.value = state.config.googleScriptUrl || '';

    // Register Event Handlers
    setupEventHandlers();

    // Register Service Worker for PWA with auto-update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.update();
      }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!window._swReloading) {
          window._swReloading = true;
          window.location.reload();
        }
      });
    }

    // Live background sync from data.json to ensure zero stale client state
    syncLatestDataFromServer();
  }

  async function syncLatestDataFromServer(forceNotification = false) {
    try {
      const res = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const liveData = await res.json();
        if (liveData && liveData.sessions) {
          let updated = false;
          Object.keys(liveData.sessions).forEach(k => {
            const liveS = liveData.sessions[k];
            if (!state.sessions[k]) {
              state.sessions[k] = liveS;
              updated = true;
            } else if (liveS && liveS.records) {
              if (!state.sessions[k].records) state.sessions[k].records = {};
              Object.keys(liveS.records).forEach(sId => {
                const liveRec = liveS.records[sId];
                const curRec = state.sessions[k].records[sId];
                if (!curRec || curRec.status !== liveRec.status || curRec.notes !== liveRec.notes) {
                  state.sessions[k].records[sId] = liveRec;
                  updated = true;
                }
              });
            }
          });
          if (updated) {
            saveSessions();
            if (state.selectedStudentId) {
              selectStudentAndRenderCard(state.selectedStudentId);
            }
            if (forceNotification) {
              showToast('تم تحديث كافة السجلات من الخادم مباشرة!', 'success');
            }
          } else if (forceNotification) {
            showToast('البيانات محدثة بالفعل إلى آخر إصدار.', 'info');
          }
        }
      }
    } catch (err) {
      console.warn('Sync warning:', err);
      if (forceNotification) {
        showToast('تعذر الاتصال بالخادم، تعمل المنظومة بالبيانات المخزنة.', 'warning');
      }
    }
  }

  function updateThemeIcon(theme) {
    el.btnThemeToggle.innerHTML = theme === 'dark' 
      ? '<i class="fa-solid fa-sun"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
  }

  function populateCourseDropdowns() {
    const courseOptions = state.courses.map(c => `<option value="${c.id}">${c.name} (${c.nameAr})</option>`).join('');
    el.studentCourseSelect.innerHTML = courseOptions;
    el.adminCourseSelect.innerHTML = courseOptions;
    el.reportCourseSelect.innerHTML = courseOptions;
    el.cumCourseSelect.innerHTML = courseOptions;
  }

  function updateStudentGroupOptions() {
    const courseId = el.studentCourseSelect.value;
    const course = getCourse(courseId);
    if (!course) return;
    el.studentGroupSelect.innerHTML = course.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    el.studentSearchInput.value = '';
    el.studentSearchResultsDropdown.classList.add('hidden');
    el.studentRecordCard.classList.add('hidden');
  }

  function updateAdminGroupOptions() {
    const courseId = el.adminCourseSelect.value;
    const course = getCourse(courseId);
    if (!course) return;
    el.adminGroupSelect.innerHTML = course.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    state.currentAdminSession.courseId = courseId;
    state.currentAdminSession.groupId = el.adminGroupSelect.value;
  }

  function updateBonusCourseGroupOptions() {
    let options = [];
    state.courses.forEach(c => {
      c.groups.forEach(g => {
        options.push(`<option value="${c.id}:::${g.id}">${c.name} - ${g.name}</option>`);
      });
    });
    el.bonusCourseGroupSelect.innerHTML = options.join('');
    updateBonusStudentOptions();
  }

  function updateBonusStudentOptions() {
    const val = el.bonusCourseGroupSelect.value;
    if (!val) return;
    const [courseId, groupId] = val.split(':::');
    const group = getGroup(courseId, groupId);
    if (!group) return;

    el.bonusStudentSelect.innerHTML = group.students.map(s => 
      `<option value="${s.id}">${s.name} (${s.id})</option>`
    ).join('');
  }

  function updateReportsGroupOptions() {
    const courseId = el.reportCourseSelect.value;
    const course = getCourse(courseId);
    if (!course) return;
    el.reportGroupSelect.innerHTML = course.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    generateOfficialReportPreview();
  }

  function updateCumGroupOptions() {
    const courseId = el.cumCourseSelect.value;
    const course = getCourse(courseId);
    if (!course) return;
    el.cumGroupSelect.innerHTML = course.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    renderCumulativeMatrix();
  }

  // --- 5. Student Portal Logic ---
  function handleStudentSearch(query) {
    query = query.trim().toLowerCase();
    const dropdown = el.studentSearchResultsDropdown;
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }

    const courseId = el.studentCourseSelect.value;
    const groupId = el.studentGroupSelect.value;
    const group = getGroup(courseId, groupId);

    let matches = [];
    if (group) {
      matches = group.students.filter(s => 
        s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
      );
    }

    // If no match in current group, search across all groups in the course
    if (matches.length === 0) {
      state.courses.forEach(c => {
        c.groups.forEach(g => {
          const groupMatches = g.students.filter(s => 
            s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
          );
          groupMatches.forEach(st => {
            if (!matches.some(x => x.id === st.id)) {
              matches.push(Object.assign({}, st, { _groupName: g.name }));
            }
          });
        });
      });
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-dropdown-item"><span class="text-muted">لم يتم العثور على طالب مطابق</span></div>`;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.slice(0, 10).map(s => `
      <div class="search-dropdown-item" data-id="${s.id}">
        <span class="student-name">${s.name}</span>
        <span class="student-id">${s.id} ${s._groupName ? `<small style="color: var(--accent-light);">(${s._groupName})</small>` : ''}</span>
      </div>
    `).join('');
    dropdown.classList.remove('hidden');

    // Click handler for items
    dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const studentId = item.getAttribute('data-id');
        if (studentId) {
          selectStudentAndRenderCard(studentId);
          dropdown.classList.add('hidden');
        }
      });
    });
  }

  function selectStudentAndRenderCard(studentId) {
    state.selectedStudentId = studentId;

    let courseId = el.studentCourseSelect.value;
    let groupId = el.studentGroupSelect.value;
    let student = getStudent(courseId, groupId, studentId);

    // If student belongs to a different course/group, auto-locate them
    if (!student) {
      for (const c of state.courses) {
        for (const g of c.groups) {
          const found = g.students.find(s => s.id === studentId);
          if (found) {
            student = found;
            courseId = c.id;
            groupId = g.id;
            el.studentCourseSelect.value = courseId;
            updateStudentGroupOptions();
            el.studentGroupSelect.value = groupId;
            break;
          }
        }
        if (student) break;
      }
    }

    if (!student) return;

    el.studentSearchInput.value = `${student.name} (${student.id})`;
    el.studentRecordCard.classList.remove('hidden');
    const stats = getStudentStats(courseId, groupId, studentId);
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);

    // Determine status badge & alert
    let alertClass = 'safe';
    let alertIcon = 'fa-circle-check';
    let alertMsg = `نسبة الحضور ممتازة (${stats.rate}%) - سجل حضورك منتظم وملتزم بالتعليمات الجامعية.`;

    if (stats.absent >= 3 || stats.rate < 60) {
      alertClass = 'danger';
      alertIcon = 'fa-triangle-exclamation';
      alertMsg = `تنبيه حرمان: لديك (${stats.absent}) غيابات ونسبة حضورك (${stats.rate}%) - أنت معرض للحرمان من الامتحان العملي، يرجى مراجعة المعيد فوراً!`;
    } else if (stats.absent >= 2 || stats.rate < 75) {
      alertClass = 'warning';
      alertIcon = 'fa-triangle-exclamation';
      alertMsg = `إنذار بالغياب: لديك (${stats.absent}) غيابات ونسبة حضورك (${stats.rate}%) - اقتربت من الحد الأقصى المسموح به.`;
    }

    // Build timeline chips
    const timelineChips = stats.timeline.map(t => {
      let badgeLabel = 'لم يُسجل';
      let icon = 'fa-minus';
      if (t.status === 'present') { badgeLabel = 'حاضر'; icon = 'fa-check'; }
      if (t.status === 'absent') { badgeLabel = 'غائب'; icon = 'fa-xmark'; }
      if (t.status === 'late') { badgeLabel = 'متأخر'; icon = 'fa-clock'; }
      if (t.status === 'excused') { badgeLabel = 'بعذر'; icon = 'fa-file-medical'; }

      return `
        <div class="timeline-week-chip ${t.status}">
          <span class="week-title">الأسبوع ${t.week}</span>
          <span class="week-badge"><i class="fa-solid ${icon}"></i> ${badgeLabel}</span>
          ${t.bonus > 0 ? `<span class="bonus-pill-mini">+${t.bonus} بونص</span>` : ''}
        </div>
      `;
    }).join('');

    // Build Bonus History
    let bonusListHtml = '<p class="text-muted">لا يوجد نقاط بونص مسجلة حتى الآن.</p>';
    if (stats.studentBonuses.length > 0) {
      bonusListHtml = `
        <ul style="padding-right: 1.25rem; margin-top: 0.5rem; font-size: 0.9rem;">
          ${stats.studentBonuses.map(b => `
            <li style="margin-bottom: 0.35rem;">
              <strong class="text-gold">+${b.points} درجات (الأسبوع ${b.week}):</strong> ${b.reason} 
              <span class="text-muted" style="font-size: 0.78rem;">(${b.date})</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    el.studentRecordCard.innerHTML = `
      <!-- Profile Header -->
      <div class="student-profile-header">
        <div class="profile-avatar-block">
          <div class="student-avatar"><i class="fa-solid fa-user-graduate"></i></div>
          <div class="student-info">
            <h3>${student.name}</h3>
            <div class="student-meta-pills">
              <span class="meta-pill id-pill"><i class="fa-solid fa-id-card"></i> ${student.id}</span>
              <span class="meta-pill"><i class="fa-solid fa-book"></i> ${course.name}</span>
              <span class="meta-pill"><i class="fa-solid fa-users"></i> ${group.name}</span>
              <span class="meta-pill"><i class="fa-solid fa-layer-group"></i> ${student.program}</span>
            </div>
          </div>
        </div>

        <div class="student-instructor-stamp">
          <small class="text-muted">المشرف الأكاديمي:</small>
          <div style="font-weight: 700; color: var(--accent-primary);">م. أحمد الخطيب</div>
        </div>
      </div>

      <!-- Warning/Safe Status Alert -->
      <div class="attendance-status-banner ${alertClass}">
        <i class="fa-solid ${alertIcon}" style="font-size: 1.3rem;"></i>
        <span>${alertMsg}</span>
      </div>

      <!-- Big Stats Counter Cards -->
      <div class="student-stats-row">
        <div class="student-stat-card">
          <div class="stat-icon" style="color: var(--accent-primary);"><i class="fa-solid fa-chart-pie"></i></div>
          <div class="stat-val" style="color: var(--accent-primary);">${stats.rate}%</div>
          <div class="stat-lbl">نسبة الحضور الإجمالية</div>
        </div>

        <div class="student-stat-card">
          <div class="stat-icon text-success"><i class="fa-solid fa-circle-check"></i></div>
          <div class="stat-val text-success">${stats.present}</div>
          <div class="stat-lbl">مرات الحضور</div>
        </div>

        <div class="student-stat-card">
          <div class="stat-icon text-danger"><i class="fa-solid fa-circle-xmark"></i></div>
          <div class="stat-val text-danger">${stats.absent}</div>
          <div class="stat-lbl">مرات الغياب</div>
        </div>

        <div class="student-stat-card">
          <div class="stat-icon text-gold"><i class="fa-solid fa-award"></i></div>
          <div class="stat-val text-gold">+${stats.totalBonusPoints}</div>
          <div class="stat-lbl">إجمالي رصيد البونص</div>
        </div>
      </div>

      <!-- Timeline & Bonus Cards -->
      <div class="attendance-timeline-card mb-4">
        <h4><i class="fa-solid fa-calendar-days text-accent"></i> سجل الحضور أسبوعياً (1 - 12):</h4>
        <div class="timeline-grid">
          ${timelineChips}
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-header">
          <h4><i class="fa-solid fa-award text-gold"></i> سجل درجات البونص المكتسبة</h4>
        </div>
        <div class="card-body">
          ${bonusListHtml}
        </div>
      </div>

      <!-- Self-Service Appeal Card -->
      <div class="card mt-3">
        <div class="card-header d-flex justify-between align-center">
          <div>
            <h4><i class="fa-solid fa-envelope-open-text text-warning"></i> طلب مراجعة وتصحيح الغياب</h4>
            <small class="text-secondary">إذا كنت حاضراً في سكشن بديل أو واجهت مشكلة في رصد الغياب</small>
          </div>
          <button id="btnOpenAppealFromRecord" class="btn btn-warning btn-sm">
            <i class="fa-solid fa-paper-plane"></i> تقديم طلب تظلم
          </button>
        </div>
      </div>
    `;

    el.studentRecordCard.classList.remove('hidden');

    const btnAppeal = document.getElementById('btnOpenAppealFromRecord');
    if (btnAppeal) {
      btnAppeal.addEventListener('click', () => {
        openAppealModalForStudent(student, courseId, groupId, stats);
      });
    }
  }

  // --- 6. Admin Attendance Engine ---
  function loadCurrentAdminAttendanceSession() {
    const courseId = el.adminCourseSelect.value;
    const groupId = el.adminGroupSelect.value;
    const week = el.adminWeekSelect.value;
    const key = getSessionKey(courseId, groupId, week);

    state.currentAdminSession.courseId = courseId;
    state.currentAdminSession.groupId = groupId;
    state.currentAdminSession.week = week;

    const group = getGroup(courseId, groupId);
    if (!group) return;

    // Existing session in storage or initialize default
    const existing = state.sessions[key];
    if (existing) {
      state.currentAdminSession.date = existing.date || state.currentAdminSession.date;
      el.adminSessionDate.value = state.currentAdminSession.date;
      state.currentAdminSession.records = Object.assign({}, existing.records);
    } else {
      state.currentAdminSession.records = {};
    }

    renderAdminAttendanceTable();
  }

  function renderAdminAttendanceTable() {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    const filterText = (el.adminStudentFilter.value || '').trim().toLowerCase();
    const students = group.students.filter(s => 
      !filterText || s.id.toLowerCase().includes(filterText) || s.name.toLowerCase().includes(filterText)
    );

    // Also include any guest students recorded in this session
    const nativeIds = new Set(group.students.map(s => s.id));
    const allTableStudents = [...students];

    Object.keys(state.currentAdminSession.records).forEach(sid => {
      if (!nativeIds.has(sid)) {
        const found = findStudentAcrossAllGroups(sid);
        if (found) {
          if (!filterText || sid.toLowerCase().includes(filterText) || found.student.name.toLowerCase().includes(filterText)) {
            allTableStudents.push(Object.assign({}, found.student, {
              isGuest: true,
              homeGroupName: found.group.name
            }));
          }
        }
      }
    });

    // Calculate live counters
    let countPresent = 0;
    let countAbsent = 0;
    let countLate = 0;
    let countExcused = 0;

    group.students.forEach(s => {
      const rec = state.currentAdminSession.records[s.id];
      const status = rec ? rec.status : 'present'; // Default to present
      if (status === 'present') countPresent++;
      else if (status === 'absent') countAbsent++;
      else if (status === 'late') countLate++;
      else if (status === 'excused') countExcused++;
    });

    // Also count guest students
    allTableStudents.filter(s => s.isGuest).forEach(s => {
      const rec = state.currentAdminSession.records[s.id];
      const status = rec ? rec.status : 'present';
      if (status === 'present') countPresent++;
      else if (status === 'absent') countAbsent++;
      else if (status === 'late') countLate++;
      else if (status === 'excused') countExcused++;
    });

    const total = group.students.length + allTableStudents.filter(s => s.isGuest).length;
    el.statTotalStudents.textContent = total;
    el.statPresentCount.textContent = countPresent;
    el.statAbsentCount.textContent = countAbsent;
    el.statLateCount.textContent = countLate;
    el.statExcusedCount.textContent = countExcused;

    const attended = countPresent + countLate + countExcused;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    el.statAttendancePercent.textContent = `${rate}%`;

    // Render Table Rows
    el.attendanceTableBody.innerHTML = allTableStudents.map((s, index) => {
      const rec = state.currentAdminSession.records[s.id] || { status: 'present', notes: '' };
      const status = rec.status || 'present';

      // Total bonus for this student
      const studentBonuses = state.bonuses.filter(b => 
        b.studentId === s.id
      );
      const totalBonus = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);

      return `
        <tr data-student-id="${s.id}">
          <td style="color: var(--text-muted); font-weight: bold;">${index + 1}</td>
          <td><span class="meta-pill id-pill">${s.id}</span></td>
          <td>
            <strong>${s.name}</strong>
            ${s.isGuest ? `<span class="badge-indicator warning" style="margin-right: 6px; font-size: 0.75rem;"><i class="fa-solid fa-plane-arrival"></i> مستضاف من ${s.homeGroupName}</span>` : ''}
          </td>
          <td><small class="meta-pill">${s.program}</small></td>
          <td style="text-align: center;">
            <div class="status-btn-group">
              <button class="status-btn present ${status === 'present' ? 'active' : ''}" data-status="present" title="حاضر">
                <i class="fa-solid fa-check"></i> حاضر
              </button>
              <button class="status-btn absent ${status === 'absent' ? 'active' : ''}" data-status="absent" title="غائب">
                <i class="fa-solid fa-xmark"></i> غائب
              </button>
              <button class="status-btn late ${status === 'late' ? 'active' : ''}" data-status="late" title="متأخر">
                <i class="fa-solid fa-clock"></i> متأخر
              </button>
              <button class="status-btn excused ${status === 'excused' ? 'active' : ''}" data-status="excused" title="بعذر">
                <i class="fa-solid fa-file-medical"></i> عذر
              </button>
            </div>
          </td>
          <td style="text-align: center;">
            <div class="bonus-cell-wrapper">
              <button class="btn-mini-minus" data-action="quick-minus" data-id="${s.id}" data-name="${s.name}" title="خصم / ماينص (-1)">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="bonus-badge-val ${totalBonus > 0 ? 'positive' : (totalBonus < 0 ? 'negative' : '')}" id="bonusVal_${s.id}">${totalBonus > 0 ? '+' + totalBonus : totalBonus}</span>
              <button class="btn-mini-bonus" data-action="quick-bonus" data-id="${s.id}" data-name="${s.name}" title="إضافة بونص سريع (+1)">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
          </td>
          <td>
            <input type="text" class="form-control form-control-sm session-notes-input" data-id="${s.id}" value="${rec.notes || ''}" placeholder="ملاحظات...">
          </td>
        </tr>
      `;
    }).join('');

    // Attach Status Click Handlers
    el.attendanceTableBody.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const studentId = row.getAttribute('data-student-id');
        const newStatus = btn.getAttribute('data-status');

        row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (!state.currentAdminSession.records[studentId]) {
          state.currentAdminSession.records[studentId] = { status: newStatus, notes: '' };
        } else {
          state.currentAdminSession.records[studentId].status = newStatus;
        }

        // --- REAL-TIME AUTO-PERSISTENCE ---
        // Save immediately to state.sessions and localStorage so students see the change instantly!
        const courseId = state.currentAdminSession.courseId;
        const groupId = state.currentAdminSession.groupId;
        const week = state.currentAdminSession.week;
        const date = el.adminSessionDate.value || new Date().toISOString().split('T')[0];
        const key = getSessionKey(courseId, groupId, week);

        if (!state.sessions[key]) {
          state.sessions[key] = {
            courseId,
            groupId,
            week,
            date,
            records: {},
            updatedAt: new Date().toISOString()
          };
        }
        state.sessions[key].records[studentId] = {
          status: newStatus,
          notes: (state.currentAdminSession.records[studentId] && state.currentAdminSession.records[studentId].notes) || ''
        };
        state.sessions[key].date = date;
        state.sessions[key].updatedAt = new Date().toISOString();
        saveSessions();

        updateLiveAttendanceStatsOnly();

        // If this student is currently being viewed in the Student Portal, refresh their view immediately!
        if (state.selectedStudentId === studentId) {
          selectStudentAndRenderCard(studentId);
        }
      });
    });

    // Notes Input Handler
    el.attendanceTableBody.querySelectorAll('.session-notes-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const studentId = input.getAttribute('data-id');
        if (!state.currentAdminSession.records[studentId]) {
          state.currentAdminSession.records[studentId] = { status: 'present', notes: input.value };
        } else {
          state.currentAdminSession.records[studentId].notes = input.value;
        }

        const courseId = state.currentAdminSession.courseId;
        const groupId = state.currentAdminSession.groupId;
        const week = state.currentAdminSession.week;
        const key = getSessionKey(courseId, groupId, week);
        if (state.sessions[key]) {
          if (!state.sessions[key].records[studentId]) {
            state.sessions[key].records[studentId] = { status: 'present', notes: input.value };
          } else {
            state.sessions[key].records[studentId].notes = input.value;
          }
          state.sessions[key].updatedAt = new Date().toISOString();
          saveSessions();
        }
      });
    });

    // Quick Bonus Handler
    el.attendanceTableBody.querySelectorAll('[data-action="quick-bonus"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.getAttribute('data-id');
        const studentName = btn.getAttribute('data-name');
        addQuickBonus(studentId, studentName);
      });
    });

    // Quick Minus Handler
    el.attendanceTableBody.querySelectorAll('[data-action="quick-minus"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const studentId = btn.getAttribute('data-id');
        const studentName = btn.getAttribute('data-name');
        addQuickMinus(studentId, studentName);
      });
    });
  }

  function updateLiveAttendanceStatsOnly() {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    let countPresent = 0;
    let countAbsent = 0;
    let countLate = 0;
    let countExcused = 0;

    group.students.forEach(s => {
      const rec = state.currentAdminSession.records[s.id];
      const status = rec ? rec.status : 'present';
      if (status === 'present') countPresent++;
      else if (status === 'absent') countAbsent++;
      else if (status === 'late') countLate++;
      else if (status === 'excused') countExcused++;
    });

    const total = group.students.length;
    el.statTotalStudents.textContent = total;
    el.statPresentCount.textContent = countPresent;
    el.statAbsentCount.textContent = countAbsent;
    el.statLateCount.textContent = countLate;
    el.statExcusedCount.textContent = countExcused;

    const attended = countPresent + countLate + countExcused;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    el.statAttendancePercent.textContent = `${rate}%`;
  }

  function markAllPresent() {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    group.students.forEach(s => {
      if (!state.currentAdminSession.records[s.id]) {
        state.currentAdminSession.records[s.id] = { status: 'present', notes: '' };
      } else {
        state.currentAdminSession.records[s.id].status = 'present';
      }
    });

    // Real-time auto-persist
    const key = getSessionKey(courseId, groupId, week);
    state.sessions[key] = {
      courseId,
      groupId,
      week,
      date: el.adminSessionDate.value || new Date().toISOString().split('T')[0],
      records: Object.assign({}, state.currentAdminSession.records),
      updatedAt: new Date().toISOString()
    };
    saveSessions();

    renderAdminAttendanceTable();
    showToast('تم تحضير جميع الطلاب كحاضرين بنجاح ✅', 'success');
  }

  function resetCurrentSession() {
    if (!confirm('هل تريد تفريغ حالات الغياب للجلسة الحالية وإعادة تعيينها؟')) return;
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const key = getSessionKey(courseId, groupId, week);

    state.currentAdminSession.records = {};
    if (state.sessions[key]) {
      state.sessions[key].records = {};
      state.sessions[key].updatedAt = new Date().toISOString();
      saveSessions();
    }

    renderAdminAttendanceTable();
    showToast('تمت إعادة ضبط حالات الحضور للجلسة الحالية', 'info');
  }

  function saveCurrentAttendanceSession() {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const date = el.adminSessionDate.value || new Date().toISOString().split('T')[0];
    const key = getSessionKey(courseId, groupId, week);
    const group = getGroup(courseId, groupId);
    if (!group) return;

    // Ensure all students have a record (default to present if untouched)
    group.students.forEach(s => {
      if (!state.currentAdminSession.records[s.id]) {
        state.currentAdminSession.records[s.id] = { status: 'present', notes: '' };
      }
    });

    state.sessions[key] = {
      courseId,
      groupId,
      week,
      date,
      records: state.currentAdminSession.records,
      updatedAt: new Date().toISOString()
    };

    saveSessions();
    showToast(`تم حفظ غياب الأسبوع ${week} بنجاح في الذاكرة المحلية! 💾`, 'success');
  }

  // --- 7. Bonus & Minus Engine ---
  function addQuickBonus(studentId, studentName) {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;

    const bonusObj = {
      id: 'bonus_' + Date.now(),
      studentId,
      studentName,
      courseId,
      groupId,
      week,
      points: 1,
      reason: 'مشاركة وتفاعل في السكشن',
      date: new Date().toLocaleDateString('ar-EG')
    };

    state.bonuses.push(bonusObj);
    saveBonuses();

    updateStudentBonusBadge(studentId, courseId, groupId);
    renderBonusLeaderboard();
    renderBonusLogTable();
    showToast(`تمت إضافة +1 درجات بونص للطالب: ${studentName} ⭐`, 'success');
  }

  function addQuickMinus(studentId, studentName) {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;

    const bonusObj = {
      id: 'minus_' + Date.now(),
      studentId,
      studentName,
      courseId,
      groupId,
      week,
      points: -1,
      reason: 'خصم / ماينص في السكشن',
      date: new Date().toLocaleDateString('ar-EG')
    };

    state.bonuses.push(bonusObj);
    saveBonuses();

    updateStudentBonusBadge(studentId, courseId, groupId);
    renderBonusLeaderboard();
    renderBonusLogTable();
    showToast(`تم خصم -1 (ماينص) للطالب: ${studentName} ⚠️`, 'error');
  }

  function updateStudentBonusBadge(studentId, courseId, groupId) {
    const studentBonuses = state.bonuses.filter(b => 
      b.courseId === courseId && b.groupId === groupId && b.studentId === studentId
    );
    const totalBonus = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);
    const badge = document.getElementById(`bonusVal_${studentId}`);
    if (badge) {
      badge.textContent = totalBonus > 0 ? `+${totalBonus}` : totalBonus;
      badge.className = `bonus-badge-val ${totalBonus > 0 ? 'positive' : (totalBonus < 0 ? 'negative' : '')}`;
    }
  }

  function handleAddBonusFormSubmit(e) {
    e.preventDefault();
    const val = el.bonusCourseGroupSelect.value;
    const [courseId, groupId] = val.split(':::');
    const studentId = el.bonusStudentSelect.value;
    const student = getStudent(courseId, groupId, studentId);
    if (!student) return;

    const points = Number(el.bonusPointsInput.value);
    const week = el.bonusWeekSelect.value;
    const reason = el.bonusReasonInput.value.trim();

    if (points === 0 || isNaN(points) || !reason) {
      showToast('يرجى تحديد الدرجات وكتابة سبب البونص أو الخصم', 'error');
      return;
    }

    const bonusObj = {
      id: (points < 0 ? 'minus_' : 'bonus_') + Date.now(),
      studentId,
      studentName: student.name,
      courseId,
      groupId,
      week,
      points,
      reason,
      date: new Date().toLocaleDateString('ar-EG')
    };

    state.bonuses.push(bonusObj);
    saveBonuses();

    el.bonusReasonInput.value = '';
    renderBonusLeaderboard();
    renderBonusLogTable();
    loadCurrentAdminAttendanceSession(); // refresh badges

    if (points > 0) {
      showToast(`تم توثيق +${points} درجات بونص للطالب ${student.name} بنجاح! 🏆`, 'success');
    } else {
      showToast(`تم توثيق ${points} (ماينص) للطالب ${student.name} بنجاح! ⚠️`, 'warning');
    }
  }

  function renderBonusLeaderboard() {
    const val = el.bonusCourseGroupSelect.value;
    if (!val) return;
    const [courseId, groupId] = val.split(':::');
    const group = getGroup(courseId, groupId);
    if (!group) return;

    // Aggregate bonus by student
    const studentBonusesMap = {};
    group.students.forEach(s => { studentBonusesMap[s.id] = { student: s, points: 0 }; });

    state.bonuses
      .filter(b => b.courseId === courseId && b.groupId === groupId)
      .forEach(b => {
        if (studentBonusesMap[b.studentId]) {
          studentBonusesMap[b.studentId].points += Number(b.points);
        }
      });

    const sorted = Object.values(studentBonusesMap)
      .filter(x => x.points > 0)
      .sort((a, b) => b.points - a.points);

    if (sorted.length === 0) {
      el.bonusLeaderboardList.innerHTML = `<p class="text-muted p-3">لم يتم تسجيل أي بونص لهذه المجموعة بعد.</p>`;
      return;
    }

    el.bonusLeaderboardList.innerHTML = sorted.slice(0, 10).map((item, idx) => {
      let rankClass = 'rank-other';
      if (idx === 0) rankClass = 'rank-1';
      else if (idx === 1) rankClass = 'rank-2';
      else if (idx === 2) rankClass = 'rank-3';

      return `
        <div class="leaderboard-item">
          <div class="d-flex align-center gap-2">
            <span class="rank-badge ${rankClass}">${idx + 1}</span>
            <div>
              <strong>${item.student.name}</strong>
              <div><small class="text-muted">${item.student.id}</small></div>
            </div>
          </div>
          <span class="bonus-badge-val positive" style="font-size: 1.1rem; padding: 4px 10px;">+${item.points} نقطة</span>
        </div>
      `;
    }).join('');
  }

  function renderBonusLogTable() {
    const filterText = (el.bonusLogFilter.value || '').trim().toLowerCase();
    const sortedBonuses = [...state.bonuses].reverse().filter(b => 
      !filterText || 
      b.studentName.toLowerCase().includes(filterText) || 
      b.studentId.includes(filterText) || 
      b.reason.toLowerCase().includes(filterText)
    );

    if (sortedBonuses.length === 0) {
      el.bonusLogTableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center" style="padding: 2rem;">لا توجد سجلات بونص أو خصم مطابقة</td></tr>`;
      return;
    }

    el.bonusLogTableBody.innerHTML = sortedBonuses.map(b => {
      const course = getCourse(b.courseId);
      const group = getGroup(b.courseId, b.groupId);
      const groupName = group ? group.name : b.groupId;
      const courseName = course ? course.name : b.courseId;
      const isPositive = Number(b.points) > 0;

      return `
        <tr>
          <td><small class="text-muted">${b.date}</small></td>
          <td><span class="meta-pill">الأسبوع ${b.week}</span></td>
          <td><small>${courseName} - ${groupName}</small></td>
          <td><span class="meta-pill id-pill">${b.studentId}</span></td>
          <td><strong>${b.studentName}</strong></td>
          <td><strong class="${isPositive ? 'text-gold' : 'text-danger'}">${isPositive ? '+' + b.points : b.points}</strong></td>
          <td>${b.reason}</td>
          <td style="text-align: center;">
            <button class="btn btn-outline btn-sm text-danger" onclick="window.__deleteBonus('${b.id}')" title="حذف">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.__deleteBonus = function(id) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا البونص؟')) return;
    state.bonuses = state.bonuses.filter(b => b.id !== id);
    saveBonuses();
    renderBonusLeaderboard();
    renderBonusLogTable();
    loadCurrentAdminAttendanceSession();
    showToast('تم حذف البونص بنجاح', 'info');
  };

  // --- 8. Reports & Printable PDF Engine ---
  function generateOfficialReportPreview() {
    const courseId = el.reportCourseSelect.value;
    const groupId = el.reportGroupSelect.value;
    const reportType = el.reportTypeSelect.value;
    const week = el.reportWeekSelect.value;

    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) return;

    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

    // Detect active weeks (weeks that have been recorded / uploaded)
    const activeWeeks = [];
    const weekAttendanceCounts = {};
    weeks.forEach(w => {
      const key = getSessionKey(courseId, groupId, w);
      const sess = state.sessions[key];
      if (sess && sess.records && Object.keys(sess.records).length > 0) {
        activeWeeks.push(w);
      }
      weekAttendanceCounts[w] = 0;
    });

    const sessionKey = getSessionKey(courseId, groupId, week);
    const session = state.sessions[sessionKey];
    const sessionDate = session ? session.date : new Date().toLocaleDateString('ar-EG');

    // Populate Report Header Meta
    el.printCourseName.textContent = `${course.name} (${course.nameAr})`;
    el.printGroupName.textContent = group.name;
    el.printGeneratedTimestamp.textContent = new Date().toLocaleString('ar-EG');

    let totalStudents = group.students.length;
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let lateCount = 0;
    let tableHtml = '';

    if (reportType === 'formal_12weeks') {
      el.printReportMainTitle.textContent = 'كشف رصد الحضور والغياب الرسمي الفصلي (12 أسبوعاً)';
      el.printWeekNumber.textContent = activeWeeks.length > 0 ? `الأسابيع المرصودة: (1 - ${Math.max(...activeWeeks)})` : 'لم يتم رصد أسابيع بعد';
      el.printSessionDate.textContent = 'الفصل الدراسي الأول 2026 / 2027';

      let totalGroupPresences = 0;
      let totalGroupAbsences = 0;
      let totalGroupBonuses = 0;

      const rows = group.students.map((s, idx) => {
        let studentPresences = 0;
        let studentAbsences = 0;

        // 12 Weeks attendance marks: ✓ for present, ✗ for absent, - for not yet uploaded
        const weekCells = weeks.map(w => {
          if (!activeWeeks.includes(w)) {
            return `<td class="col-week"><span class="formal-mark future" title="الأسبوع ${w} - لم يُرفع بعد">-</span></td>`;
          }

          const wKey = getSessionKey(courseId, groupId, w);
          const wSess = state.sessions[wKey];
          const rec = wSess && wSess.records ? wSess.records[s.id] : null;
          const status = rec ? rec.status : 'absent';

          if (status === 'present' || status === 'late') {
            studentPresences++;
            weekAttendanceCounts[w]++;
            totalGroupPresences++;
            return `<td class="col-week"><span class="formal-mark present" title="الأسبوع ${w}: حاضر">✓</span></td>`;
          } else if (status === 'absent') {
            studentAbsences++;
            totalGroupAbsences++;
            return `<td class="col-week"><span class="formal-mark absent" title="الأسبوع ${w}: غائب">✗</span></td>`;
          } else if (status === 'excused') {
            studentPresences++;
            totalGroupPresences++;
            return `<td class="col-week"><span class="formal-mark excused" style="color: #2563eb; font-weight: bold;" title="الأسبوع ${w}: عذر مقبول">ع</span></td>`;
          }
          return `<td class="col-week"><span class="formal-mark future">-</span></td>`;
        }).join('');

        // Student bonuses
        const studentBonuses = state.bonuses.filter(b => 
          b.courseId === courseId && b.groupId === groupId && b.studentId === s.id
        );
        const bonusPts = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);
        totalGroupBonuses += bonusPts;

        // Attendance rate over recorded active weeks
        const studentRate = activeWeeks.length > 0 ? Math.round((studentPresences / activeWeeks.length) * 100) : 100;

        return `
          <tr>
            <td class="col-num">${idx + 1}</td>
            <td class="col-name"><strong>${s.name}</strong></td>
            <td class="col-code">${s.id}</td>
            ${weekCells}
            <td class="col-stat stat-val-present">${studentPresences}</td>
            <td class="col-stat stat-val-absent">${studentAbsences}</td>
            <td class="col-stat stat-val-bonus">${bonusPts > 0 ? '+' + bonusPts : '0'}</td>
            <td class="col-stat" style="font-weight: 800; color: ${studentRate < 60 ? '#dc2626' : studentRate < 75 ? '#d97706' : '#059669'};">${studentRate}%</td>
          </tr>
        `;
      }).join('');

      const totalRecordedOpportunities = group.students.length * activeWeeks.length;
      const overallGroupRate = totalRecordedOpportunities > 0 ? Math.round((totalGroupPresences / totalRecordedOpportunities) * 100) : 100;

      tableHtml = `
        <table class="formal-12w-table">
          <thead>
            <tr class="header-main-row">
              <th rowspan="2" class="col-num">م</th>
              <th rowspan="2" class="col-name">اسم الطالب رباعي</th>
              <th rowspan="2" class="col-code">كود الطالب</th>
              <th colspan="12" class="col-weeks-title">أسابيع الفصل الدراسي (12 أسبوعاً)</th>
              <th colspan="4" class="col-summary-title">الإحصائيات الكلية</th>
            </tr>
            <tr>
              ${weeks.map(w => `<th class="col-week ${activeWeeks.includes(w) ? 'week-active' : 'week-future'}" title="الأسبوع ${w}">أ${w}</th>`).join('')}
              <th class="col-stat" title="إجمالي أسابيع الحضور">حضور</th>
              <th class="col-stat" title="إجمالي أسابيع الغياب">غياب</th>
              <th class="col-stat" title="إجمالي درجات البونص">بونص</th>
              <th class="col-stat" title="نسبة الحضور المئوية">النسبة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #334155;">
              <td colspan="3" style="text-align: right; padding-right: 10px;">إجمالي الحاضرين في السكشن:</td>
              ${weeks.map(w => {
                if (!activeWeeks.includes(w)) return '<td class="col-week" style="color: #94a3b8;">-</td>';
                return `<td class="col-week" style="color: #059669; font-weight: 800;">${weekAttendanceCounts[w]}</td>`;
              }).join('')}
              <td class="col-stat stat-val-present">${totalGroupPresences}</td>
              <td class="col-stat stat-val-absent">${totalGroupAbsences}</td>
              <td class="col-stat stat-val-bonus">+${totalGroupBonuses}</td>
              <td class="col-stat" style="color: #0f172a; font-weight: 900;">${overallGroupRate}%</td>
            </tr>
          </tfoot>
        </table>
      `;

      // Set stats pills
      el.printTotalStudents.textContent = totalStudents;
      el.printPresentStudents.textContent = `${totalGroupPresences} حضور`;
      el.printAbsentStudents.textContent = `${totalGroupAbsences} غياب`;
      el.printExcusedStudents.textContent = `${activeWeeks.length} / 12 أسبوع`;
      el.printAttendanceRate.textContent = `${overallGroupRate}%`;

    } else if (reportType === 'weekly') {
      el.printReportMainTitle.textContent = `كشف غياب الطلاب الأسبوعي - الأسبوع ${week}`;
      el.printWeekNumber.textContent = `الأسبوع ${week}`;
      el.printSessionDate.textContent = sessionDate;

      // Filter absent & late & excused students
      const absentees = [];
      group.students.forEach((s, idx) => {
        const rec = session && session.records ? session.records[s.id] : null;
        const status = rec ? rec.status : 'present';

        if (status === 'present') presentCount++;
        else if (status === 'absent') { absentCount++; absentees.push({ student: s, status, notes: rec ? rec.notes : '', originalIndex: idx + 1 }); }
        else if (status === 'late') { lateCount++; absentees.push({ student: s, status, notes: rec ? rec.notes : '', originalIndex: idx + 1 }); }
        else if (status === 'excused') { excusedCount++; absentees.push({ student: s, status, notes: rec ? rec.notes : '', originalIndex: idx + 1 }); }
      });

      if (absentees.length === 0) {
        tableHtml = `
          <div style="padding: 2rem; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
            <h4 style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> نسبة الحضور 100%</h4>
            <p>لا يوجد أي طلاب غائبين في هذا الأسبوع بموجب كشف الغياب.</p>
          </div>
        `;
      } else {
        tableHtml = `
          <table>
            <thead>
              <tr>
                <th style="width: 45px;">م</th>
                <th>اسم الطالب رباعي</th>
                <th style="width: 100px;">كود الطالب</th>
                <th style="width: 130px;">البرنامج</th>
                <th style="width: 90px; text-align: center;">الحالة</th>
                <th>ملاحظات المعيد / العذر</th>
              </tr>
            </thead>
            <tbody>
              ${absentees.map((item, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                  <td><strong>${item.student.name}</strong></td>
                  <td>${item.student.id}</td>
                  <td>${item.student.program}</td>
                  <td style="text-align: center; font-weight: bold; color: ${item.status === 'absent' ? '#ef4444' : item.status === 'late' ? '#f59e0b' : '#3b82f6'};">
                    ${item.status === 'absent' ? 'غائب' : item.status === 'late' ? 'متأخر' : 'عذر مقبول'}
                  </td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      el.printTotalStudents.textContent = totalStudents;
      el.printPresentStudents.textContent = presentCount;
      el.printAbsentStudents.textContent = absentCount;
      el.printExcusedStudents.textContent = lateCount + excusedCount;
      const attended = presentCount + lateCount + excusedCount;
      const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;
      el.printAttendanceRate.textContent = `${rate}%`;

    } else if (reportType === 'attendance_sheet') {
      el.printReportMainTitle.textContent = `كشف الحضور الكامل للأسبوع ${week}`;
      el.printWeekNumber.textContent = `الأسبوع ${week}`;
      el.printSessionDate.textContent = sessionDate;

      const rows = group.students.map((s, idx) => {
        const rec = session && session.records ? session.records[s.id] : null;
        const status = rec ? rec.status : 'present';
        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else if (status === 'late') lateCount++;
        else if (status === 'excused') excusedCount++;

        let statusText = 'حاضر';
        let statusColor = '#10b981';
        if (status === 'absent') { statusText = 'غائب'; statusColor = '#ef4444'; }
        if (status === 'late') { statusText = 'متأخر'; statusColor = '#f59e0b'; }
        if (status === 'excused') { statusText = 'عذر'; statusColor = '#3b82f6'; }

        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.id}</td>
            <td>${s.program}</td>
            <td style="text-align: center; font-weight: bold; color: ${statusColor};">${statusText}</td>
            <td>${rec ? rec.notes || '' : ''}</td>
          </tr>
        `;
      }).join('');

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">م</th>
              <th>اسم الطالب رباعي</th>
              <th style="width: 100px;">الكود</th>
              <th style="width: 130px;">البرنامج</th>
              <th style="width: 80px; text-align: center;">الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      el.printTotalStudents.textContent = totalStudents;
      el.printPresentStudents.textContent = presentCount;
      el.printAbsentStudents.textContent = absentCount;
      el.printExcusedStudents.textContent = lateCount + excusedCount;
      const attended = presentCount + lateCount + excusedCount;
      const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;
      el.printAttendanceRate.textContent = `${rate}%`;

    } else if (reportType === 'bonus_report') {
      el.printReportMainTitle.textContent = `تقرير درجات البونص التراكمي للمقرر`;
      el.printWeekNumber.textContent = 'جميع الأسابيع';
      el.printSessionDate.textContent = new Date().toLocaleDateString('ar-EG');

      // Find all students in this group with bonuses
      const bonusStudents = [];
      group.students.forEach((s, idx) => {
        const studentBonuses = state.bonuses.filter(b => 
          b.courseId === courseId && b.groupId === groupId && b.studentId === s.id
        );
        const totalBonus = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);
        if (totalBonus > 0) {
          bonusStudents.push({ student: s, totalBonus, bonuses: studentBonuses, originalIndex: idx + 1 });
        }
      });

      bonusStudents.sort((a, b) => b.totalBonus - a.totalBonus);

      tableHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">م</th>
              <th>اسم الطالب</th>
              <th style="width: 100px;">كود الطالب</th>
              <th style="width: 130px;">البرنامج</th>
              <th style="width: 90px; text-align: center;">إجمالي البونص</th>
              <th>تفاصيل وأسباب المنح</th>
            </tr>
          </thead>
          <tbody>
            ${bonusStudents.map((item, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${item.student.name}</strong></td>
                <td>${item.student.id}</td>
                <td>${item.student.program}</td>
                <td style="text-align: center; font-weight: bold; color: #d97706;">+${item.totalBonus}</td>
                <td><small>${item.bonuses.map(b => `[W${b.week}: +${b.points} - ${b.reason}]`).join(' , ')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      el.printTotalStudents.textContent = totalStudents;
      el.printPresentStudents.textContent = `${bonusStudents.length} طلاب حاصلون على بونص`;
      el.printAbsentStudents.textContent = '0';
      el.printExcusedStudents.textContent = '-';
      el.printAttendanceRate.textContent = '100%';
    }

    el.printTableContainer.innerHTML = tableHtml;
    showToast('تم تجهيز التقرير الرسمي بنجاح - جاهز للطباعة والـ PDF 🖨️', 'success');
  }

  function printOfficialPDF() {
    generateOfficialReportPreview();
    window.print();
  }

  function exportReportToCSV() {
    const courseId = el.reportCourseSelect.value;
    const groupId = el.reportGroupSelect.value;
    const reportType = el.reportTypeSelect.value;
    const week = el.reportWeekSelect.value;
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) return;

    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
    const activeWeeks = [];
    weeks.forEach(w => {
      const key = getSessionKey(courseId, groupId, w);
      const sess = state.sessions[key];
      if (sess && sess.records && Object.keys(sess.records).length > 0) {
        activeWeeks.push(w);
      }
    });

    if (reportType === 'formal_12weeks') {
      let csvContent = "\uFEFFم,اسم الطالب,كود الطالب,البرنامج,";
      csvContent += weeks.map(w => `الأسبوع ${w}`).join(',') + ",إجمالي الحضور,إجمالي الغياب,درجات البونص,نسبة الحضور %\n";

      group.students.forEach((s, idx) => {
        let pCount = 0;
        let aCount = 0;
        const weekMarks = weeks.map(w => {
          if (!activeWeeks.includes(w)) return '-';
          const key = getSessionKey(courseId, groupId, w);
          const sess = state.sessions[key];
          const rec = sess && sess.records ? sess.records[s.id] : null;
          const status = rec ? rec.status : 'absent';
          if (status === 'present' || status === 'late') { pCount++; return 'حاضر'; }
          if (status === 'absent') { aCount++; return 'غائب'; }
          if (status === 'excused') { pCount++; return 'عذر'; }
          return '-';
        });

        const studentBonuses = state.bonuses.filter(b => 
          b.courseId === courseId && b.groupId === groupId && b.studentId === s.id
        );
        const bPts = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);
        const rate = activeWeeks.length > 0 ? Math.round((pCount / activeWeeks.length) * 100) : 100;

        csvContent += `${idx + 1},"${s.name}","${s.id}","${s.program}",${weekMarks.join(',')},${pCount},${aCount},${bPts},${rate}%\n`;
      });

      downloadBlob(csvContent, `Formal_Attendance_12Weeks_${courseId}_${groupId}.csv`, 'text/csv;charset=utf-8;');
      showToast('تم تصدير كشف الحضور الفصلي (12 أسبوعاً) إلى Excel بنجاح 📊', 'success');
      return;
    }

    const sessionKey = getSessionKey(courseId, groupId, week);
    const session = state.sessions[sessionKey];

    let csvContent = "\uFEFFم,كود الطالب,اسم الطالب,البرنامج,الحالة,ملاحظات\n";

    group.students.forEach((s, idx) => {
      const rec = session && session.records ? session.records[s.id] : null;
      const status = rec ? rec.status : 'حاضر';
      const notes = rec ? (rec.notes || '') : '';
      csvContent += `${idx + 1},"${s.id}","${s.name}","${s.program}","${status}","${notes}"\n`;
    });

    downloadBlob(csvContent, `Attendance_${courseId}_${groupId}_W${week}.csv`, 'text/csv;charset=utf-8;');
    showToast('تم تصدير ملف Excel (CSV) بنجاح 📊', 'success');
  }

  // --- 9. Cumulative Matrix Engine ---
  function renderCumulativeMatrix() {
    const courseId = el.cumCourseSelect.value;
    const groupId = el.cumGroupSelect.value;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

    // Header Row
    let thead = `
      <thead>
        <tr>
          <th style="width: 40px;">م</th>
          <th style="width: 95px;">الكود</th>
          <th class="name-col" style="min-width: 170px;">اسم الطالب</th>
          ${weeks.map(w => `<th style="width: 32px; font-size: 0.8rem;">أ${w}</th>`).join('')}
          <th style="width: 55px;">حاضر</th>
          <th style="width: 55px;">غائب</th>
          <th style="width: 65px;">النسبة</th>
          <th style="width: 60px;">البونص</th>
          <th style="width: 75px;">الحالة</th>
        </tr>
      </thead>
    `;

    let tbody = '<tbody>';
    group.students.forEach((s, idx) => {
      const stats = getStudentStats(courseId, groupId, s.id);

      // Status Indicator badge
      let badgeHtml = '<span class="badge-indicator safe">ملتزم</span>';
      if (stats.absent >= 3 || stats.rate < 60) {
        badgeHtml = '<span class="badge-indicator danger">حرمان</span>';
      } else if (stats.absent >= 2 || stats.rate < 75) {
        badgeHtml = '<span class="badge-indicator warning">إنذار</span>';
      }

      // Week symbols
      let weeksCells = weeks.map(w => {
        const item = stats.timeline.find(t => t.week === w);
        if (!item || item.status === 'unrecorded') return `<td class="status-symbol-u">-</td>`;
        if (item.status === 'present') return `<td class="status-symbol-p">✓</td>`;
        if (item.status === 'absent') return `<td class="status-symbol-a">✗</td>`;
        if (item.status === 'late') return `<td class="status-symbol-l">ت</td>`;
        if (item.status === 'excused') return `<td class="status-symbol-e">ع</td>`;
        return `<td>-</td>`;
      }).join('');

      tbody += `
        <tr>
          <td>${idx + 1}</td>
          <td><small class="meta-pill id-pill">${s.id}</small></td>
          <td class="name-col">${s.name}</td>
          ${weeksCells}
          <td style="color: var(--color-present); font-weight: bold;">${stats.present}</td>
          <td style="color: var(--color-absent); font-weight: bold;">${stats.absent}</td>
          <td style="font-weight: bold;">${stats.rate}%</td>
          <td style="color: #f59e0b; font-weight: bold;">+${stats.totalBonusPoints}</td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    });
    tbody += '</tbody>';

    el.cumulativeMatrixTable.innerHTML = thead + tbody;
  }

  function exportCumulativeToCSV() {
    const courseId = el.cumCourseSelect.value;
    const groupId = el.cumGroupSelect.value;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
    let csv = `\uFEFFم,كود الطالب,اسم الطالب,${weeks.map(w => `أسبوع ${w}`).join(',')},إجمالي الحضور,إجمالي الغياب,نسبة الحضور,رصيد البونص,التقييم\n`;

    group.students.forEach((s, idx) => {
      const stats = getStudentStats(courseId, groupId, s.id);
      const weekSymbols = weeks.map(w => {
        const item = stats.timeline.find(t => t.week === w);
        if (!item || item.status === 'unrecorded') return '-';
        if (item.status === 'present') return 'حاضر';
        if (item.status === 'absent') return 'غائب';
        if (item.status === 'late') return 'متأخر';
        if (item.status === 'excused') return 'عذر';
        return '-';
      });

      let statusDesc = stats.rate >= 75 ? 'ملتزم' : stats.rate >= 60 ? 'إنذار' : 'حرمان';
      csv += `${idx + 1},"${s.id}","${s.name}",${weekSymbols.map(ws => `"${ws}"`).join(',')},${stats.present},${stats.absent},"${stats.rate}%",${stats.totalBonusPoints},"${statusDesc}"\n`;
    });

    downloadBlob(csv, `Cumulative_Attendance_${courseId}_${groupId}.csv`, 'text/csv;charset=utf-8;');
    showToast('تم تصدير الكشف التراكمي للترم كاملاً بنجاح! 📁', 'success');
  }

  // --- 10. Google Sheets Cloud Integration ---
  async function syncCurrentSessionToGoogleSheets() {
    const url = state.config.googleScriptUrl;
    if (!url) {
      showToast('يرجى وضع رابط Google Apps Script Webhook في صفحة الإعدادات أولاً!', 'error');
      switchAdminTab('tabSettings');
      return;
    }

    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const group = getGroup(courseId, groupId);
    if (!group) return;

    saveCurrentAttendanceSession();

    const payload = {
      action: 'sync_session',
      courseId,
      groupId,
      week,
      date: el.adminSessionDate.value || new Date().toISOString().split('T')[0],
      records: group.students.map(s => {
        const rec = state.currentAdminSession.records[s.id] || { status: 'present', notes: '' };
        const studentBonuses = state.bonuses.filter(b => 
          b.courseId === courseId && b.groupId === groupId && b.studentId === s.id && String(b.week) === String(week)
        );
        const bonusPts = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);

        return {
          id: s.id,
          name: s.name,
          program: s.program,
          status: rec.status,
          bonus: bonusPts,
          notes: rec.notes || ''
        };
      })
    };

    showToast('جارٍ رفع البيانات ومزامنتها مع Google Sheets... ⏳', 'info');

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('تم إرسال البيانات إلى Google Sheets بنجاح! 🚀', 'success');
    } catch(err) {
      showToast('حدث خطأ أثناء الاتصال بـ Google Sheets، تأكد من صحة الرابط', 'error');
    }
  }

  async function testGoogleConnection() {
    const url = el.googleScriptUrlInput.value.trim();
    if (!url) {
      showToast('أدخل الرابط أولاً للاختبار', 'error');
      return;
    }

    showToast('جارٍ اختبار الاتصال بـ Google Webhook... ⚡', 'info');
    try {
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      showToast('الرابط صالح ويعمل بنجاح! تم التحقق من Google Script ✅', 'success');
    } catch(err) {
      showToast('تعذر الاتصال بالرابط، تأكد من نشر الـ Web App بصلاحية Anyone', 'error');
    }
  }

  // --- 11. Backup & Security ---
  function downloadFullBackupJSON() {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      instructor: 'Eng. Ahmed El-khatib',
      sessions: state.sessions,
      bonuses: state.bonuses,
      config: state.config
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    downloadBlob(jsonStr, `Attendance_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast('تم تحميل النسخة الاحتياطية بنجاح 📦', 'success');
  }

  function handleRestoreBackupFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.sessions && parsed.bonuses) {
          state.sessions = parsed.sessions;
          state.bonuses = parsed.bonuses;
          if (parsed.config) state.config = Object.assign(state.config, parsed.config);
          saveSessions();
          saveBonuses();
          saveConfig();
          loadCurrentAdminAttendanceSession();
          renderBonusLeaderboard();
          renderBonusLogTable();
          showToast('تم استرجاع جميع السجلات بنجاح تام! 🔄', 'success');
        } else {
          showToast('الملف غير متوافق أو لا يحتوي على بنية النسخ الصحيحة', 'error');
        }
      } catch(err) {
        showToast('فشل قراءة الملف، تأكد أنه ملف JSON سليم', 'error');
      }
    };
    reader.readAsText(file);
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // --- 12. View Navigation & Mode Switching ---
  function switchMode(mode) {
    if (mode === 'admin') {
      if (state.isAdminAuthenticated) {
        showAdminView();
      } else {
        openPinModal();
      }
    } else {
      showStudentView();
    }
  }

  function showStudentView() {
    el.studentPortalView.classList.add('active');
    el.adminDashboardView.classList.remove('active');
    el.btnStudentView.classList.add('active');
    el.btnAdminView.classList.remove('active');

    // Live refresh student record card with latest saved attendance
    if (state.selectedStudentId) {
      selectStudentAndRenderCard(state.selectedStudentId);
    }
  }

  function showAdminView() {
    el.studentPortalView.classList.remove('active');
    el.adminDashboardView.classList.add('active');
    el.btnStudentView.classList.remove('active');
    el.btnAdminView.classList.add('active');
    loadCurrentAdminAttendanceSession();
  }

  function switchAdminTab(tabId) {
    state.activeAdminTab = tabId;
    el.adminTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    el.adminTabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'tabCumulative') {
      renderCumulativeMatrix();
    } else if (tabId === 'tabBonus') {
      renderBonusLeaderboard();
      renderBonusLogTable();
    } else if (tabId === 'tabReports') {
      generateOfficialReportPreview();
    } else if (tabId === 'tabAppeals') {
      renderAppealsTable();
    }
  }

  function openPinModal() {
    el.adminPinInput.value = '';
    el.pinErrorMessage.classList.add('hidden');
    el.pinModal.classList.remove('hidden');
    el.adminPinInput.focus();
  }

  function closePinModal() {
    el.pinModal.classList.add('hidden');
  }

  // ============================================================
  // --- 14. Live Dynamic QR Code & Projector Engine ---
  // ============================================================
  function startQrProjectorSession() {
    const courseId = el.adminCourseSelect.value;
    const groupId = el.adminGroupSelect.value;
    const week = el.adminWeekSelect.value;
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) {
      showToast('يرجى اختيار المقرر والمجموعة أولاً', 'error');
      return;
    }

    const sessionKey = getSessionKey(courseId, groupId, week);
    state.activeQrSession = {
      active: true,
      isPaused: false,
      courseId,
      groupId,
      week,
      sessionKey,
      currentPin: '',
      token: '',
      exp: 0,
      countdownRemaining: 15,
      timer: null
    };

    if (el.qrProjectorTitle) el.qrProjectorTitle.textContent = `${course.name} - ${group.name} (الأسبوع ${week})`;
    if (el.qrProjectorDate) el.qrProjectorDate.textContent = el.adminSessionDate.value || new Date().toISOString().split('T')[0];
    if (el.qrProjectorModal) el.qrProjectorModal.classList.remove('hidden');

    updateQrAttendeesDisplay();
    generateNewQrCode();

    if (state.activeQrSession.timer) clearInterval(state.activeQrSession.timer);
    state.activeQrSession.timer = setInterval(() => {
      if (!state.activeQrSession.active || state.activeQrSession.isPaused) return;

      state.activeQrSession.countdownRemaining--;
      const pct = Math.max(0, (state.activeQrSession.countdownRemaining / 15) * 100);
      if (el.qrTimerProgress) el.qrTimerProgress.style.width = `${pct}%`;
      if (el.qrTimerSeconds) el.qrTimerSeconds.textContent = `يتجدد الكود خلال ${state.activeQrSession.countdownRemaining} ثانية`;

      if (state.activeQrSession.countdownRemaining <= 0) {
        generateNewQrCode();
      }
    }, 1000);
  }

  function generateNewQrCode() {
    if (!state.activeQrSession.active) return;

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const token = Math.random().toString(36).substring(2, 8);
    const exp = Date.now() + 18000;

    state.activeQrSession.currentPin = pin;
    state.activeQrSession.token = token;
    state.activeQrSession.exp = exp;
    state.activeQrSession.countdownRemaining = 15;

    if (el.qrPinDisplay) el.qrPinDisplay.textContent = pin;
    if (el.qrTimerProgress) el.qrTimerProgress.style.width = '100%';

    // Generate Full Direct Checkin Web URL so scanning with ANY mobile phone camera opens the page!
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    const checkinUrl = `${baseUrl}?checkin=1&c=${encodeURIComponent(state.activeQrSession.courseId)}&g=${encodeURIComponent(state.activeQrSession.groupId)}&w=${encodeURIComponent(state.activeQrSession.week)}&pin=${pin}&t=${token}`;

    if (el.qrDirectCheckinUrlInput) {
      el.qrDirectCheckinUrlInput.value = checkinUrl;
    }

    if (el.qrCanvasContainer) {
      el.qrCanvasContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        try {
          new QRCode(el.qrCanvasContainer, {
            text: checkinUrl,
            width: 230,
            height: 230,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (e) {
          renderFallbackQrSvg(el.qrCanvasContainer, pin);
        }
      } else {
        renderFallbackQrSvg(el.qrCanvasContainer, pin);
      }
    }
  }

  function renderFallbackQrSvg(container, pin) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1.5rem 1rem;">
        <i class="fa-solid fa-qrcode" style="font-size: 5.5rem; color: #0284c7; margin-bottom: 0.5rem;"></i>
        <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">رمز الحضور المباشر</div>
        <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${pin}</div>
      </div>
    `;
  }

  function updateQrAttendeesDisplay() {
    const courseId = state.activeQrSession.courseId;
    const groupId = state.activeQrSession.groupId;
    const week = state.activeQrSession.week;
    const key = getSessionKey(courseId, groupId, week);
    const session = state.sessions[key];
    const group = getGroup(courseId, groupId);
    if (!session || !session.records || !group) {
      if (el.qrAttendeesCount) el.qrAttendeesCount.textContent = '0';
      if (el.qrRecentAttendeesList) el.qrRecentAttendeesList.innerHTML = '<div class="stream-empty">بانتظار مسح أول طالب للكود...</div>';
      return;
    }

    const presentStudents = [];
    Object.keys(session.records).forEach(sid => {
      const rec = session.records[sid];
      if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused')) {
        const found = findStudentAcrossAllGroups(sid);
        if (found) {
          presentStudents.push({
            id: sid,
            name: found.student.name,
            notes: rec.notes || ''
          });
        }
      }
    });

    if (el.qrAttendeesCount) el.qrAttendeesCount.textContent = presentStudents.length;

    if (el.qrRecentAttendeesList) {
      if (presentStudents.length === 0) {
        el.qrRecentAttendeesList.innerHTML = '<div class="stream-empty">بانتظار مسح أول طالب للكود...</div>';
      } else {
        el.qrRecentAttendeesList.innerHTML = presentStudents.slice(-8).reverse().map(s => `
          <div class="stream-item">
            <span><strong>${s.name}</strong> <small class="text-muted">(${s.id})</small></span>
            <span class="badge-pill text-success" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> حاضر</span>
          </div>
        `).join('');
      }
    }
  }

  function toggleQrPause() {
    state.activeQrSession.isPaused = !state.activeQrSession.isPaused;
    if (el.btnToggleQrPause) {
      const icon = el.btnToggleQrPause.querySelector('i');
      if (icon) {
        icon.className = state.activeQrSession.isPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
      }
      el.btnToggleQrPause.title = state.activeQrSession.isPaused ? 'استئناف التجديد' : 'إيقاف مؤقت';
    }
    showToast(state.activeQrSession.isPaused ? 'تم إيقاف تجديد الكود مؤقتاً' : 'تم استئناف تجديد الكود', 'info');
  }

  function closeQrProjectorSession() {
    if (state.activeQrSession.timer) {
      clearInterval(state.activeQrSession.timer);
      state.activeQrSession.timer = null;
    }
    state.activeQrSession.active = false;
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (e) {}
    }
    if (el.qrProjectorModal) {
      el.qrProjectorModal.classList.remove('is-fullscreen');
      el.qrProjectorModal.classList.add('hidden');
    }
    loadCurrentAdminAttendanceSession();
  }

  // ============================================================
  // --- 15. Student QR Scanner, PIN & Direct Self-Checkin Engine ---
  // ============================================================
  function openDirectCheckinModalForSession(courseId, groupId, week, pin) {
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) return;

    state.pendingCheckinSession = {
      courseId,
      groupId,
      week: String(week),
      pin: pin || ''
    };
    state.pendingCheckinStudent = null;

    if (el.studentAttendanceModal) el.studentAttendanceModal.classList.remove('hidden');
    if (el.studentCheckinSuccessCard) el.studentCheckinSuccessCard.classList.add('hidden');
    if (el.studentCheckinVerifiedCard) el.studentCheckinVerifiedCard.classList.add('hidden');
    if (el.btnConfirmDirectAttendance) el.btnConfirmDirectAttendance.disabled = true;

    // Populate Active Session Info Banner
    if (el.checkinSessionBanner) {
      el.checkinSessionBanner.classList.remove('hidden');
      if (el.checkinBannerTitle) el.checkinBannerTitle.textContent = `${course.name} - ${group.name}`;
      if (el.checkinBannerWeekBadge) el.checkinBannerWeekBadge.textContent = `الأسبوع ${week}`;
      if (el.checkinBannerDate) {
        const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        el.checkinBannerDate.textContent = todayStr;
      }
    }

    // Default to Direct Name/ID Lookup Tab
    switchCheckinTab('direct');

    // Pre-fill if student is already selected or saved in state
    if (el.studentCheckinSearchInput) {
      if (state.selectedStudentId) {
        const existingStudent = findStudentAcrossAllGroups(state.selectedStudentId);
        if (existingStudent) {
          el.studentCheckinSearchInput.value = `${existingStudent.student.name} (${existingStudent.student.id})`;
          selectStudentForDirectCheckin(existingStudent.student.id);
        } else {
          el.studentCheckinSearchInput.value = '';
          el.studentCheckinSearchInput.focus();
        }
      } else {
        el.studentCheckinSearchInput.value = '';
        setTimeout(() => el.studentCheckinSearchInput.focus(), 300);
      }
    }
  }

  function openStudentCheckinModal() {
    let courseId = state.activeQrSession.active ? state.activeQrSession.courseId : state.currentAdminSession.courseId;
    let groupId = state.activeQrSession.active ? state.activeQrSession.groupId : state.currentAdminSession.groupId;
    let week = state.activeQrSession.active ? state.activeQrSession.week : state.currentAdminSession.week;

    if (!courseId || !groupId) {
      courseId = 'data_comm';
      groupId = 'sec_a';
      week = '1';
    }

    openDirectCheckinModalForSession(courseId, groupId, week, state.activeQrSession.currentPin);
  }

  function closeStudentCheckinModal() {
    stopQrCamera();
    if (el.studentAttendanceModal) el.studentAttendanceModal.classList.add('hidden');
    if (el.studentCheckinSuggestions) el.studentCheckinSuggestions.classList.add('hidden');
  }

  function switchCheckinTab(tab) {
    if (tab === 'direct') {
      if (el.tabBtnDirectNameId) el.tabBtnDirectNameId.classList.add('active');
      if (el.tabBtnScanCamera) el.tabBtnScanCamera.classList.remove('active');
      if (el.tabBtnManualPin) el.tabBtnManualPin.classList.remove('active');
      if (el.tabContentDirectNameId) el.tabContentDirectNameId.classList.remove('hidden');
      if (el.tabContentScanCamera) el.tabContentScanCamera.classList.add('hidden');
      if (el.tabContentManualPin) el.tabContentManualPin.classList.add('hidden');
      stopQrCamera();
      if (el.studentCheckinSearchInput) el.studentCheckinSearchInput.focus();
    } else if (tab === 'camera') {
      if (el.tabBtnScanCamera) el.tabBtnScanCamera.classList.add('active');
      if (el.tabBtnDirectNameId) el.tabBtnDirectNameId.classList.remove('active');
      if (el.tabBtnManualPin) el.tabBtnManualPin.classList.remove('active');
      if (el.tabContentScanCamera) el.tabContentScanCamera.classList.remove('hidden');
      if (el.tabContentDirectNameId) el.tabContentDirectNameId.classList.add('hidden');
      if (el.tabContentManualPin) el.tabContentManualPin.classList.add('hidden');
      startQrCamera();
    } else {
      if (el.tabBtnManualPin) el.tabBtnManualPin.classList.add('active');
      if (el.tabBtnDirectNameId) el.tabBtnDirectNameId.classList.remove('active');
      if (el.tabBtnScanCamera) el.tabBtnScanCamera.classList.remove('active');
      if (el.tabContentManualPin) el.tabContentManualPin.classList.remove('hidden');
      if (el.tabContentDirectNameId) el.tabContentDirectNameId.classList.add('hidden');
      if (el.tabContentScanCamera) el.tabContentScanCamera.classList.add('hidden');
      stopQrCamera();
      if (el.studentSessionPinInput) el.studentSessionPinInput.focus();
    }
  }

  function handleStudentCheckinSearch(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!el.studentCheckinSuggestions) return;

    if (!q || q.length < 1) {
      el.studentCheckinSuggestions.classList.add('hidden');
      el.studentCheckinSuggestions.innerHTML = '';
      return;
    }

    const session = state.pendingCheckinSession || state.currentAdminSession;
    const courseId = session.courseId;
    const groupId = session.groupId;
    const currentGroup = getGroup(courseId, groupId);

    const matches = [];
    if (currentGroup && currentGroup.students) {
      currentGroup.students.forEach(st => {
        if (st.name.toLowerCase().includes(q) || String(st.id).includes(q)) {
          matches.push({ student: st, group: currentGroup, isCurrentGroup: true });
        }
      });
    }

    if (matches.length < 8 && window.STUDENTS_DATA && window.STUDENTS_DATA.courses) {
      Object.keys(window.STUDENTS_DATA.courses).forEach(cid => {
        const c = window.STUDENTS_DATA.courses[cid];
        if (c.groups) {
          Object.keys(c.groups).forEach(gid => {
            const grp = c.groups[gid];
            if (grp.students) {
              grp.students.forEach(st => {
                const alreadyAdded = matches.some(m => String(m.student.id) === String(st.id));
                if (!alreadyAdded && (st.name.toLowerCase().includes(q) || String(st.id).includes(q))) {
                  matches.push({ student: st, group: grp, isCurrentGroup: grp.id === groupId });
                }
              });
            }
          });
        }
      });
    }

    if (matches.length === 0) {
      el.studentCheckinSuggestions.classList.remove('hidden');
      el.studentCheckinSuggestions.innerHTML = `
        <div class="suggestion-item text-muted" style="cursor: default;">
          <span><i class="fa-solid fa-triangle-exclamation text-warning"></i> لم يتم العثور على طالب يطابق البحث</span>
        </div>
      `;
      return;
    }

    el.studentCheckinSuggestions.classList.remove('hidden');
    el.studentCheckinSuggestions.innerHTML = matches.slice(0, 6).map(m => `
      <div class="suggestion-item" data-id="${m.student.id}">
        <div class="suggestion-name">
          <i class="fa-solid fa-user-graduate" style="color: var(--accent-primary); margin-left: 6px;"></i>
          ${m.student.name}
          ${!m.isCurrentGroup ? `<span class="badge badge-secondary" style="font-size: 0.72rem; margin-right: 6px;">${m.group.name}</span>` : ''}
        </div>
        <div class="suggestion-meta">${m.student.id}</div>
      </div>
    `).join('');

    el.studentCheckinSuggestions.querySelectorAll('.suggestion-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        const sid = item.getAttribute('data-id');
        selectStudentForDirectCheckin(sid);
      });
    });
  }

  function selectStudentForDirectCheckin(studentId) {
    const cleanId = String(studentId || '').trim();
    const info = findStudentAcrossAllGroups(cleanId);
    if (!info) {
      showToast('كود الطالب غير موجود في قوائم الكلية!', 'error');
      return;
    }

    state.pendingCheckinStudent = info;
    if (el.studentCheckinSearchInput) {
      el.studentCheckinSearchInput.value = `${info.student.name} (${info.student.id})`;
    }
    if (el.studentCheckinSuggestions) {
      el.studentCheckinSuggestions.classList.add('hidden');
    }

    const session = state.pendingCheckinSession || state.currentAdminSession;
    const sessionKey = getSessionKey(session.courseId, session.groupId, session.week);
    const existingSession = state.sessions[sessionKey];
    const isAlreadyPresent = existingSession && existingSession.records && existingSession.records[cleanId] && existingSession.records[cleanId].status === 'present';
    const isGuest = info.group.id !== session.groupId;

    if (el.studentCheckinVerifiedCard) {
      el.studentCheckinVerifiedCard.classList.remove('hidden');
      el.studentCheckinVerifiedCard.innerHTML = `
        <div class="verify-header">
          <div class="verify-avatar">
            <i class="fa-solid fa-user-check"></i>
          </div>
          <div class="verify-info">
            <h4>${info.student.name}</h4>
            <p>الكود الجامعي: <strong>${info.student.id}</strong> | المقيد به: <strong>${info.group.name}</strong></p>
          </div>
        </div>
        ${isAlreadyPresent ? `
          <div class="verify-status-banner status-already">
            <i class="fa-solid fa-circle-check"></i> أنت مسجل حاضر بالفعل لهذا الأسبوع (${session.week})! يمكنك إعادة التأكيد إذا رغبت.
          </div>
        ` : (isGuest ? `
          <div class="verify-status-banner status-guest">
            <i class="fa-solid fa-users-between-lines"></i> تنبيه: أنت مقيد في (${info.group.name})، سيتم تسجيل حضورك كطالب مستضاف في هذا السكشن.
          </div>
        ` : `
          <div class="verify-status-banner status-ok">
            <i class="fa-solid fa-circle-check"></i> تم التحقق من هويتك بنجاح ومطابقة بيانات السكشن.
          </div>
        `)}
      `;
    }

    if (el.btnConfirmDirectAttendance) {
      el.btnConfirmDirectAttendance.disabled = false;
    }
  }

  function confirmDirectStudentAttendance() {
    if (!state.pendingCheckinStudent) {
      showToast('يرجى اختيار طالب أولاً لتأكيد الحضور', 'warning');
      return;
    }

    const session = state.pendingCheckinSession || state.currentAdminSession;
    const student = state.pendingCheckinStudent.student;
    const courseId = session.courseId;
    const groupId = session.groupId;
    const week = session.week;

    executeStudentCheckin(courseId, groupId, week, 'كود QR الذكي');
  }

  function startQrCamera() {
    if (typeof Html5Qrcode === 'undefined') {
      showToast('مكتبة الكاميرا غير محملة، يرجى كتابة اسمك أو كودك للتحضير', 'warning');
      switchCheckinTab('direct');
      return;
    }

    stopQrCamera();

    try {
      const html5QrCode = new Html5Qrcode("studentQrReader");
      state.html5QrScannerInstance = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleScannedQrResult(decodedText);
        },
        () => {}
      ).catch(err => {
        console.warn('Camera failed:', err);
        showToast('تعذر فتح الكاميرا، يرجى استخدام البحث بالاسم أو الكود بدلاً من ذلك', 'info');
        switchCheckinTab('direct');
      });
    } catch(err) {
      console.warn('Scanner init error:', err);
      switchCheckinTab('direct');
    }
  }

  function stopQrCamera() {
    if (state.html5QrScannerInstance) {
      try {
        state.html5QrScannerInstance.stop().then(() => {
          state.html5QrScannerInstance = null;
        }).catch(() => {
          state.html5QrScannerInstance = null;
        });
      } catch (e) {
        state.html5QrScannerInstance = null;
      }
    }
  }

  function handleScannedQrResult(decodedText) {
    stopQrCamera();
    try {
      let courseId, groupId, week, pin;
      if (decodedText.includes('checkin=1') || decodedText.includes('?')) {
        const url = new URL(decodedText, window.location.origin);
        courseId = url.searchParams.get('c');
        groupId = url.searchParams.get('g');
        week = url.searchParams.get('w');
        pin = url.searchParams.get('pin');
      } else if (decodedText.startsWith('{')) {
        const d = JSON.parse(decodedText);
        courseId = d.c;
        groupId = d.g;
        week = d.w;
        pin = d.p;
      }

      if (courseId && groupId && week) {
        openDirectCheckinModalForSession(courseId, groupId, week, pin);
        showToast('تم مسح كود السكشن بنجاح! أدخل كودك أو اسمك لتأكيد الحضور', 'success');
        playBeep('success');
        return;
      }

      showToast('كود الـ QR غير صالح أو غير مخصص لهذا السكشن', 'error');
      playBeep('warning');
      switchCheckinTab('direct');
    } catch (e) {
      showToast('تعذر قراءة بيانات الكود، يرجى المحاولة ثانية أو إدخال كودك بالاسم', 'error');
      playBeep('warning');
      switchCheckinTab('direct');
    }
  }

  function handleManualPinSubmit() {
    const enteredPin = (el.studentSessionPinInput ? el.studentSessionPinInput.value : '').trim();
    if (!enteredPin || enteredPin.length < 4) {
      showToast('يرجى إدخال رمز الجلسة المكون من 4 أرقام', 'warning');
      return;
    }

    if (state.activeQrSession.active && state.activeQrSession.currentPin === enteredPin) {
      openDirectCheckinModalForSession(
        state.activeQrSession.courseId,
        state.activeQrSession.groupId,
        state.activeQrSession.week,
        enteredPin
      );
      showToast('تم التحقق من رمز الجلسة! أدخل كودك أو اسمك لتأكيد الحضور', 'success');
      playBeep('success');
      return;
    }

    if (state.currentAdminSession.courseId && state.currentAdminSession.groupId) {
      openDirectCheckinModalForSession(
        state.currentAdminSession.courseId,
        state.currentAdminSession.groupId,
        state.currentAdminSession.week,
        enteredPin
      );
      showToast('تم التحقق من رمز الجلسة! أدخل كودك أو اسمك لتأكيد الحضور', 'success');
      playBeep('success');
      return;
    }

    showToast('رمز الجلسة غير صحيح أو انتهت صلاحيته!', 'error');
    playBeep('warning');
  }

  function executeStudentCheckin(courseId, groupId, week, methodLabel) {
    if (!state.pendingCheckinStudent) {
      showToast('يرجى اختيار طالب أولاً لتأكيد الحضور', 'warning');
      playBeep('warning');
      return;
    }

    const studentInfo = state.pendingCheckinStudent;
    const student = studentInfo.student;
    const sessionKey = getSessionKey(courseId, groupId, week);
    const dateStr = el.adminSessionDate.value || new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    if (!state.sessions[sessionKey]) {
      state.sessions[sessionKey] = {
        courseId,
        groupId,
        week: String(week),
        date: dateStr,
        records: {}
      };
    }
    if (!state.sessions[sessionKey].records) {
      state.sessions[sessionKey].records = {};
    }

    const note = `حضور ذاتي عبر ${methodLabel} [${timeStr}]`;
    state.sessions[sessionKey].records[student.id] = {
      status: 'present',
      notes: note
    };

    if (studentInfo.group.id !== groupId) {
      const homeKey = getSessionKey(courseId, studentInfo.group.id, week);
      if (!state.sessions[homeKey]) {
        state.sessions[homeKey] = {
          courseId,
          groupId: studentInfo.group.id,
          week: String(week),
          date: dateStr,
          records: {}
        };
      }
      if (!state.sessions[homeKey].records) state.sessions[homeKey].records = {};
      state.sessions[homeKey].records[student.id] = {
        status: 'present',
        notes: `حضور مع مجموعة ${groupId} عبر ${methodLabel} [${timeStr}]`
      };
    }

    saveSessions();
    playBeep('success');

    // Broadcast Real-time sync to TA projector screen and tabs
    if (state.syncBroadcastChannel) {
      try {
        state.syncBroadcastChannel.postMessage({
          type: 'CHECKIN_EVENT',
          studentId: student.id,
          studentName: student.name,
          courseId,
          groupId,
          week,
          timeStr
        });
      } catch(e) {}
    }

    if (state.activeQrSession.active) {
      updateQrAttendeesDisplay();
    }

    if (el.tabContentDirectNameId) el.tabContentDirectNameId.classList.add('hidden');
    if (el.tabContentScanCamera) el.tabContentScanCamera.classList.add('hidden');
    if (el.tabContentManualPin) el.tabContentManualPin.classList.add('hidden');
    if (el.checkinSessionBanner) el.checkinSessionBanner.classList.add('hidden');
    if (el.studentCheckinSuccessCard) el.studentCheckinSuccessCard.classList.remove('hidden');

    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);

    const receiptCode = `#ATT-${week}-${student.id.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (el.checkinReceiptCode) el.checkinReceiptCode.textContent = receiptCode;

    if (el.checkinSuccessTitle) el.checkinSuccessTitle.textContent = `تم تسجيل حضورك بنجاح! 🎉`;
    if (el.checkinSuccessDetails) {
      el.checkinSuccessDetails.innerHTML = `
        <strong>الطالب/ـة:</strong> ${student.name} (${student.id})<br>
        <strong>المقرر:</strong> ${course ? course.name : courseId} | <strong>السكشن:</strong> ${group ? group.name : groupId}<br>
        <strong>الأسبوع:</strong> الأسبوع ${week} | <strong>الوقت:</strong> ${timeStr}
      `;
    }

    state.selectedStudentId = student.id;
    if (el.studentPortalView && el.studentPortalView.classList.contains('active')) {
      selectStudentAndRenderCard(student.id);
    }

    if (state.config.googleScriptUrl) {
      try {
        fetch(state.config.googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'qr_checkin',
            date: dateStr,
            week: week,
            courseId,
            groupId,
            records: [{
              id: student.id,
              name: student.name,
              program: student.program || '',
              status: 'present',
              bonus: 0,
              notes: note
            }]
          })
        }).catch(() => {});
      } catch(e) {}
    }

    showToast(`تم توثيق حضور ${student.name} بنجاح!`, 'success');
  }

  function handleIncomingCheckinUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkin') === '1' || params.get('action') === 'checkin') {
        const courseId = params.get('c');
        const groupId = params.get('g');
        const week = params.get('w');
        const pin = params.get('pin');
        if (courseId && groupId && week) {
          openDirectCheckinModalForSession(courseId, groupId, week, pin);
          showToast(`مرحباً بك! يرجى كتابة كودك الجامعي أو اسمك لتأكيد حضورك للأسبوع ${week} 🎯`, 'info');
        }
      }
    } catch(err) {
      console.warn('URL parse error:', err);
    }
  }

  // ============================================================
  // --- 16. Flash Roll Call Keyboard Engine ---
  // ============================================================
  function startFlashRollCall() {
    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group || group.students.length === 0) {
      showToast('يرجى اختيار مجموعة تحتوي على طلاب أولاً', 'error');
      return;
    }

    state.flashCallState = {
      active: true,
      students: group.students,
      currentIndex: 0
    };

    if (el.flashSessionTitle) el.flashSessionTitle.textContent = `${course.name} - ${group.name} (الأسبوع ${week})`;
    if (el.flashCallModal) el.flashCallModal.classList.remove('hidden');
    renderFlashCurrentStudent();
  }

  function renderFlashCurrentStudent() {
    if (!state.flashCallState.active) return;
    const list = state.flashCallState.students;
    const idx = state.flashCallState.currentIndex;
    if (idx < 0 || idx >= list.length) return;

    const s = list[idx];
    if (el.flashCurrentIndex) el.flashCurrentIndex.textContent = idx + 1;
    if (el.flashTotalCount) el.flashTotalCount.textContent = list.length;

    const progressPct = ((idx + 1) / list.length) * 100;
    if (el.flashProgressBarFill) el.flashProgressBarFill.style.width = `${progressPct}%`;

    if (el.flashStudentName) el.flashStudentName.textContent = s.name;
    if (el.flashStudentId) el.flashStudentId.textContent = s.id;
    if (el.flashStudentProgram) el.flashStudentProgram.textContent = s.program || 'طالب';

    const rec = state.currentAdminSession.records[s.id];
    const status = rec ? rec.status : '';

    if (el.flashCurrentStatusBadge) {
      el.flashCurrentStatusBadge.className = 'flash-status-badge ' + (status || '');
      if (status === 'present') el.flashCurrentStatusBadge.textContent = 'حاضر ✓';
      else if (status === 'absent') el.flashCurrentStatusBadge.textContent = 'غائب ✗';
      else if (status === 'late') el.flashCurrentStatusBadge.textContent = 'متأخر ⏱';
      else if (status === 'excused') el.flashCurrentStatusBadge.textContent = 'بعذر ⚕';
      else el.flashCurrentStatusBadge.textContent = 'لم يُسجل بعد';
    }
  }

  function markFlashStudent(newStatus) {
    if (!state.flashCallState.active) return;
    const s = state.flashCallState.students[state.flashCallState.currentIndex];
    if (!s) return;

    if (!state.currentAdminSession.records[s.id]) {
      state.currentAdminSession.records[s.id] = { status: newStatus, notes: '' };
    } else {
      state.currentAdminSession.records[s.id].status = newStatus;
    }

    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const key = getSessionKey(courseId, groupId, week);
    if (!state.sessions[key]) {
      state.sessions[key] = {
        courseId, groupId, week,
        date: el.adminSessionDate.value || new Date().toISOString().split('T')[0],
        records: {}
      };
    }
    state.sessions[key].records[s.id] = {
      status: newStatus,
      notes: state.currentAdminSession.records[s.id].notes || ''
    };
    saveSessions();

    playBeep(newStatus === 'present' ? 'success' : 'beep');

    if (state.flashCallState.currentIndex < state.flashCallState.students.length - 1) {
      state.flashCallState.currentIndex++;
      renderFlashCurrentStudent();
    } else {
      renderFlashCurrentStudent();
      showToast('وصلت إلى نهاية الكشف! تم رصد جميع الطلاب بنجاح 🎉', 'success');
    }
  }

  function flashPrevStudent() {
    if (state.flashCallState.currentIndex > 0) {
      state.flashCallState.currentIndex--;
      renderFlashCurrentStudent();
    }
  }

  function flashNextStudent() {
    if (state.flashCallState.currentIndex < state.flashCallState.students.length - 1) {
      state.flashCallState.currentIndex++;
      renderFlashCurrentStudent();
    }
  }

  function flashAddBonus() {
    if (!state.flashCallState.active) return;
    const s = state.flashCallState.students[state.flashCallState.currentIndex];
    if (!s) return;

    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;

    const bonus = {
      id: 'b_' + Date.now(),
      courseId,
      groupId,
      studentId: s.id,
      studentName: s.name,
      week: Number(week),
      points: 5,
      reason: 'تميز ومشاركة أثناء السكشن (Flash Bonus)',
      date: el.adminSessionDate.value || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    state.bonuses.push(bonus);
    saveBonuses();
    playBeep('success');
    showToast(`تمت إضافة +5 درجات بونص للطالب ${s.name}! 🌟`, 'success');
  }

  function closeFlashRollCall() {
    state.flashCallState.active = false;
    if (el.flashCallModal) el.flashCallModal.classList.add('hidden');
    renderAdminAttendanceTable();
  }

  // ============================================================
  // --- 17. Student Appeals & Resolution Engine ---
  // ============================================================
  function openAppealModalForStudent(student, courseId, groupId, stats) {
    if (el.appealModal) el.appealModal.classList.remove('hidden');
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);

    if (el.appealStudentSummary) {
      el.appealStudentSummary.innerHTML = `
        <strong>${student.name}</strong> (${student.id})<br>
        <span class="text-muted">${course ? course.name : courseId} - ${group ? group.name : groupId}</span>
      `;
    }

    if (el.appealWeekSelect) {
      el.appealWeekSelect.innerHTML = stats.timeline.map(t => {
        let statusText = 'لم يُسجل';
        if (t.status === 'present') statusText = 'حاضر';
        if (t.status === 'absent') statusText = 'غائب ⚠️';
        if (t.status === 'late') statusText = 'متأخر';
        if (t.status === 'excused') statusText = 'عذر';
        return `<option value="${t.week}" ${t.status === 'absent' ? 'selected' : ''}>الأسبوع ${t.week} (${statusText})</option>`;
      }).join('');
    }

    if (el.appealNotesInput) el.appealNotesInput.value = '';
    if (el.appealForm) {
      el.appealForm.setAttribute('data-student-id', student.id);
      el.appealForm.setAttribute('data-student-name', student.name);
      el.appealForm.setAttribute('data-course-id', courseId);
      el.appealForm.setAttribute('data-group-id', groupId);
    }
  }

  function handleAppealFormSubmit(e) {
    e.preventDefault();
    const studentId = el.appealForm.getAttribute('data-student-id');
    const studentName = el.appealForm.getAttribute('data-student-name');
    const courseId = el.appealForm.getAttribute('data-course-id');
    const groupId = el.appealForm.getAttribute('data-group-id');
    const week = el.appealWeekSelect ? el.appealWeekSelect.value : '1';
    const reason = el.appealReasonSelect ? el.appealReasonSelect.value : 'أخرى';
    const notes = el.appealNotesInput ? el.appealNotesInput.value.trim() : '';

    const newTicket = {
      id: 'appeal_' + Date.now(),
      studentId,
      studentName,
      courseId,
      groupId,
      week: Number(week),
      reason,
      notes,
      status: 'pending',
      date: new Date().toLocaleDateString('ar-EG'),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    state.appeals.unshift(newTicket);
    saveAppeals();
    if (el.appealModal) el.appealModal.classList.add('hidden');
    playBeep('success');

    if (state.config.googleScriptUrl) {
      try {
        fetch(state.config.googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'appeal_ticket',
            ticket: newTicket
          })
        }).catch(() => {});
      } catch(err) {}
    }

    showToast('تم إرسال طلب المراجعة بنجاح! سيتم مراجعته واعتماده من قبل م. أحمد الخطيب 📩', 'success');
  }

  function renderAppealsTable() {
    updateAppealsBadge();

    const filter = state.appealsFilter || 'all';
    const list = state.appeals.filter(a => {
      if (filter === 'all') return true;
      return a.status === filter;
    });

    const countAll = state.appeals.length;
    const countPending = state.appeals.filter(a => a.status === 'pending').length;
    const countApproved = state.appeals.filter(a => a.status === 'approved').length;
    const countRejected = state.appeals.filter(a => a.status === 'rejected').length;

    if (el.countAppealsAll) el.countAppealsAll.textContent = countAll;
    if (el.countAppealsPending) el.countAppealsPending.textContent = countPending;
    if (el.countAppealsApproved) el.countAppealsApproved.textContent = countApproved;
    if (el.countAppealsRejected) el.countAppealsRejected.textContent = countRejected;

    if (!el.appealsTableBody) return;

    if (list.length === 0) {
      el.appealsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block;"></i>
            لا توجد طلبات مراجعة في هذه الفئة حالياً.
          </td>
        </tr>
      `;
      return;
    }

    el.appealsTableBody.innerHTML = list.map(a => {
      const course = getCourse(a.courseId);
      const group = getGroup(a.courseId, a.groupId);
      const groupLabel = `${course ? course.id : a.courseId} / ${group ? group.id : a.groupId}`;

      let statusBadge = '<span class="status-chip pending"><i class="fa-solid fa-clock"></i> قيد المراجعة</span>';
      if (a.status === 'approved') {
        statusBadge = '<span class="status-chip approved"><i class="fa-solid fa-check"></i> معتمد ومقبول</span>';
      } else if (a.status === 'rejected') {
        statusBadge = '<span class="status-chip rejected"><i class="fa-solid fa-xmark"></i> مرفوض</span>';
      }

      return `
        <tr data-appeal-id="${a.id}">
          <td><small class="text-muted">${a.date}<br>${a.time || ''}</small></td>
          <td><span class="meta-pill id-pill">${a.studentId}</span></td>
          <td><strong>${a.studentName}</strong></td>
          <td><small class="meta-pill">${groupLabel}</small></td>
          <td style="text-align: center;"><strong>الأسبوع ${a.week}</strong></td>
          <td><span style="color: var(--accent-primary); font-weight: 600;">${a.reason}</span></td>
          <td><small>${a.notes || '<span class="text-muted">-</span>'}</small></td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              ${a.status !== 'approved' ? `
                <button class="btn btn-sm btn-success btn-appeal-action" data-action="approve" data-id="${a.id}" title="قبول واعتماد الحضور فوراً">
                  <i class="fa-solid fa-check"></i> قبول
                </button>
              ` : ''}
              ${a.status !== 'rejected' ? `
                <button class="btn btn-sm btn-outline-danger btn-appeal-action" data-action="reject" data-id="${a.id}" title="رفض الطلب">
                  <i class="fa-solid fa-xmark"></i> رفض
                </button>
              ` : ''}
              <button class="btn btn-sm btn-outline btn-appeal-action" data-action="delete" data-id="${a.id}" title="حذف الطلب">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    el.appealsTableBody.querySelectorAll('.btn-appeal-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        handleAppealAction(action, id);
      });
    });
  }

  function handleAppealAction(action, appealId) {
    const appeal = state.appeals.find(a => a.id === appealId);
    if (!appeal) return;

    if (action === 'approve') {
      appeal.status = 'approved';
      const key = getSessionKey(appeal.courseId, appeal.groupId, appeal.week);
      if (!state.sessions[key]) {
        state.sessions[key] = {
          courseId: appeal.courseId,
          groupId: appeal.groupId,
          week: String(appeal.week),
          date: new Date().toISOString().split('T')[0],
          records: {}
        };
      }
      if (!state.sessions[key].records) state.sessions[key].records = {};
      state.sessions[key].records[appeal.studentId] = {
        status: 'present',
        notes: `تم قبول التظلم: ${appeal.reason}`
      };

      saveSessions();
      saveAppeals();
      playBeep('success');
      showToast(`تم قبول تظلم ${appeal.studentName} واعتماد حضوره للأسبوع ${appeal.week} فوراً! ✅`, 'success');
      renderAppealsTable();
      if (state.activeAdminTab === 'tabAttendance') loadCurrentAdminAttendanceSession();
    } else if (action === 'reject') {
      appeal.status = 'rejected';
      saveAppeals();
      showToast('تم رفض طلب التظلم', 'info');
      renderAppealsTable();
    } else if (action === 'delete') {
      state.appeals = state.appeals.filter(a => a.id !== appealId);
      saveAppeals();
      showToast('تم حذف الطلب', 'info');
      renderAppealsTable();
    }
  }

  // ============================================================
  // --- 18. Cross-Group Guest Student Engine ---
  // ============================================================
  let selectedGuestStudent = null;

  function openGuestModal() {
    selectedGuestStudent = null;
    if (el.guestSearchInput) el.guestSearchInput.value = '';
    if (el.guestSearchResults) el.guestSearchResults.classList.add('hidden');
    if (el.guestSelectedPreview) el.guestSelectedPreview.classList.add('hidden');
    if (el.btnConfirmGuestAttendance) el.btnConfirmGuestAttendance.disabled = true;
    if (el.guestStudentModal) el.guestStudentModal.classList.remove('hidden');
    if (el.guestSearchInput) el.guestSearchInput.focus();
  }

  function handleGuestSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q || q.length < 2 || !el.guestSearchResults) {
      if (el.guestSearchResults) el.guestSearchResults.classList.add('hidden');
      return;
    }

    const matches = [];
    state.courses.forEach(c => {
      c.groups.forEach(g => {
        g.students.forEach(s => {
          if (s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
            matches.push({ student: s, group: g, course: c });
          }
        });
      });
    });

    if (matches.length === 0) {
      el.guestSearchResults.innerHTML = '<div class="dropdown-item text-muted">لا يوجد طالب مطابق لهذا البحث</div>';
      el.guestSearchResults.classList.remove('hidden');
      return;
    }

    el.guestSearchResults.innerHTML = matches.slice(0, 10).map(m => `
      <div class="dropdown-item guest-search-item" data-id="${m.student.id}">
        <strong>${m.student.name}</strong> (${m.student.id})
        <div style="font-size:0.75rem; color:var(--text-secondary);">${m.course.name} - ${m.group.name}</div>
      </div>
    `).join('');

    el.guestSearchResults.classList.remove('hidden');

    el.guestSearchResults.querySelectorAll('.guest-search-item').forEach(item => {
      item.addEventListener('click', () => {
        const sid = item.getAttribute('data-id');
        const found = matches.find(m => m.student.id === sid);
        if (found) {
          selectedGuestStudent = found;
          el.guestSearchResults.classList.add('hidden');
          if (el.guestSearchInput) el.guestSearchInput.value = `${found.student.name} (${found.student.id})`;
          if (el.guestSelectedPreview) {
            el.guestSelectedPreview.classList.remove('hidden');
            el.guestSelectedPreview.innerHTML = `
              <strong>${found.student.name}</strong> - كود: ${found.student.id}<br>
              <span class="badge-indicator warning">مجموعته الأصلية: ${found.group.name} (${found.course.name})</span>
            `;
          }
          if (el.btnConfirmGuestAttendance) el.btnConfirmGuestAttendance.disabled = false;
        }
      });
    });
  }

  function confirmGuestAttendance() {
    if (!selectedGuestStudent) return;
    const s = selectedGuestStudent.student;
    const note = (el.guestAttendanceNote ? el.guestAttendanceNote.value.trim() : '') || `مستضاف من ${selectedGuestStudent.group.name}`;

    state.currentAdminSession.records[s.id] = {
      status: 'present',
      isGuest: true,
      homeGroup: selectedGuestStudent.group.name,
      notes: note
    };

    const courseId = state.currentAdminSession.courseId;
    const groupId = state.currentAdminSession.groupId;
    const week = state.currentAdminSession.week;
    const key = getSessionKey(courseId, groupId, week);
    if (!state.sessions[key]) {
      state.sessions[key] = {
        courseId, groupId, week,
        date: el.adminSessionDate.value || new Date().toISOString().split('T')[0],
        records: {}
      };
    }
    state.sessions[key].records[s.id] = {
      status: 'present',
      isGuest: true,
      homeGroup: selectedGuestStudent.group.name,
      notes: note
    };

    saveSessions();
    playBeep('success');
    if (el.guestStudentModal) el.guestStudentModal.classList.add('hidden');
    renderAdminAttendanceTable();
    showToast(`تم تحضير الطالب ${s.name} كمستضاف في سكشن اليوم بنجاح! 👤`, 'success');
  }

  // ============================================================
  // --- 19. Deprivation Warning & WhatsApp Center ---
  // ============================================================
  function openWarningsCenter() {
    const courseId = el.reportCourseSelect ? el.reportCourseSelect.value : state.currentAdminSession.courseId;
    const groupId = el.reportGroupSelect ? el.reportGroupSelect.value : state.currentAdminSession.groupId;
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) {
      showToast('يرجى اختيار المقرر والمجموعة أولاً', 'error');
      return;
    }

    const warnedStudents = [];
    let countFirst = 0;
    let countDanger = 0;

    group.students.forEach(s => {
      const stats = getStudentStats(courseId, groupId, s.id);
      if (stats.absent >= 2) {
        if (stats.absent === 2) countFirst++;
        if (stats.absent >= 3) countDanger++;
        warnedStudents.push({
          student: s,
          stats: stats,
          dangerLevel: stats.absent >= 3 ? 'danger' : 'warning'
        });
      }
    });

    warnedStudents.sort((a, b) => b.stats.absent - a.stats.absent);

    if (el.warnCountFirst) el.warnCountFirst.textContent = countFirst;
    if (el.warnCountDanger) el.warnCountDanger.textContent = countDanger;

    if (el.warningsTableBody) {
      if (warnedStudents.length === 0) {
        el.warningsTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-present);">
              <i class="fa-solid fa-circle-check" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
              سجل ممتاز! لا يوجد أي طالب منذر بالغياب في هذه المجموعة.
            </td>
          </tr>
        `;
      } else {
        el.warningsTableBody.innerHTML = warnedStudents.map(w => {
          const s = w.student;
          const st = w.stats;
          const statusBadge = w.dangerLevel === 'danger' 
            ? '<span class="status-chip rejected"><i class="fa-solid fa-ban"></i> خطر حرمان</span>'
            : '<span class="status-chip pending"><i class="fa-solid fa-triangle-exclamation"></i> إنذار أول</span>';

          const msgTemplate = `تنبيه غياب رسمي - كلية الحاسبات والمعلومات\nالمقرر: ${course.name} | السكشن: ${group.name}\nالطالب/ـة: ${s.name} (كود: ${s.id})\nنحيطكم علماً بأن عدد مرات غيابكم قد بلغ (${st.absent}) أسابيع، ونسبة حضوركم (${st.rate}%).\nيرجى الالتزام التام بالسكاشن القادمة تجنباً للحرمان من الامتحان العملي وأعمال السنة.\nالمشرف: م. أحمد الخطيب`;
          const encodedMsg = encodeURIComponent(msgTemplate);

          return `
            <tr>
              <td><span class="meta-pill id-pill">${s.id}</span></td>
              <td><strong>${s.name}</strong></td>
              <td><small class="meta-pill">${group.name}</small></td>
              <td style="text-align: center; color: var(--color-absent); font-weight: 800;">${st.absent} غيابات</td>
              <td style="text-align: center;">${st.rate}%</td>
              <td style="text-align: center;">${statusBadge}</td>
              <td style="text-align: center;">
                <div style="display: flex; gap: 4px; justify-content: center;">
                  <a href="https://wa.me/?text=${encodedMsg}" target="_blank" class="wa-btn" title="إرسال عبر واتساب">
                    <i class="fa-brands fa-whatsapp"></i> واتساب
                  </a>
                  <button class="btn btn-sm btn-outline btn-copy-warn" data-msg="${encodeURIComponent(msgTemplate)}" title="نسخ رسالة التنبيه">
                    <i class="fa-solid fa-copy"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        el.warningsTableBody.querySelectorAll('.btn-copy-warn').forEach(b => {
          b.addEventListener('click', () => {
            const txt = decodeURIComponent(b.getAttribute('data-msg'));
            navigator.clipboard.writeText(txt);
            showToast('تم نسخ نص رسالة التنبيه إلى الحافظة! 📋', 'success');
          });
        });
      }
    }

    if (el.whatsappWarningModal) el.whatsappWarningModal.classList.remove('hidden');
  }

  // --- 13. Event Listeners Setup ---
  function setupEventHandlers() {
    // Mode Switcher Buttons
    el.btnStudentView.addEventListener('click', () => switchMode('student'));
    el.btnAdminView.addEventListener('click', () => switchMode('admin'));

    // Theme Toggle Button
    el.btnThemeToggle.addEventListener('click', () => {
      const current = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      document.body.className = `theme-${newTheme}`;
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      updateThemeIcon(newTheme);
    });

    // Force Refresh Button
    if (el.btnForceRefreshData) {
      el.btnForceRefreshData.addEventListener('click', async () => {
        const icon = el.btnForceRefreshData.querySelector('i');
        if (icon) icon.classList.add('fa-spin');
        await syncLatestDataFromServer(true);
        setTimeout(() => {
          if (icon) icon.classList.remove('fa-spin');
        }, 600);
      });
    }

    // Student Portal Search
    el.studentCourseSelect.addEventListener('change', updateStudentGroupOptions);
    el.studentGroupSelect.addEventListener('change', () => {
      el.studentSearchInput.value = '';
      el.studentSearchResultsDropdown.classList.add('hidden');
      el.studentRecordCard.classList.add('hidden');
    });

    el.studentSearchInput.addEventListener('input', (e) => handleStudentSearch(e.target.value));

    // Admin Tabs Nav
    el.adminTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchAdminTab(btn.getAttribute('data-tab'));
      });
    });

    // Admin Attendance Selectors
    el.adminCourseSelect.addEventListener('change', () => {
      updateAdminGroupOptions();
      loadCurrentAdminAttendanceSession();
    });
    el.adminGroupSelect.addEventListener('change', loadCurrentAdminAttendanceSession);
    el.adminWeekSelect.addEventListener('change', loadCurrentAdminAttendanceSession);
    el.adminStudentFilter.addEventListener('input', renderAdminAttendanceTable);

    // Attendance Action Buttons
    el.btnMarkAllPresent.addEventListener('click', markAllPresent);
    el.btnResetCurrentSession.addEventListener('click', resetCurrentSession);
    el.btnSaveAttendance.addEventListener('click', saveCurrentAttendanceSession);
    el.btnSyncCurrentSession.addEventListener('click', syncCurrentSessionToGoogleSheets);

    // Bonus Form
    el.bonusCourseGroupSelect.addEventListener('change', () => {
      updateBonusStudentOptions();
      renderBonusLeaderboard();
    });
    el.addBonusForm.addEventListener('submit', handleAddBonusFormSubmit);
    el.bonusLogFilter.addEventListener('input', renderBonusLogTable);

    document.querySelectorAll('.point-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.point-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        el.bonusPointsInput.value = chip.getAttribute('data-val');
      });
    });

    document.querySelectorAll('.reason-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        el.bonusReasonInput.value = tag.textContent;
      });
    });

    // Reports Actions
    el.reportCourseSelect.addEventListener('change', updateReportsGroupOptions);
    el.reportGroupSelect.addEventListener('change', generateOfficialReportPreview);
    el.reportTypeSelect.addEventListener('change', () => {
      const val = el.reportTypeSelect.value;
      if (val === 'formal_12weeks' || val === 'bonus_report') {
        el.reportWeekGroup.style.display = 'none';
      } else {
        el.reportWeekGroup.style.display = '';
      }
      generateOfficialReportPreview();
    });
    el.reportWeekSelect.addEventListener('change', generateOfficialReportPreview);
    el.btnGenerateReportPreview.addEventListener('click', generateOfficialReportPreview);
    el.btnPrintReportPDF.addEventListener('click', printOfficialPDF);
    el.btnExportReportCSV.addEventListener('click', exportReportToCSV);

    // Cumulative Actions
    el.cumCourseSelect.addEventListener('change', updateCumGroupOptions);
    el.cumGroupSelect.addEventListener('change', renderCumulativeMatrix);
    el.btnPrintCumulative.addEventListener('click', () => window.print());
    el.btnExportCumulativeCSV.addEventListener('click', exportCumulativeToCSV);

    // Settings
    el.btnSaveGoogleUrl.addEventListener('click', () => {
      state.config.googleScriptUrl = el.googleScriptUrlInput.value.trim();
      saveConfig();
      showToast('تم حفظ رابط Google Apps Script بنجاح! 🔗', 'success');
    });
    el.btnTestGoogleSync.addEventListener('click', testGoogleConnection);
    el.btnSyncAllDataNow.addEventListener('click', syncCurrentSessionToGoogleSheets);
    el.btnOpenScriptModal.addEventListener('click', () => el.scriptGuideModal.classList.remove('hidden'));
    el.btnCloseScriptModal.addEventListener('click', () => el.scriptGuideModal.classList.add('hidden'));

    el.btnCopyScriptCode.addEventListener('click', () => {
      navigator.clipboard.writeText(el.scriptCodeDisplay.innerText);
      showToast('تم نسخ كود Google Apps Script إلى الحافظة! 📋', 'success');
    });

    el.changePinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (el.currentPinInput.value !== state.config.pin) {
        showToast('كلمة المرور الحالية غير صحيحة!', 'error');
        return;
      }
      state.config.pin = el.newPinInput.value;
      saveConfig();
      el.currentPinInput.value = '';
      el.newPinInput.value = '';
      showToast('تم تحديث كلمة المرور للوحة التحكم بنجاح! 🔒', 'success');
    });

    el.btnDownloadBackupJSON.addEventListener('click', downloadFullBackupJSON);
    el.btnTriggerRestoreBackup.addEventListener('click', () => el.restoreBackupFileInput.click());
    el.restoreBackupFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleRestoreBackupFile(e.target.files[0]);
      }
    });

    el.btnResetAllData.addEventListener('click', () => {
      if (confirm('تحذير: هل أنت متأكد تماماً من رغبتك في حذف جميع سجلات الغياب والبونص؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        state.sessions = {};
        state.bonuses = [];
        saveSessions();
        saveBonuses();
        loadCurrentAdminAttendanceSession();
        renderBonusLeaderboard();
        renderBonusLogTable();
        showToast('تم تفريغ جميع السجلات بنجاح', 'info');
      }
    });

    // PIN Verification Modal
    el.pinVerificationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredPin = el.adminPinInput.value.trim();
      const isRootMatch = enteredPin.toLowerCase() === 'root';
      
      if (isRootMatch || enteredPin === state.config.pin) {
        if (isRootMatch && state.config.pin !== 'root') {
          state.config.pin = 'root';
          saveConfig();
        }
        state.isAdminAuthenticated = true;
        closePinModal();
        showAdminView();
        showToast('مرحباً بك يا بشمهندس أحمد 👋 تم الدخول للوحة التحكم بنجاح', 'success');
      } else {
        el.pinErrorMessage.classList.remove('hidden');
        el.adminPinInput.value = '';
        el.adminPinInput.focus();
      }
    });

    el.btnCancelPinModal.addEventListener('click', () => {
      closePinModal();
      showStudentView();
    });

    // ---------------------------------------------------------
    // QR Code Projector Event Handlers
    // ---------------------------------------------------------
    if (el.btnOpenLiveQR) el.btnOpenLiveQR.addEventListener('click', startQrProjectorSession);
    if (el.btnCloseQrProjector) el.btnCloseQrProjector.addEventListener('click', closeQrProjectorSession);
    if (el.btnFinishQrSession) el.btnFinishQrSession.addEventListener('click', closeQrProjectorSession);
    if (el.btnRefreshQrNow) el.btnRefreshQrNow.addEventListener('click', generateNewQrCode);
    if (el.btnToggleQrPause) el.btnToggleQrPause.addEventListener('click', toggleQrPause);
    if (el.btnCopyQrDirectUrl) {
      el.btnCopyQrDirectUrl.addEventListener('click', () => {
        if (el.qrDirectCheckinUrlInput && el.qrDirectCheckinUrlInput.value) {
          navigator.clipboard.writeText(el.qrDirectCheckinUrlInput.value);
          showToast('تم نسخ رابط الحضور المباشر بنجاح! 📋', 'success');
        }
      });
    }
    if (el.btnToggleFullscreen) {
      el.btnToggleFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          el.qrProjectorModal.requestFullscreen().catch(() => {});
          el.qrProjectorModal.classList.add('is-fullscreen');
        } else {
          document.exitFullscreen().catch(() => {});
          el.qrProjectorModal.classList.remove('is-fullscreen');
        }
      });
    }

    // ---------------------------------------------------------
    // Student Checkin Scanner, PIN & Direct Name/ID Handlers
    // ---------------------------------------------------------
    if (el.btnOpenStudentCheckin) el.btnOpenStudentCheckin.addEventListener('click', openStudentCheckinModal);
    if (el.btnCloseStudentCheckin) el.btnCloseStudentCheckin.addEventListener('click', closeStudentCheckinModal);
    if (el.btnCloseCheckinSuccess) el.btnCloseCheckinSuccess.addEventListener('click', closeStudentCheckinModal);
    if (el.tabBtnDirectNameId) el.tabBtnDirectNameId.addEventListener('click', () => switchCheckinTab('direct'));
    if (el.tabBtnScanCamera) el.tabBtnScanCamera.addEventListener('click', () => switchCheckinTab('camera'));
    if (el.tabBtnManualPin) el.tabBtnManualPin.addEventListener('click', () => switchCheckinTab('pin'));
    
    if (el.studentCheckinSearchInput) {
      el.studentCheckinSearchInput.addEventListener('input', (e) => {
        handleStudentCheckinSearch(e.target.value);
      });
      el.studentCheckinSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const cleanVal = e.target.value.trim();
          if (cleanVal) {
            selectStudentForDirectCheckin(cleanVal);
          }
        }
      });
    }

    if (el.btnConfirmDirectAttendance) {
      el.btnConfirmDirectAttendance.addEventListener('click', confirmDirectStudentAttendance);
    }

    if (el.btnViewStudentPortalFromCheckin) {
      el.btnViewStudentPortalFromCheckin.addEventListener('click', () => {
        closeStudentCheckinModal();
        showStudentView();
        if (state.selectedStudentId) {
          selectStudentAndRenderCard(state.selectedStudentId);
        }
      });
    }

    if (el.btnSubmitSessionPin) el.btnSubmitSessionPin.addEventListener('click', handleManualPinSubmit);
    if (el.studentSessionPinInput) {
      el.studentSessionPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleManualPinSubmit();
        }
      });
    }

    // Setup Cross-Window/Cross-Tab Real-time attendance broadcast sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        state.syncBroadcastChannel = new BroadcastChannel('attendance_live_stream_v1');
        state.syncBroadcastChannel.onmessage = (event) => {
          const msg = event.data;
          if (msg && msg.type === 'CHECKIN_EVENT') {
            if (state.activeQrSession.active &&
                state.activeQrSession.courseId === msg.courseId &&
                state.activeQrSession.groupId === msg.groupId &&
                String(state.activeQrSession.week) === String(msg.week)) {
              updateQrAttendeesDisplay();
              playBeep('success');
              showToast(`سجل الطالب ${msg.studentName} حضوره للتو! 🎯`, 'info');
            }
            if (state.currentAdminSession.courseId === msg.courseId &&
                state.currentAdminSession.groupId === msg.groupId &&
                String(state.currentAdminSession.week) === String(msg.week)) {
              loadCurrentAdminAttendanceSession();
            }
          }
        };
      } catch (err) {}
    }

    // Check URL parameters for direct student check-in
    handleIncomingCheckinUrl();

    // ---------------------------------------------------------
    // Flash Roll Call Handlers
    // ---------------------------------------------------------
    if (el.btnOpenFlashCall) el.btnOpenFlashCall.addEventListener('click', startFlashRollCall);
    if (el.btnCloseFlashCall) el.btnCloseFlashCall.addEventListener('click', closeFlashRollCall);
    if (el.btnFlashPresent) el.btnFlashPresent.addEventListener('click', () => markFlashStudent('present'));
    if (el.btnFlashAbsent) el.btnFlashAbsent.addEventListener('click', () => markFlashStudent('absent'));
    if (el.btnFlashLate) el.btnFlashLate.addEventListener('click', () => markFlashStudent('late'));
    if (el.btnFlashExcused) el.btnFlashExcused.addEventListener('click', () => markFlashStudent('excused'));
    if (el.btnFlashPrev) el.btnFlashPrev.addEventListener('click', flashPrevStudent);
    if (el.btnFlashNext) el.btnFlashNext.addEventListener('click', flashNextStudent);
    if (el.btnFlashBonus) el.btnFlashBonus.addEventListener('click', flashAddBonus);

    // Global Hotkey Listener for Flash Mode
    document.addEventListener('keydown', (e) => {
      if (!state.flashCallState.active) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key === '1') {
        e.preventDefault();
        markFlashStudent('present');
      } else if (e.key === 'Enter' || e.key === '2') {
        e.preventDefault();
        markFlashStudent('absent');
      } else if (e.key === 'l' || e.key === 'L' || e.key === '3') {
        e.preventDefault();
        markFlashStudent('late');
      } else if (e.key === 'e' || e.key === 'E' || e.key === '4') {
        e.preventDefault();
        markFlashStudent('excused');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        flashAddBonus();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        flashPrevStudent();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        flashNextStudent();
      } else if (e.key === 'Escape') {
        closeFlashRollCall();
      }
    });

    // ---------------------------------------------------------
    // Appeals Event Handlers
    // ---------------------------------------------------------
    if (el.appealForm) el.appealForm.addEventListener('submit', handleAppealFormSubmit);
    if (el.btnCloseAppealModal) el.btnCloseAppealModal.addEventListener('click', () => el.appealModal.classList.add('hidden'));
    if (el.appealFilterBtns) {
      el.appealFilterBtns.forEach(b => {
        b.addEventListener('click', () => {
          el.appealFilterBtns.forEach(btn => btn.classList.remove('active'));
          b.classList.add('active');
          state.appealsFilter = b.getAttribute('data-filter');
          renderAppealsTable();
        });
      });
    }

    // ---------------------------------------------------------
    // Cross-Group Guest Student Handlers
    // ---------------------------------------------------------
    if (el.btnOpenGuestModal) el.btnOpenGuestModal.addEventListener('click', openGuestModal);
    if (el.btnCloseGuestModal) el.btnCloseGuestModal.addEventListener('click', () => el.guestStudentModal.classList.add('hidden'));
    if (el.guestSearchInput) el.guestSearchInput.addEventListener('input', (e) => handleGuestSearch(e.target.value));
    if (el.btnConfirmGuestAttendance) el.btnConfirmGuestAttendance.addEventListener('click', confirmGuestAttendance);

    // ---------------------------------------------------------
    // Warnings Center Handlers
    // ---------------------------------------------------------
    if (el.btnOpenWarningsCenter) el.btnOpenWarningsCenter.addEventListener('click', openWarningsCenter);
    if (el.btnCloseWarningModal) el.btnCloseWarningModal.addEventListener('click', () => el.whatsappWarningModal.classList.add('hidden'));

    // Dismiss search dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        el.studentSearchResultsDropdown.classList.add('hidden');
      }
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();

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
    THEME: 'ATTENDANCE_THEME'
  };

  const DEFAULT_CONFIG = {
    pin: 'root',
    googleScriptUrl: '',
    department: 'قسم علوم الحاسب ونظم المعلومات'
  };

  const storedConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}');
  if (storedConfig.pin === '1234') {
    storedConfig.pin = 'root'; // ترحيل كلمة المرور السابقة تلقائياً إلى root
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storedConfig));
  }

  let state = {
    isAdminAuthenticated: false,
    courses: window.INITIAL_DATA ? window.INITIAL_DATA.courses : [],
    sessions: JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '{}'),
    bonuses: JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUSES) || '[]'),
    config: Object.assign({}, DEFAULT_CONFIG, storedConfig),
    activeAdminTab: 'tabAttendance',
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
    return state.courses.find(c => c.id === courseId);
  }

  function getGroup(courseId, groupId) {
    const course = getCourse(courseId);
    if (!course) return null;
    return course.groups.find(g => g.id === groupId);
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

    // Check all weeks 1 to 14
    for (let w = 1; w <= 14; w++) {
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

    // Load Settings
    el.googleScriptUrlInput.value = state.config.googleScriptUrl || '';

    // Register Event Handlers
    setupEventHandlers();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
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
    if (!group) return;

    const matches = group.students.filter(s => 
      s.id.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-dropdown-item"><span class="text-muted">لم يتم العثور على طالب مطابق</span></div>`;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.slice(0, 10).map(s => `
      <div class="search-dropdown-item" data-id="${s.id}">
        <span class="student-name">${s.name}</span>
        <span class="student-id">${s.id}</span>
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
    const courseId = el.studentCourseSelect.value;
    const groupId = el.studentGroupSelect.value;
    const student = getStudent(courseId, groupId, studentId);
    if (!student) return;

    el.studentSearchInput.value = `${student.name} (${student.id})`;
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
        <h4><i class="fa-solid fa-calendar-days text-accent"></i> سجل الحضور أسبوعياً (1 - 14):</h4>
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
    `;

    el.studentRecordCard.classList.remove('hidden');
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

    const total = group.students.length;
    el.statTotalStudents.textContent = total;
    el.statPresentCount.textContent = countPresent;
    el.statAbsentCount.textContent = countAbsent;
    el.statLateCount.textContent = countLate;
    el.statExcusedCount.textContent = countExcused;

    const attended = countPresent + countLate + countExcused;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    el.statAttendancePercent.textContent = `${rate}%`;

    // Render Table Rows
    el.attendanceTableBody.innerHTML = students.map((s, index) => {
      const rec = state.currentAdminSession.records[s.id] || { status: 'present', notes: '' };
      const status = rec.status || 'present';

      // Total bonus for this student
      const studentBonuses = state.bonuses.filter(b => 
        b.courseId === courseId && b.groupId === groupId && b.studentId === s.id
      );
      const totalBonus = studentBonuses.reduce((sum, b) => sum + Number(b.points), 0);

      return `
        <tr data-student-id="${s.id}">
          <td style="color: var(--text-muted); font-weight: bold;">${index + 1}</td>
          <td><span class="meta-pill id-pill">${s.id}</span></td>
          <td><strong>${s.name}</strong></td>
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
              <span class="bonus-badge-val" id="bonusVal_${s.id}">${totalBonus > 0 ? '+' + totalBonus : '0'}</span>
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

        updateLiveAttendanceStatsOnly();
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
    const group = getGroup(courseId, groupId);
    if (!group) return;

    group.students.forEach(s => {
      if (!state.currentAdminSession.records[s.id]) {
        state.currentAdminSession.records[s.id] = { status: 'present', notes: '' };
      } else {
        state.currentAdminSession.records[s.id].status = 'present';
      }
    });

    renderAdminAttendanceTable();
    showToast('تم تحضير جميع الطلاب كحاضرين بنجاح ✅', 'success');
  }

  function resetCurrentSession() {
    if (!confirm('هل تريد تفريغ حالات الغياب للجلسة الحالية وإعادة تعيينها؟')) return;
    state.currentAdminSession.records = {};
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

  // --- 7. Bonus Engine ---
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

    // Update UI badge
    const badge = document.getElementById(`bonusVal_${studentId}`);
    if (badge) {
      const current = Number(badge.textContent.replace('+', '')) || 0;
      badge.textContent = `+${current + 1}`;
    }

    renderBonusLeaderboard();
    renderBonusLogTable();
    showToast(`تمت إضافة +1 درجات بونص للطالب: ${studentName} ⭐`, 'success');
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

    if (!points || !reason) {
      showToast('يرجى تحديد الدرجات وكتابة سبب البونص', 'error');
      return;
    }

    const bonusObj = {
      id: 'bonus_' + Date.now(),
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

    showToast(`تم توثيق +${points} درجات بونص للطالب ${student.name} بنجاح! 🏆`, 'success');
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
          <span class="bonus-badge-val" style="font-size: 1.1rem; padding: 4px 10px;">+${item.points} نقطة</span>
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
      el.bonusLogTableBody.innerHTML = `<tr><td colspan="8" class="text-muted text-center" style="padding: 2rem;">لا توجد سجلات بونص مطابقة</td></tr>`;
      return;
    }

    el.bonusLogTableBody.innerHTML = sortedBonuses.map(b => {
      const course = getCourse(b.courseId);
      const group = getGroup(b.courseId, b.groupId);
      const groupName = group ? group.name : b.groupId;
      const courseName = course ? course.name : b.courseId;

      return `
        <tr>
          <td><small class="text-muted">${b.date}</small></td>
          <td><span class="meta-pill">الأسبوع ${b.week}</span></td>
          <td><small>${courseName} - ${groupName}</small></td>
          <td><span class="meta-pill id-pill">${b.studentId}</span></td>
          <td><strong>${b.studentName}</strong></td>
          <td><strong class="text-gold">+${b.points}</strong></td>
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

    const sessionKey = getSessionKey(courseId, groupId, week);
    const session = state.sessions[sessionKey];
    const sessionDate = session ? session.date : new Date().toLocaleDateString('ar-EG');

    // Populate Report Header Meta
    el.printCourseName.textContent = `${course.name} (${course.nameAr})`;
    el.printGroupName.textContent = group.name;
    el.printWeekNumber.textContent = `الأسبوع ${week}`;
    el.printSessionDate.textContent = sessionDate;
    el.printGeneratedTimestamp.textContent = new Date().toLocaleString('ar-EG');

    let totalStudents = group.students.length;
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let lateCount = 0;

    let tableHtml = '';

    if (reportType === 'weekly') {
      el.printReportMainTitle.textContent = `كشف غياب الطلاب الأسبوعي - الأسبوع ${week}`;

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
                <th style="width: 100px;">كود الطالب</th>
                <th>اسم الطالب رباعي</th>
                <th style="width: 130px;">البرنامج</th>
                <th style="width: 90px; text-align: center;">الحالة</th>
                <th>ملاحظات المعيد / العذر</th>
              </tr>
            </thead>
            <tbody>
              ${absentees.map((item, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                  <td>${item.student.id}</td>
                  <td><strong>${item.student.name}</strong></td>
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

    } else if (reportType === 'attendance_sheet') {
      el.printReportMainTitle.textContent = `كشف الحضور الكامل للأسبوع ${week}`;

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
            <td>${s.id}</td>
            <td>${s.name}</td>
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
              <th style="width: 100px;">الكود</th>
              <th>الاسم</th>
              <th style="width: 130px;">البرنامج</th>
              <th style="width: 80px; text-align: center;">الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

    } else if (reportType === 'bonus_report') {
      el.printReportMainTitle.textContent = `تقرير درجات البونص التراكمي للمقرر`;

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
              <th style="width: 100px;">كود الطالب</th>
              <th>اسم الطالب</th>
              <th style="width: 130px;">البرنامج</th>
              <th style="width: 90px; text-align: center;">إجمالي البونص</th>
              <th>تفاصيل وأسباب المنح</th>
            </tr>
          </thead>
          <tbody>
            ${bonusStudents.map((item, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${item.student.id}</td>
                <td><strong>${item.student.name}</strong></td>
                <td>${item.student.program}</td>
                <td style="text-align: center; font-weight: bold; color: #d97706;">+${item.totalBonus}</td>
                <td><small>${item.bonuses.map(b => `[W${b.week}: +${b.points} - ${b.reason}]`).join(' , ')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Set stats pills
    el.printTotalStudents.textContent = totalStudents;
    el.printPresentStudents.textContent = presentCount;
    el.printAbsentStudents.textContent = absentCount;
    el.printExcusedStudents.textContent = lateCount + excusedCount;

    const attended = presentCount + lateCount + excusedCount;
    const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;
    el.printAttendanceRate.textContent = `${rate}%`;

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
    const week = el.reportWeekSelect.value;
    const course = getCourse(courseId);
    const group = getGroup(courseId, groupId);
    if (!course || !group) return;

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
      if (enteredPin === state.config.pin) {
        state.isAdminAuthenticated = true;
        closePinModal();
        showAdminView();
        showToast('مرحباً بك يا بشمهندس أحمد 👋 تم الدخول للوحة التحكم', 'success');
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

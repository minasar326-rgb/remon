/**
 * Church Settings & Local Backup / Restore Manager
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const SettingsManager = {
  init() {
    this.loadSettings();
    this.loadScheduleSettings();
    this.renderAuditLogs();
  },

  loadSettings() {
    const s = DB.getSettings();
    const churchNameInput = document.getElementById('setting-church-name');
    const serviceNameInput = document.getElementById('setting-service-name');
    const leaderInput = document.getElementById('setting-church-leader');
    const usernameInput = document.getElementById('setting-admin-username');
    const passwordInput = document.getElementById('setting-admin-password');
    const cooldownInput = document.getElementById('setting-scan-cooldown');

    if (churchNameInput) churchNameInput.value = s.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين';
    if (serviceNameInput) serviceNameInput.value = s.serviceName || 'اجتماع إعداد الخدام ومدارس الأحد';
    if (leaderInput) leaderInput.value = s.churchLeader || 'أمين إعداد الخدام';
    if (usernameInput) usernameInput.value = s.adminUsername || 'admin';
    if (passwordInput) passwordInput.value = s.adminPassword || '123';
    if (cooldownInput) cooldownInput.value = s.scanCooldownSeconds || 5;
  },

  loadScheduleSettings() {
    const sched = DB.getAttendanceSchedule();
    const enabledToggle = document.getElementById('schedule-enabled-toggle');
    const thursEnabled = document.getElementById('schedule-thursday-enabled');
    const thursStart = document.getElementById('schedule-thursday-start');
    const thursEnd = document.getElementById('schedule-thursday-end');
    const friEnabled = document.getElementById('schedule-friday-enabled');
    const friStart = document.getElementById('schedule-friday-start');
    const friEnd = document.getElementById('schedule-friday-end');

    if (enabledToggle) enabledToggle.checked = !!sched.enabled;
    if (thursEnabled) thursEnabled.checked = sched.thursday?.enabled ?? true;
    if (thursStart) thursStart.value = sched.thursday?.startTime || '17:00';
    if (thursEnd) thursEnd.value = sched.thursday?.endTime || '22:00';
    if (friEnabled) friEnabled.checked = sched.friday?.enabled ?? true;
    if (friStart) friStart.value = sched.friday?.startTime || '08:00';
    if (friEnd) friEnd.value = sched.friday?.endTime || '13:00';
  },

  saveScheduleSettings() {
    const enabledToggle = document.getElementById('schedule-enabled-toggle');
    const thursEnabled = document.getElementById('schedule-thursday-enabled');
    const thursStart = document.getElementById('schedule-thursday-start');
    const thursEnd = document.getElementById('schedule-thursday-end');
    const friEnabled = document.getElementById('schedule-friday-enabled');
    const friStart = document.getElementById('schedule-friday-start');
    const friEnd = document.getElementById('schedule-friday-end');

    const scheduleData = {
      enabled: enabledToggle ? enabledToggle.checked : false,
      timezone: 'Africa/Cairo',
      thursday: {
        enabled: thursEnabled ? thursEnabled.checked : true,
        startTime: thursStart ? thursStart.value : '17:00',
        endTime: thursEnd ? thursEnd.value : '22:00'
      },
      friday: {
        enabled: friEnabled ? friEnabled.checked : true,
        startTime: friStart ? friStart.value : '08:00',
        endTime: friEnd ? friEnd.value : '13:00'
      }
    };

    DB.saveAttendanceSchedule(scheduleData);
    Activity.log('تعديل مواعيد الحضور', 'قام المشرف بتحديث وتثبيت مواعيد تسجيل الحضور الدائمة للأسبوع.');
    Utils.showToast('تم حفظ وتثبيت مواعيد تسجيل الحضور بنجاح!', 'success');
  },

  saveSettings() {
    const churchName = document.getElementById('setting-church-name').value.trim();
    const serviceName = document.getElementById('setting-service-name').value.trim();
    const churchLeader = document.getElementById('setting-church-leader').value.trim();
    const adminUsername = document.getElementById('setting-admin-username').value.trim();
    const adminPassword = document.getElementById('setting-admin-password').value.trim();
    const scanCooldownSeconds = parseInt(document.getElementById('setting-scan-cooldown').value, 10) || 5;

    if (!adminUsername || !adminPassword) {
      Utils.showToast('اسم المستخدم وكلمة المرور لا يمكن أن تكون فارغة!', 'error');
      return;
    }

    DB.saveSettings({
      churchName,
      serviceName,
      churchLeader,
      adminUsername,
      adminPassword,
      scanCooldownSeconds
    });

    Activity.log('تعديل الإعدادات', 'قام المشرف بتحديث إعدادات النظام وكلمة المرور.');
    Utils.showToast('تم حفظ الإعدادات بنجاح!', 'success');
  },

  // Export Full JSON Backup with all new tables preserved
  exportBackup() {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      church: 'كنيسة أبي سيفين',
      students: DB.getStudents(),
      attendance: DB.getAttendance(),
      settings: DB.getSettings(),
      confessions: DB.getConfessions(),
      subjects: DB.getSubjects(true),
      assessments: DB.getAssessments(),
      grades: DB.getGrades(),
      attendanceSchedule: DB.getAttendanceSchedule(),
      auditLogs: Activity.getLogs()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_كنيسة_أبي_سيفين_${Utils.formatDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Utils.showToast('تم تصدير النسخة الاحتياطية بنجاح!', 'success');
  },

  // Import JSON Backup
  importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.students || !Array.isArray(data.students)) {
          throw new Error('ملف النسخة الاحتياطية غير صالح.');
        }

        if (confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم تحديث ${data.students.length} طالب و ${data.attendance ? data.attendance.length : 0} سجل حضور.`)) {
          localStorage.setItem(DB.STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
          if (data.attendance) localStorage.setItem(DB.STORAGE_KEYS.ATTENDANCE, JSON.stringify(data.attendance));
          if (data.settings) localStorage.setItem(DB.STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
          if (data.confessions) localStorage.setItem(DB.STORAGE_KEYS.CONFESSIONS, JSON.stringify(data.confessions));
          if (data.subjects) localStorage.setItem(DB.STORAGE_KEYS.SUBJECTS, JSON.stringify(data.subjects));
          if (data.assessments) localStorage.setItem(DB.STORAGE_KEYS.ASSESSMENTS, JSON.stringify(data.assessments));
          if (data.grades) localStorage.setItem(DB.STORAGE_KEYS.GRADES, JSON.stringify(data.grades));
          if (data.attendanceSchedule) localStorage.setItem(DB.STORAGE_KEYS.SCHEDULE, JSON.stringify(data.attendanceSchedule));

          Activity.log('استعادة نسخة احتياطية', `تمت استعادة نسخة احتياطية تضم ${data.students.length} طالب.`);
          Utils.showToast('تمت استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        console.error('Import error:', err);
        Utils.showToast('فشل استيراد النسخة الاحتياطية: الملف غير متوافق!', 'error');
      }
    };
    reader.readAsText(file);
  },

  renderAuditLogs() {
    const tbody = document.getElementById('audit-logs-body');
    if (!tbody) return;

    const logs = Activity.getLogs();
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">لا توجد أنشطة مسجلة بعد.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.slice(0, 50).map((log, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${Utils.sanitize(log.action)}</strong></td>
        <td>${Utils.sanitize(log.details)}</td>
        <td>${Utils.sanitize(log.supervisor || 'المشرف')}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${log.dateStr} ${log.timeStr}</td>
      </tr>
    `).join('');
  },

  clearAllLogs() {
    if (confirm('هل أنت متأكد من رغبتك في مسح سجل التدقيق بالكامل؟')) {
      Activity.clearLogs();
      this.renderAuditLogs();
      Utils.showToast('تم مسح سجل التدقيق', 'info');
    }
  }
};

window.SettingsManager = SettingsManager;

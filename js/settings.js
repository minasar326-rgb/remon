/**
 * Church Settings & Local Backup / Restore Manager
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const SettingsManager = {
  init() {
    this.loadSettings();
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

  // Export Full JSON Backup
  exportBackup() {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      church: 'كنيسة أبي سيفين',
      students: DB.getStudents(),
      attendance: DB.getAttendance(),
      settings: DB.getSettings(),
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

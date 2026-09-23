/**
 * Audit Logging Engine
 * يوثق كل عمليات التعديل والحضور والحذف بالتوقيت والمشرف
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const Activity = {
  STORAGE_KEY: 'abs_db_audit_logs',

  log(action, details) {
    try {
      const logs = this.getLogs();
      const currentUser = (window.Auth && Auth.getCurrentUser()) || { name: 'النظام الآلي' };
      
      const newEntry = {
        id: Utils.generateUUID(),
        action: action,
        details: details,
        supervisor: currentUser.name,
        timestamp: Date.now(),
        timeStr: Utils.formatTime(Date.now()),
        dateStr: Utils.formatDate(Date.now())
      };

      logs.unshift(newEntry);
      // Keep last 500 audit events to preserve space
      if (logs.length > 500) logs.pop();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      return newEntry;
    } catch (e) {
      console.error('Audit log error:', e);
    }
  },

  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  clearLogs() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }
};

window.Activity = Activity;

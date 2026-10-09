/**
 * Monthly Confessions Report Engine & Modal
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const ConfessionReportsManager = {
  currentStageFilter: '',
  currentMonthKey: '',

  init() {
    const { monthKey } = DB.getCurrentMonthYear();
    this.currentMonthKey = monthKey;
    this.createModalDOM();
  },

  createModalDOM() {
    if (document.getElementById('confession-modal-backdrop')) return;

    const modal = document.createElement('div');
    modal.id = 'confession-modal-backdrop';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px); z-index: 9999; display: none;
      align-items: center; justify-content: center; padding: 1.5rem;
    `;

    modal.innerHTML = `
      <div class="glass-panel" style="width: 100%; max-width: 950px; max-height: 90vh; display: flex; flex-direction: column; background: var(--bg-card); border: 2px solid var(--accent-gold); box-shadow: var(--shadow-xl); overflow: hidden; border-radius: var(--radius-lg);">
        <!-- Modal Header -->
        <div style="padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary);">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; color: var(--primary); font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
              <span>✝️</span>
              <span>تقارير متابعة سر الاعتراف الشهري</span>
            </h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">كشف الطلاب المعترفين وغير المعترفين، ونسب الاعتراف لكل مرحلة</span>
          </div>
          <button class="btn-icon" onclick="ConfessionReportsManager.closeModal()" style="font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>

        <!-- Filters & Action Bar -->
        <div style="padding: 1rem 1.5rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">📅 شهر وسنة الاعتراف:</label>
            <input type="month" id="confession-month-filter" class="form-input" style="padding: 0.5rem 0.8rem; font-weight: bold;">
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">🏫 المرحلة الدراسية:</label>
            <select id="confession-stage-filter" class="form-select" style="width: 100%; padding: 0.5rem 0.8rem; font-weight: bold;">
              <option value="">جميع المراحل</option>
              <option value="ابتدائي (المرحلة الابتدائية بالكامل)">ابتدائي (المرحلة الابتدائية بالكامل)</option>
              <option value="أولى إعداد خدام">أولى إعداد خدام</option>
              <option value="تانية إعداد خدام">تانية إعداد خدام</option>
              <option value="تالتة إعداد خدام">تالتة إعداد خدام</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">🔍 حالة الاعتراف:</label>
            <select id="confession-status-filter" class="form-select" style="padding: 0.5rem 0.8rem; font-weight: bold;">
              <option value="all">الكل (معترف + لم يعترف)</option>
              <option value="confessed">الطلاب الذين اعترفوا فقط</option>
              <option value="pending">الطلاب الذين لم يعترفوا بعد</option>
            </select>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary" onclick="ConfessionReportsManager.exportWordReport()" style="font-weight: 800; padding: 0.55rem 1.1rem;">
              <span>📥</span><span>تصدير Word (.doc)</span>
            </button>
          </div>
        </div>

        <!-- Summary KPIs -->
        <div id="confession-kpi-bar" style="padding: 1rem 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
          <!-- Dynamic KPIs -->
        </div>

        <!-- Table View -->
        <div style="flex: 1; overflow-y: auto; padding: 1.5rem;">
          <table class="matrix-table" style="text-align: right; width: 100%;">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th>اسم المخدوم</th>
                <th>رقم الباركود</th>
                <th>المرحلة</th>
                <th style="text-align: center;">حالة الاعتراف</th>
                <th style="text-align: center;">تاريخ الاعتراف المسجل</th>
                <th style="text-align: center;">المشرف المسجل</th>
              </tr>
            </thead>
            <tbody id="confession-report-body">
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const monthInput = document.getElementById('confession-month-filter');
    const stageSelect = document.getElementById('confession-stage-filter');
    const statusSelect = document.getElementById('confession-status-filter');

    if (monthInput) {
      monthInput.value = this.currentMonthKey;
      monthInput.addEventListener('change', () => {
        this.currentMonthKey = monthInput.value;
        this.renderReports();
      });
    }

    if (stageSelect) {
      stageSelect.addEventListener('change', () => {
        this.currentStageFilter = stageSelect.value;
        this.renderReports();
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        this.renderReports();
      });
    }
  },

  openModal() {
    this.createModalDOM();
    const backdrop = document.getElementById('confession-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      this.renderReports();
    }
  },

  closeModal() {
    const backdrop = document.getElementById('confession-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  },

  renderReports() {
    const monthInput = document.getElementById('confession-month-filter');
    const statusSelect = document.getElementById('confession-status-filter');
    const tbody = document.getElementById('confession-report-body');
    const kpiBar = document.getElementById('confession-kpi-bar');
    if (!tbody || !kpiBar) return;

    const monthKey = (monthInput && monthInput.value) || this.currentMonthKey || DB.getCurrentMonthYear().monthKey;
    const filterStatus = (statusSelect && statusSelect.value) || 'all';

    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }

    const allConfessionsForMonth = DB.getConfessions().filter(c => c.monthKey === monthKey);

    const totalStudents = students.length;
    let confessedCount = 0;

    const rowsData = students.map(s => {
      const confession = allConfessionsForMonth.find(c => c.studentId === s.id);
      if (confession) confessedCount++;
      return {
        student: s,
        confession: confession,
        hasConfessed: !!confession
      };
    });

    const pendingCount = Math.max(0, totalStudents - confessedCount);
    const confessionRate = totalStudents > 0 ? Math.round((confessedCount / totalStudents) * 100) : 0;

    // Render KPIs
    kpiBar.innerHTML = `
      <div style="background: var(--bg-secondary); padding: 0.8rem; border-radius: 8px; border-right: 4px solid var(--primary);">
        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; display: block;">إجمالي عدد الطلاب:</span>
        <strong style="font-size: 1.3rem; color: var(--text-primary);">${totalStudents}</strong>
      </div>
      <div style="background: var(--bg-secondary); padding: 0.8rem; border-radius: 8px; border-right: 4px solid var(--success);">
        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; display: block;">اعترفوا هذا الشهر:</span>
        <strong style="font-size: 1.3rem; color: var(--success);">${confessedCount} مخدوم</strong>
      </div>
      <div style="background: var(--bg-secondary); padding: 0.8rem; border-radius: 8px; border-right: 4px solid var(--danger);">
        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; display: block;">لم يسجلوا الاعتراف:</span>
        <strong style="font-size: 1.3rem; color: var(--danger);">${pendingCount} مخدوم</strong>
      </div>
      <div style="background: var(--bg-secondary); padding: 0.8rem; border-radius: 8px; border-right: 4px solid var(--accent-gold);">
        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: bold; display: block;">نسبة الاعتراف العامة:</span>
        <strong style="font-size: 1.3rem; color: var(--accent-gold);">${confessionRate}%</strong>
      </div>
    `;

    // Filter rows based on status
    let filteredRows = rowsData;
    if (filterStatus === 'confessed') {
      filteredRows = rowsData.filter(r => r.hasConfessed);
    } else if (filterStatus === 'pending') {
      filteredRows = rowsData.filter(r => !r.hasConfessed);
    }

    if (filteredRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
            لا توجد بيانات تطابق الفلتر المختار لهذا الشهر (${monthKey}).
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredRows.map((r, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700; color: var(--text-primary);">${Utils.sanitize(r.student.name)}</td>
        <td><strong style="font-family: monospace; background: var(--bg-tertiary); padding: 0.15rem 0.5rem; border-radius: 4px;">📟 ${r.student.barcode || r.student.code}</strong></td>
        <td>${Utils.sanitize(r.student.stage)}</td>
        <td style="text-align: center;">
          ${r.hasConfessed 
            ? `<span class="stat-badge" style="background: var(--success-light); color: var(--success); font-weight: bold;">✓ تم الاعتراف</span>`
            : `<span class="stat-badge" style="background: var(--danger-light); color: var(--danger);">✕ لم يسجل بعد</span>`
          }
        </td>
        <td style="text-align: center; font-weight: bold; color: ${r.hasConfessed ? 'var(--primary)' : 'var(--text-muted)'};">
          ${r.hasConfessed ? r.confession.confessionDate : '—'}
        </td>
        <td style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          ${r.hasConfessed ? Utils.sanitize(r.confession.recordedBy || 'المشرف') : '—'}
        </td>
      </tr>
    `).join('');
  },

  exportWordReport() {
    const monthInput = document.getElementById('confession-month-filter');
    const monthKey = (monthInput && monthInput.value) || this.currentMonthKey || DB.getCurrentMonthYear().monthKey;
    const stageTitle = this.currentStageFilter || 'جميع المراحل الأربعة';
    const churchSettings = DB.getSettings();

    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }

    if (students.length === 0) {
      alert('لا توجد بيانات طلاب لاستخراج تقرير الاعتراف!');
      return;
    }

    const allConfessionsForMonth = DB.getConfessions().filter(c => c.monthKey === monthKey);
    let confessedCount = 0;

    const rowsHtml = students.map((s, idx) => {
      const confession = allConfessionsForMonth.find(c => c.studentId === s.id);
      if (confession) confessedCount++;
      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold;">${s.name}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1; font-family: monospace;">${s.barcode || s.code}</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">${s.stage}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1; font-weight:bold; color: ${confession ? '#059669' : '#dc2626'};">
            ${confession ? '✓ اعترف' : '✕ لم يسجل'}
          </td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${confession ? confession.confessionDate : '—'}</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">${confession ? (confession.recordedBy || 'المشرف') : '—'}</td>
        </tr>
      `;
    }).join('');

    const pendingCount = Math.max(0, students.length - confessedCount);
    const confessionRate = students.length > 0 ? Math.round((confessedCount / students.length) * 100) : 0;
    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>تقرير متابعة الاعتراف الشهري - كنيسة أبي سيفين</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page { size: A4 portrait; margin: 1.5cm; }
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 20px; color: #0f172a; }
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 14pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          .stats-bar { display: table; width: 100%; margin-bottom: 20px; border: 2px solid #1e3a8a; background: #f8fafc; }
          .stats-cell { display: table-cell; padding: 10px; text-align: center; border-left: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 8px; border: 1px solid #1e3a8a; font-size: 10pt; text-align: center; }
          td { font-size: 9.5pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">تقرير متابعة سر الاعتراف الشهري — شهر (${monthKey})</div>
          <div style="font-size: 11pt; color: #475569; margin-top: 6px;">المرحلة: ${stageTitle} | تاريخ استخراج التقرير: ${exportDateStr}</div>
        </div>

        <div class="stats-bar">
          <div class="stats-cell"><strong>إجمالي الطلاب:</strong> ${students.length}</div>
          <div class="stats-cell" style="color: #059669;"><strong>اعترفوا:</strong> ${confessedCount}</div>
          <div class="stats-cell" style="color: #dc2626;"><strong>لم يعترفوا:</strong> ${pendingCount}</div>
          <div class="stats-cell" style="color: #b45309;"><strong>نسبة الاعتراف:</strong> ${confessionRate}%</div>
        </div>

        <h3 style="color:#1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px;">كشف بأسماء الطلاب وسجل اعترافاتهم:</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم المخدوم</th>
              <th>الباركود</th>
              <th>المرحلة الدراسية</th>
              <th>حالة الاعتراف</th>
              <th>تاريخ الاعتراف</th>
              <th>المشرف المسجل</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 45px; width: 100%; page-break-inside: avoid;">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; text-align:right; width: 50%;"><strong>أمين الخدمة:</strong> ..............................</td>
              <td style="border:none; text-align:left; width: 50%;"><strong>توقيع أب الاعتراف المشرف:</strong> ..............................</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const filename = `تقرير_الاعتراف_الشهري_أبي_سيفين_${monthKey}_${Utils.formatDate()}.doc`;
    Utils.downloadWordDocument(docHtml, filename);
    Utils.showToast('تم تصدير تقرير الاعتراف الشهري بصيغة Word بنجاح!', 'success');
  }
};

window.ConfessionReportsManager = ConfessionReportsManager;
document.addEventListener('DOMContentLoaded', () => {
  ConfessionReportsManager.init();
});

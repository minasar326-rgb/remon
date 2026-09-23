/**
 * Advanced Multi-Scope Word (.doc) Exporter & Reports Engine
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 * - تصدير فردي لكل طالب
 * - تصدير أسبوعي، شهري، ولكل الأوقات
 * - تصدير شامل مجمع للكل متبوعاً بكشف مفصل لكل مخدوم
 */

const ReportsManager = {
  currentScope: 'all', // 'week', 'month', 'custom', 'all'
  startDate: '',
  endDate: '',
  currentStageFilter: '',

  init() {
    this.initControls();
    this.renderMatrixReport();
  },

  initControls() {
    const scopeSelect = document.getElementById('report-scope-select');
    const stageSelect = document.getElementById('report-stage-select');
    const customDateContainer = document.getElementById('custom-date-container');
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    const applyBtn = document.getElementById('apply-custom-dates-btn');

    // Default dates to 30 days ago and today
    if (startDateInput && !startDateInput.value) {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      startDateInput.value = monthAgo.toISOString().split('T')[0];
    }
    if (endDateInput && !endDateInput.value) {
      endDateInput.value = new Date().toISOString().split('T')[0];
    }

    if (scopeSelect) {
      scopeSelect.addEventListener('change', (e) => {
        this.currentScope = e.target.value;
        if (customDateContainer) {
          customDateContainer.style.display = (this.currentScope === 'custom') ? 'flex' : 'none';
        }
        if (this.currentScope === 'custom') {
          this.startDate = startDateInput ? startDateInput.value : '';
          this.endDate = endDateInput ? endDateInput.value : '';
        }
        this.renderMatrixReport();
      });
    }

    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        if (this.currentScope === 'custom') {
          this.startDate = startDateInput.value;
          this.renderMatrixReport();
        }
      });
    }

    if (endDateInput) {
      endDateInput.addEventListener('change', () => {
        if (this.currentScope === 'custom') {
          this.endDate = endDateInput.value;
          this.renderMatrixReport();
        }
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (startDateInput) this.startDate = startDateInput.value;
        if (endDateInput) this.endDate = endDateInput.value;
        this.renderMatrixReport();
        Utils.showToast('تم تطبيق تصفية الفترة الزمنية بنجاح', 'info');
      });
    }

    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        this.currentStageFilter = e.target.value;
        this.renderMatrixReport();
      });
    }
  },

  // فلترة سجلات الحضور حسب النطاق الزمني (أسبوعي، شهري، مخصص بالتاريخ، كل الأوقات)
  getFilteredRecords() {
    const all = DB.getAttendance();
    const now = new Date();

    if (this.currentScope === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => new Date(r.date) >= oneWeekAgo);
    } else if (this.currentScope === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return all.filter(r => new Date(r.date) >= oneMonthAgo);
    } else if (this.currentScope === 'custom') {
      return all.filter(r => {
        let match = true;
        if (this.startDate && r.date < this.startDate) match = false;
        if (this.endDate && r.date > this.endDate) match = false;
        return match;
      });
    }
    return all;
  },

  getScopeLabel() {
    if (this.currentScope === 'week') return 'تقرير الأسبوع الحالي (آخر 7 أيام)';
    if (this.currentScope === 'month') return 'تقرير الشهر الحالي (آخر 30 يوماً)';
    if (this.currentScope === 'custom') {
      const fromStr = this.startDate ? `من تاريخ ${this.startDate}` : '';
      const toStr = this.endDate ? `إلى تاريخ ${this.endDate}` : '';
      return `تقرير الفترة المحددة (${fromStr} ${toStr})`.trim();
    }
    return 'التقرير الشامل التراكمي (كل الأوقات)';
  },

  renderMatrixReport() {
    const thead = document.getElementById('reports-matrix-head');
    const tbody = document.getElementById('reports-matrix-body');
    if (!tbody || !thead) return;

    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }

    const records = this.getFilteredRecords();

    thead.innerHTML = `
      <tr>
        <th style="min-width: 45px; text-align:center;">#</th>
        <th style="min-width: 170px; text-align: right;">اسم المخدوم</th>
        <th style="min-width: 110px; text-align: center;">الباركود</th>
        <th style="min-width: 140px;">المرحلة الدراسية</th>
        <th style="min-width: 90px; text-align:center;">خميس - تسبحة</th>
        <th style="min-width: 90px; text-align:center;">خميس - محاضرة</th>
        <th style="min-width: 90px; text-align:center;">خميس - نوتة</th>
        <th style="min-width: 90px; text-align:center;">جمعة - قداس</th>
        <th style="min-width: 90px; text-align:center;">جمعة - محاضرة</th>
        <th style="min-width: 100px; text-align:center;">إجمالي الحضور</th>
        <th style="min-width: 90px; text-align:center;">الإجراء</th>
      </tr>
    `;

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">لا توجد بيانات طلاب مطابقة للفلتر.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map((s, idx) => {
      const sRecords = records.filter(r => r.studentId === s.id);

      const hasKhamisTasbeha = sRecords.some(r => r.dayName === 'الخميس' && r.period === 'تسبحة');
      const hasKhamisMohadra = sRecords.some(r => r.dayName === 'الخميس' && r.period === 'محاضرة');
      const hasKhamisNota = sRecords.some(r => r.dayName === 'الخميس' && r.period === 'نوتة روحية');
      const hasGomaaQaddas = sRecords.some(r => r.dayName === 'الجمعة' && r.period === 'قداس');
      const hasGomaaMohadra = sRecords.some(r => r.dayName === 'الجمعة' && r.period === 'محاضرة');

      const totalSessions = sRecords.length;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight: bold; color: var(--text-primary); text-align: right;">${Utils.sanitize(s.name)}</td>
          <td style="text-align:center;"><strong style="font-family: monospace; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">📟 ${s.barcode || s.code}</strong></td>
          <td>${Utils.sanitize(s.stage)}</td>
          <td style="text-align:center;">${hasKhamisTasbeha ? '<span class="status-pill status-present" style="margin:0 auto;">✓</span>' : '<span class="status-pill status-absent" style="margin:0 auto;">✕</span>'}</td>
          <td style="text-align:center;">${hasKhamisMohadra ? '<span class="status-pill status-present" style="margin:0 auto;">✓</span>' : '<span class="status-pill status-absent" style="margin:0 auto;">✕</span>'}</td>
          <td style="text-align:center;">${hasKhamisNota ? '<span class="status-pill status-present" style="margin:0 auto;">✓</span>' : '<span class="status-pill status-absent" style="margin:0 auto;">✕</span>'}</td>
          <td style="text-align:center;">${hasGomaaQaddas ? '<span class="status-pill status-present" style="margin:0 auto;">✓</span>' : '<span class="status-pill status-absent" style="margin:0 auto;">✕</span>'}</td>
          <td style="text-align:center;">${hasGomaaMohadra ? '<span class="status-pill status-present" style="margin:0 auto;">✓</span>' : '<span class="status-pill status-absent" style="margin:0 auto;">✕</span>'}</td>
          <td style="text-align:center;"><span class="stat-badge" style="background: var(--primary-light); color: var(--primary); font-weight:bold;">${totalSessions} مرات</span></td>
          <td style="text-align:center;">
            <button class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;" onclick="ReportsManager.exportStudentWordReport('${s.id}')" title="تصدير Word فردي">
              📄 Word فردي
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // 1. تصدير Word شامل للكل متبوعاً بتفصيل كامل لكل طالب
  exportFullComprehensiveWordReport() {
    const churchSettings = DB.getSettings();
    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }
    const records = this.getFilteredRecords();
    const scopeTitle = this.getScopeLabel();
    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 1. جدول الحصر المجمع لجميع الطلاب
    let summaryRows = '';
    students.forEach((s, idx) => {
      const sRecords = records.filter(r => r.studentId === s.id);
      const cTasbeha = sRecords.filter(r => r.dayName === 'الخميس' && r.period === 'تسبحة').length;
      const cMohadraKh = sRecords.filter(r => r.dayName === 'الخميس' && r.period === 'محاضرة').length;
      const cNota = sRecords.filter(r => r.dayName === 'الخميس' && r.period === 'نوتة روحية').length;
      const cQaddas = sRecords.filter(r => r.dayName === 'الجمعة' && r.period === 'قداس').length;
      const cMohadraG = sRecords.filter(r => r.dayName === 'الجمعة' && r.period === 'محاضرة').length;
      const total = sRecords.length;

      summaryRows += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1; font-weight: bold;">${s.name}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1; font-family: monospace;">${s.barcode || s.code}</td>
          <td style="padding: 7px; border: 1px solid #cbd5e1;">${s.stage}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${cTasbeha > 0 ? '✓' : '—'}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${cMohadraKh > 0 ? '✓' : '—'}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${cNota > 0 ? '✓' : '—'}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${cQaddas > 0 ? '✓' : '—'}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1;">${cMohadraG > 0 ? '✓' : '—'}</td>
          <td style="text-align:center; padding: 7px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e3a8a;">${total}</td>
        </tr>
      `;
    });

    // 2. الكشف المفصل لكل طالب على حدة في نفس المستند
    let detailedSections = '';
    students.forEach((s, idx) => {
      const sRecords = records.filter(r => r.studentId === s.id);
      let sessionRows = '';
      if (sRecords.length === 0) {
        sessionRows = '<tr><td colspan="5" style="text-align:center; padding:10px; color:#64748b;">لم يسجل حضور في هذه الفترة.</td></tr>';
      } else {
        sRecords.forEach((sr, i) => {
          sessionRows += `
            <tr>
              <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${i + 1}</td>
              <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${sr.date}</td>
              <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight:bold;">${sr.dayName}</td>
              <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; color:#1e3a8a; font-weight:bold;">${sr.period}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${sr.supervisor}</td>
            </tr>
          `;
        });
      }

      detailedSections += `
        <div style="page-break-before: always; margin-top: 30px; border: 2px solid #1e3a8a; border-radius: 8px; padding: 15px;">
          <h3 style="margin:0 0 10px 0; color:#1e3a8a; border-bottom: 2px solid #b45309; padding-bottom: 5px;">
            [${idx + 1}] ملف متابعة تفصيلي: ${s.name}
          </h3>
          <table style="width: 100%; border:none; margin-bottom: 12px;">
            <tr>
              <td style="border:none; width: 33%;"><strong>الباركود:</strong> ${s.barcode || s.code}</td>
              <td style="border:none; width: 33%;"><strong>المرحلة:</strong> ${s.stage}</td>
              <td style="border:none; width: 33%;"><strong>رقم الهاتف:</strong> ${s.phone || 'غير مسجل'}</td>
            </tr>
          </table>

          <h4 style="margin: 8px 0; color:#475569;">سجل تواريخ وأوقات الحضور بالتفصيل:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 6px; border: 1px solid #cbd5e1; width:40px;">#</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">التاريخ</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">اليوم</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الفترة</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">المشرف المسجل</th>
              </tr>
            </thead>
            <tbody>
              ${sessionRows}
            </tbody>
          </table>
        </div>
      `;
    });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>تقرير حضور كنيسة أبي سيفين</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 25px; }
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 14pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          .meta { font-size: 11pt; color: #475569; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 8px; border: 1px solid #1e3a8a; font-size: 10pt; text-align: center; }
          td { font-size: 9.5pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">${churchSettings.serviceName || 'اجتماع إعداد الخدام ومدارس الأحد'} — ${scopeTitle}</div>
          <div class="meta">تاريخ التقرير: ${exportDateStr} | عدد المخدومين: ${students.length} | نطاق المتابعة: اجتماعات الخميس والجمعة</div>
        </div>

        <h2 style="color:#1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px;">أولاً: كشف الحضور الشامل لجميع المخدومين</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم المخدوم</th>
              <th>الباركود</th>
              <th>المرحلة</th>
              <th>خميس: تسبحة</th>
              <th>خميس: محاضرة</th>
              <th>خميس: نوتة</th>
              <th>جمعة: قداس</th>
              <th>جمعة: محاضرة</th>
              <th>إجمالي الحضور</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
        </table>

        <div style="margin-top: 40px;">
          <h2 style="color:#1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px;">ثانياً: الكشوفات التفصيلية الفردية لكل مخدوم</h2>
          ${detailedSections}
        </div>

        <div style="margin-top: 50px; width: 100%;">
          <table style="border:none;">
            <tr>
              <td style="border:none; text-align:right; width: 50%;"><strong>أمين الخدمة:</strong> ..............................</td>
              <td style="border:none; text-align:left; width: 50%;"><strong>توقيع كاهن الكنيسة المشرف:</strong> ..............................</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const scopeTag = this.currentScope === 'custom'
      ? `فترة_${this.startDate || 'البداية'}_إلى_${this.endDate || 'النهاية'}`
      : this.currentScope;
    link.download = `تقرير_حضور_شامل_ومفصل_كنيسة_أبي_سيفين_${scopeTag}_${Utils.formatDate()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Utils.showToast('تم تصدير التقرير الشامل والمفصل بنجاح بصيغة Word!', 'success');
  },

  // 2. تصدير Word فردي لطالب واحد محدد
  exportStudentWordReport(studentId) {
    const student = DB.getStudentById(studentId);
    if (!student) return;

    const churchSettings = DB.getSettings();
    const records = this.getFilteredRecords().filter(a => a.studentId === studentId);
    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let rows = '';
    records.forEach((r, i) => {
      rows += `
        <tr>
          <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${i + 1}</td>
          <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1;">${r.date}</td>
          <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1; font-weight:bold;">${r.dayName}</td>
          <td style="text-align:center; padding: 8px; border: 1px solid #cbd5e1; color:#1e3a8a; font-weight:bold;">${r.period}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${r.supervisor}</td>
        </tr>
      `;
    });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>ملف مخدوم - كنيسة أبي سيفين</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 25px; }
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 14pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          .info-card { border: 2px solid #1e3a8a; border-radius: 8px; padding: 15px; background-color: #f8fafc; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 8px; border: 1px solid #1e3a8a; text-align: center; }
          td { font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">تقرير المتابعة الفردي للمخدوم (${this.getScopeLabel()})</div>
          <div style="font-size: 11pt; color: #475569; margin-top: 5px;">تاريخ التصدير: ${exportDateStr}</div>
        </div>

        <div class="info-card">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; width: 50%;"><strong>اسم المخدوم:</strong> ${student.name}</td>
              <td style="border:none; width: 50%;"><strong>رقم الباركود:</strong> ${student.barcode || student.code}</td>
            </tr>
            <tr>
              <td style="border:none;"><strong>المرحلة:</strong> ${student.stage}</td>
              <td style="border:none;"><strong>الفوج / المجموعة:</strong> ${student.group || 'عام'}</td>
            </tr>
            <tr>
              <td style="border:none;"><strong>رقم الهاتف:</strong> ${student.phone || 'غير مسجل'}</td>
              <td style="border:none;"><strong>مرات الحضور المسجلة:</strong> ${records.length} فترات</td>
            </tr>
          </table>
        </div>

        <h3 style="color:#1e3a8a;">بيان جلسات وحصص الحضور بالتفصيل:</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>الفترة المقررة</th>
              <th>المشرف المسجل</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center; padding:15px; color:#64748b;">لا توجد سجلات حضور مسجلة لهذا المخدوم في هذا النطاق.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ملف_مخدوم_${student.name.replace(/\s+/g, '_')}_${student.barcode || student.code}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Utils.showToast('تم تصدير ملف Word الفردي بنجاح!', 'success');
  }
};

window.ReportsManager = ReportsManager;

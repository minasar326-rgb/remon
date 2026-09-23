/**
 * Attendance Management Engine (خميس وجمعة فقط مع الفترات المخصصة)
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const AttendanceManager = {
  currentDay: 'الخميس',
  currentPeriod: 'تسبحة',
  currentStageFilter: '',

  init() {
    this.initDayAndPeriodControls();
    this.initAutocomplete();
    this.renderAttendanceTable();
    this.updateHeaderSummary();
  },

  initDayAndPeriodControls() {
    const daySelect = document.getElementById('attendance-day-select');
    const periodSelect = document.getElementById('attendance-period-select');
    const stageSelect = document.getElementById('attendance-stage-filter');

    const updatePeriods = () => {
      this.currentDay = daySelect ? daySelect.value : 'الخميس';
      const periods = DB.PERIODS[this.currentDay] || ['تسبحة', 'محاضرة', 'نوتة روحية'];

      if (periodSelect) {
        periodSelect.innerHTML = periods.map(p => `<option value="${p}">${p}</option>`).join('');
        this.currentPeriod = periodSelect.value;
      }
      this.renderAttendanceTable();
      this.updateHeaderSummary();
    };

    if (daySelect) {
      daySelect.addEventListener('change', updatePeriods);
      updatePeriods();
    }

    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        this.currentPeriod = e.target.value;
        this.renderAttendanceTable();
        this.updateHeaderSummary();
      });
    }

    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        this.currentStageFilter = e.target.value;
        this.renderAttendanceTable();
        this.updateHeaderSummary();
      });
    }
  },

  initAutocomplete() {
    const searchInput = document.getElementById('manual-student-input');
    const dropdown = document.getElementById('manual-autocomplete-list');
    if (!searchInput || !dropdown) return;

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim().toLowerCase();
      if (!val || val.length < 1) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
      }

      const students = DB.getStudents();
      const matches = students.filter(s => 
        s.name.toLowerCase().includes(val) || 
        (s.barcode && s.barcode.toLowerCase().includes(val)) ||
        (s.code && s.code.toLowerCase().includes(val)) ||
        (s.phone && s.phone.includes(val))
      ).slice(0, 6);

      if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding: 0.8rem; color: var(--text-muted); text-align: center;">لا يوجد مخدوم بهذا الاسم أو الباركود</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = matches.map(student => `
        <div class="autocomplete-item" data-barcode="${student.barcode || student.code}" style="padding: 0.8rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--text-primary); display: block;">${Utils.sanitize(student.name)}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${Utils.sanitize(student.stage)}</span>
          </div>
          <span style="background: var(--primary-light); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.8rem; font-family: monospace;">📟 ${student.barcode || student.code}</span>
        </div>
      `).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          const barcode = item.getAttribute('data-barcode');
          this.processAttendanceByBarcode(barcode, 'تسجيل يدوي (بحث سريع)');
          searchInput.value = '';
          dropdown.style.display = 'none';
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  },

  // تسجيل الحضور بالباركود أو كود الكارنيه
  processAttendanceByBarcode(barcodeOrCode, method = 'ماسح الباركود (كاميرا)') {
    if (!barcodeOrCode) return;
    const student = DB.getStudentByCodeOrBarcode(barcodeOrCode);

    if (!student) {
      Utils.playBeep('error');
      Utils.showToast(`الباركود (${barcodeOrCode}) غير مسجل لأي طالب في النظام!`, 'error');
      return;
    }

    const todayDate = Utils.formatDate();

    // التحقق من تكرار تسجيل الحضور لنفس اليوم ونفس الفترة
    const existing = DB.getAttendance().find(a => 
      a.studentId === student.id && 
      a.dayName === this.currentDay &&
      a.period === this.currentPeriod &&
      a.date === todayDate
    );

    if (existing) {
      Utils.playBeep('warning');
      Utils.showToast(`الطالب: ${student.name} مسجل حضوره بالفعل في فترة (${this.currentDay} - ${this.currentPeriod})!`, 'warning');
      this.highlightRecentAttendedCard(student, true);
      return;
    }

    const record = DB.recordAttendance({
      studentId: student.id,
      studentCode: student.code,
      barcode: student.barcode || student.code,
      studentName: student.name,
      stage: student.stage,
      date: todayDate,
      dayName: this.currentDay,
      period: this.currentPeriod,
      method: method
    });

    Activity.log('تسجيل حضور باركود', `تم تسجيل حضور ${student.name} (${student.stage}) - ${this.currentDay} [${this.currentPeriod}].`);

    Utils.playBeep('success');
    Utils.showToast(`مرحباً ${student.name}! تم تسجيل الحضور (${this.currentDay} - ${this.currentPeriod}) بنجاح.`, 'success');
    this.highlightRecentAttendedCard(student, false);
    this.renderAttendanceTable();
    this.updateHeaderSummary();

    window.dispatchEvent(new CustomEvent('abs-attendance-recorded', { detail: record }));
  },

  highlightRecentAttendedCard(student, isDuplicate = false) {
    const banner = document.getElementById('recent-scan-banner');
    if (!banner) return;

    banner.innerHTML = `
      <div class="feed-item" style="border: 2px solid ${isDuplicate ? 'var(--warning)' : 'var(--success)'}; background: var(--bg-card); padding: 1.2rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="user-avatar" style="width: 55px; height: 55px; font-size: 1.4rem; background: ${isDuplicate ? 'var(--warning)' : 'var(--success)'};">
            ${isDuplicate ? '⚠️' : '✓'}
          </div>
          <div>
            <span style="font-size: 0.8rem; font-weight: bold; color: ${isDuplicate ? 'var(--warning)' : 'var(--success)'};">
              ${isDuplicate ? 'حضور مسجل مسبقاً' : 'تم مسح الباركود وتسجيل الحضور الآن'}
            </span>
            <h3 style="font-size: 1.2rem; color: var(--text-primary); margin: 0.2rem 0;">${Utils.sanitize(student.name)}</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              الباركود: <strong style="font-family: monospace;">${student.barcode || student.code}</strong> | المرحلة: <strong>${Utils.sanitize(student.stage)}</strong>
            </p>
            <span style="display:inline-block; margin-top: 4px; font-size: 0.75rem; background: var(--primary-light); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: bold;">
              ${this.currentDay} • ${this.currentPeriod}
            </span>
          </div>
        </div>
      </div>
    `;
  },

  renderAttendanceTable() {
    const tbody = document.getElementById('daily-attendance-body');
    if (!tbody) return;

    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }

    const todayDate = Utils.formatDate();
    const attendanceRecords = DB.getAttendance().filter(a => 
      a.dayName === this.currentDay && 
      a.period === this.currentPeriod &&
      a.date === todayDate
    );

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">لا يوجد طلاب مسجلون في هذه المرحلة.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map((s, idx) => {
      const record = attendanceRecords.find(a => a.studentId === s.id);
      const isPresent = !!record;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight: 700;">
            <a href="student.html?id=${s.id}" style="color: inherit; text-decoration: underline;">
              ${Utils.sanitize(s.name)}
            </a>
          </td>
          <td><strong style="font-family: monospace; background: var(--bg-tertiary); padding: 0.2rem 0.5rem; border-radius: 4px;">📟 ${s.barcode || s.code}</strong></td>
          <td>${Utils.sanitize(s.stage)}</td>
          <td style="text-align:center;">
            ${isPresent 
              ? `<span class="stat-badge" style="background: var(--success-light); color: var(--success); font-weight:bold;">✓ حاضر (${record.period})</span>` 
              : `<span class="stat-badge" style="background: var(--danger-light); color: var(--danger);">✕ غائب</span>`
            }
          </td>
          <td style="text-align:center;">
            ${isPresent 
              ? `<button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; color: var(--danger);" onclick="AttendanceManager.removeAttendance('${record.id}')">إلغاء</button>` 
              : `<button class="btn btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="AttendanceManager.processAttendanceByBarcode('${s.barcode || s.code}', 'تسجيل مباشر من الكشف')">تسجيل حضور</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  },

  removeAttendance(recordId) {
    if (confirm('هل أنت متأكد من إلغاء تسجيل الحضور لهذا المخدوم؟')) {
      DB.deleteAttendanceRecord(recordId);
      Utils.showToast('تم إلغاء الحضور بنجاح', 'info');
      this.renderAttendanceTable();
      this.updateHeaderSummary();
    }
  },

  updateHeaderSummary() {
    let students = DB.getStudents();
    if (this.currentStageFilter) {
      students = students.filter(s => s.stage === this.currentStageFilter);
    }
    const todayDate = Utils.formatDate();
    const attended = DB.getAttendance().filter(a => 
      a.dayName === this.currentDay && 
      a.period === this.currentPeriod &&
      a.date === todayDate &&
      (!this.currentStageFilter || a.stage === this.currentStageFilter)
    ).length;

    const total = students.length;
    const absent = Math.max(0, total - attended);
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    const elTotal = document.getElementById('summary-total-students');
    const elAttended = document.getElementById('summary-attended-today');
    const elAbsent = document.getElementById('summary-absent-today');
    const elRate = document.getElementById('summary-rate-today');

    if (elTotal) elTotal.textContent = total;
    if (elAttended) elAttended.textContent = attended;
    if (elAbsent) elAbsent.textContent = absent;
    if (elRate) elRate.textContent = rate + '%';
  }
};

window.AttendanceManager = AttendanceManager;

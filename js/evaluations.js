/**
 * Assessments, Evaluations, Grades & Subject Courses Management Engine
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const EvaluationsManager = {
  currentStage: 'ابتدائي (المرحلة الابتدائية بالكامل)',
  activeSubjectId: null,
  activePartName: null,
  activeAssessmentId: null,
  viewArchived: false,
  studentSearchTerm: '',
  sortMode: 'name', // name | scoreDesc | scoreAsc

  init() {
    // تحديد المرحلة الافتراضية بناءً على المرحلة التي بها طلاب فعلياً إن وجدت
    const allStudents = DB.getStudents();
    const stageWithStudents = DB.STAGES.find(st => allStudents.some(s => s.stage && s.stage.trim() === st.trim()));
    if (stageWithStudents) {
      this.currentStage = stageWithStudents;
    }

    this.initEventListeners();
    this.renderStagesSelector();
    this.renderSubjectsList();
  },

  initEventListeners() {
    const stageSelect = document.getElementById('eval-stage-select');
    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        this.currentStage = e.target.value;
        this.activeSubjectId = null;
        this.activePartName = null;
        this.activeAssessmentId = null;
        this.renderSubjectsList();
        this.renderLessonNavigation();
        this.renderGradesSheet();
      });
    }

    const searchInput = document.getElementById('eval-student-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.studentSearchTerm = e.target.value.trim().toLowerCase();
        this.renderGradesSheet();
      });
    }

    const sortSelect = document.getElementById('eval-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortMode = e.target.value;
        this.renderGradesSheet();
      });
    }

    window.addEventListener('abs-students-updated', () => {
      // إعادة ملء المراحل وتحديث كشف الدرجات لحظياً فور وصول الطلاب
      this.renderStagesSelector();
      this.renderGradesSheet();
    });
    window.addEventListener('abs-subjects-updated', () => this.renderSubjectsList());
    window.addEventListener('abs-assessments-updated', () => {
      this.renderLessonNavigation();
      this.renderGradesSheet();
    });
    window.addEventListener('abs-grades-updated', () => this.renderGradesSheet());
  },

  toggleArchivedView() {
    this.viewArchived = !this.viewArchived;
    const btn = document.getElementById('btn-toggle-archived');
    if (btn) {
      btn.innerHTML = this.viewArchived 
        ? '<span>📚</span><span>عرض المواد النشطة الحالية</span>' 
        : '<span>📦</span><span>عرض المواد المؤرشفة</span>';
      btn.classList.toggle('btn-accent', this.viewArchived);
      btn.classList.toggle('btn-secondary', !this.viewArchived);
    }
    this.activeSubjectId = null;
    this.activePartName = null;
    this.activeAssessmentId = null;
    this.renderSubjectsList();
    this.renderLessonNavigation();
    this.renderGradesSheet();
  },

  renderStagesSelector() {
    const stageSelect = document.getElementById('eval-stage-select');
    if (!stageSelect) return;
    stageSelect.innerHTML = DB.STAGES.map(st => `
      <option value="${st}" ${st === this.currentStage ? 'selected' : ''}>${st}</option>
    `).join('');
  },

  // 1. عرض المواد للمرحلة المحددة
  renderSubjectsList() {
    const container = document.getElementById('eval-subjects-list');
    if (!container) return;

    const allSubjects = DB.getSubjects(true);
    const subjectsForStage = allSubjects.filter(s => 
      s.stage === this.currentStage && 
      (this.viewArchived ? s.status === 'archived' : s.status !== 'archived')
    );

    if (subjectsForStage.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          ${this.viewArchived ? 'لا توجد مواد مؤرشفة لهذه المرحلة حتى الآن.' : 'لا توجد مواد دراسية مضافة لهذه المرحلة بعد. اضغط على زر "إضافة مادة جديدة" للبدء.'}
        </div>
      `;
      this.activeSubjectId = null;
      this.renderLessonNavigation();
      this.renderGradesSheet();
      return;
    }

    // إذا لم تكن هناك مادة محددة، نحدد الأولى تلقائياً
    if (!this.activeSubjectId || !subjectsForStage.some(s => s.id === this.activeSubjectId)) {
      this.activeSubjectId = subjectsForStage[0].id;
    }

    container.innerHTML = subjectsForStage.map(sub => {
      const isSelected = sub.id === this.activeSubjectId;
      const isArchived = sub.status === 'archived';
      const assessments = DB.getAssessmentsBySubject(sub.id);
      const partsCount = new Set(assessments.map(a => a.partName || 'الجزء العام')).size;
      const lessonsCount = assessments.length;

      return `
        <div class="subject-card ${isSelected ? 'active-subject' : ''}" onclick="EvaluationsManager.selectSubject('${sub.id}')" style="
          padding: 1rem 1.2rem; margin-bottom: 0.8rem; border-radius: var(--radius-md); cursor: pointer;
          border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'};
          background: ${isSelected ? 'rgba(30, 58, 138, 0.08)' : 'var(--bg-card)'};
          transition: all 0.2s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 1.05rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
              <span>📖</span><span>${Utils.sanitize(sub.name)}</span>
            </strong>
            <span class="badge" style="background: ${isArchived ? 'var(--warning-light)' : 'var(--primary-light)'}; color: ${isArchived ? 'var(--warning)' : 'var(--primary)'}; font-size: 0.75rem;">
              ${isArchived ? '📦 مؤرشفة (' + (sub.academicYear || '') + ')' : 'نشطة (' + (sub.academicYear || '') + ')'}
            </span>
          </div>

          ${sub.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.4rem 0 0.6rem 0;">${Utils.sanitize(sub.description)}</p>` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem; font-size: 0.8rem; color: var(--text-muted);">
            <span>الأجزاء: <strong>${partsCount}</strong> | الدروس: <strong>${lessonsCount}</strong></span>
            
            <div style="display: flex; gap: 0.4rem;" onclick="event.stopPropagation()">
              <button class="btn-icon" title="تعديل المادة" onclick="EvaluationsManager.openEditSubjectModal('${sub.id}')" style="font-size: 0.85rem;">✏️</button>
              ${!isArchived ? `
                <button class="btn-icon" title="إنهاء المادة وأرشفتها" onclick="EvaluationsManager.archiveSubjectConfirm('${sub.id}')" style="font-size: 0.85rem; color: var(--accent-gold);">📦</button>
              ` : `
                <button class="btn-icon" title="استعادة المادة من الأرشيف" onclick="EvaluationsManager.unarchiveSubjectConfirm('${sub.id}')" style="font-size: 0.85rem; color: var(--success);">🔄</button>
              `}
              <button class="btn-icon" title="حذف نهائي للمادة" onclick="EvaluationsManager.deleteSubjectConfirm('${sub.id}')" style="font-size: 0.85rem; color: var(--danger);">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.renderLessonNavigation();
    this.renderGradesSheet();
  },

  selectSubject(subjectId) {
    this.activeSubjectId = subjectId;
    this.activePartName = null;
    this.activeAssessmentId = null;
    this.renderSubjectsList();
  },

  // 2. تصفح الأجزاء والدروس الخاصة بالمادة المحددة
  renderLessonNavigation() {
    const container = document.getElementById('eval-parts-lessons-nav');
    if (!container) return;

    if (!this.activeSubjectId) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
          يرجى اختيار مادة من القائمة أعلاه لعرض أجزائها ودروسها.
        </div>
      `;
      return;
    }

    const currentSubject = DB.getSubjectById(this.activeSubjectId);
    const assessments = DB.getAssessmentsBySubject(this.activeSubjectId);

    // تجميع الدروس حسب الجزء
    const partsMap = {};
    assessments.forEach(item => {
      const pName = item.partName || 'الجزء العام / الأول';
      if (!partsMap[pName]) partsMap[pName] = [];
      partsMap[pName].push(item);
    });

    const partNames = Object.keys(partsMap);

    if (partNames.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.8rem; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 2px dashed var(--border-color);">
          <p style="margin-bottom: 0.8rem; font-weight: bold;">المادة: "${Utils.sanitize(currentSubject ? currentSubject.name : '')}" لا تحتوي على أجزاء أو دروس بعد.</p>
          <button class="btn btn-primary btn-sm" onclick="EvaluationsManager.openAddLessonModal()">
            <span>➕</span><span>إضافة الجزء والدرس الأول</span>
          </button>
        </div>
      `;
      this.activeAssessmentId = null;
      return;
    }

    // إذا لم يكن هناك درس نشط، نحدد أول درس
    if (!this.activeAssessmentId || !assessments.some(a => a.id === this.activeAssessmentId)) {
      this.activeAssessmentId = assessments[0].id;
      this.activePartName = assessments[0].partName;
    }

    container.innerHTML = `
      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.2rem; align-items: center;">
        <span style="font-size: 0.85rem; font-weight: bold; color: var(--text-muted);">اختر الدرس أو عنصر التقييم لإدخال درجاته:</span>
        <button class="btn btn-secondary btn-sm" onclick="EvaluationsManager.openAddLessonModal()" style="margin-right: auto; padding: 0.35rem 0.8rem; font-size: 0.8rem;">
          <span>➕</span><span>إضافة درس / عنصر تقييم جديد</span>
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${partNames.map(pName => {
          const lessons = partsMap[pName];
          return `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.9rem 1.2rem;">
              <h4 style="margin: 0 0 0.8rem 0; font-size: 0.98rem; color: var(--primary); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem;">
                <span>📑 ${Utils.sanitize(pName)}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">${lessons.length} دروس</span>
              </h4>

              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                ${lessons.map(lesson => {
                  const isCur = lesson.id === this.activeAssessmentId;
                  return `
                    <div style="display: inline-flex; align-items: center; border-radius: 6px; overflow: hidden; border: 2px solid ${isCur ? 'var(--accent-gold)' : 'var(--border-color)'};">
                      <button type="button" onclick="EvaluationsManager.selectLesson('${lesson.id}', '${pName}')" style="
                        background: ${isCur ? 'var(--primary)' : 'var(--bg-secondary)'};
                        color: ${isCur ? '#ffffff' : 'var(--text-primary)'};
                        border: none; padding: 0.45rem 0.9rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
                      ">
                        <span>${Utils.sanitize(lesson.title)}</span>
                        <span style="background: rgba(0,0,0,0.18); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">(عظمى: ${lesson.maxScore})</span>
                      </button>
                      <button type="button" title="حذف الدرس" onclick="EvaluationsManager.deleteLessonConfirm('${lesson.id}')" style="
                        background: ${isCur ? 'var(--primary)' : 'var(--bg-secondary)'};
                        color: var(--danger); border: none; border-right: 1px solid var(--border-color); padding: 0.45rem 0.5rem; cursor: pointer; font-size: 0.8rem;
                      ">✕</button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  selectLesson(lessonId, partName) {
    this.activeAssessmentId = lessonId;
    this.activePartName = partName;
    this.renderLessonNavigation();
    this.renderGradesSheet();
  },

  // 3. شيت رصد درجات الطلاب للدرس المحدد
  renderGradesSheet() {
    const tbody = document.getElementById('eval-grades-table-body');
    const headerInfo = document.getElementById('eval-active-lesson-info');
    if (!tbody) return;

    if (!this.activeSubjectId) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 1.15rem; font-weight: bold; margin-bottom: 0.6rem; color: var(--text-primary);">
            📌 يرجى اختيار مادة دراسية أولاً أو الضغط على "إضافة مادة"
          </div>
          <div style="font-size: 0.88rem; margin-bottom: 1rem;">
            لكل مرحلة موادها الخاصة. بمجرد إضافة أو اختيار مادة وإضافة درس داخلها، ستظهر قائمة جميع مخدومي المرحلة فوراً لرصد درجاتهم.
          </div>
          <button class="btn btn-primary btn-sm" onclick="EvaluationsManager.openAddSubjectModal()">
            <span>➕</span><span>إضافة مادة دراسية جديدة</span>
          </button>
        </td></tr>
      `;
      if (headerInfo) headerInfo.textContent = 'يرجى اختيار مادة لعرض الدروس والطلاب...';
      return;
    }

    if (!this.activeAssessmentId) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 1.15rem; font-weight: bold; margin-bottom: 0.6rem; color: var(--text-primary);">
            📝 يرجى اختيار الدرس أو عنصر التقييم المطلوب رصد درجاته
          </div>
          <div style="font-size: 0.88rem; margin-bottom: 1rem;">
            اضغط على زر الدرس في لوحة "أجزاء المادة والدروس" أعلاه، أو اضغط على "إضافة درس جديد" للبدء في رصد درجات المخدومين.
          </div>
          <button class="btn btn-primary btn-sm" onclick="EvaluationsManager.openAddLessonModal()">
            <span>➕</span><span>إضافة درس / عنصر تقييم جديد</span>
          </button>
        </td></tr>
      `;
      if (headerInfo) headerInfo.textContent = 'في انتظار اختيار الدرس لرصد الدرجات...';
      return;
    }

    const currentSubject = DB.getSubjectById(this.activeSubjectId);
    const currentLesson = DB.getAssessmentById(this.activeAssessmentId);

    if (!currentLesson) return;

    if (headerInfo) {
      headerInfo.innerHTML = `
        المادة: <strong style="color:var(--primary);">${Utils.sanitize(currentSubject ? currentSubject.name : '')}</strong> |
        الجزء: <strong>${Utils.sanitize(currentLesson.partName || 'العام')}</strong> |
        الدرس: <strong style="color:var(--accent-gold);">${Utils.sanitize(currentLesson.title)}</strong> |
        الدرجة العظمى: <span class="badge" style="background:var(--accent-gold); color:#000; font-weight:800;">${currentLesson.maxScore} درجة</span>
      `;
    }

    const normalizeStage = (st) => (st || '').trim().replace(/\s+/g, ' ');
    const activeStageNorm = normalizeStage(this.currentStage);

    let students = DB.getStudents().filter(s => {
      const sStageNorm = normalizeStage(s.stage);
      return sStageNorm === activeStageNorm || s.stage === this.currentStage;
    });

    // تطبيق فلتر البحث
    if (this.studentSearchTerm) {
      students = students.filter(s => 
        s.name.toLowerCase().includes(this.studentSearchTerm) ||
        (s.barcode && s.barcode.toLowerCase().includes(this.studentSearchTerm)) ||
        (s.code && s.code.toLowerCase().includes(this.studentSearchTerm))
      );
    }

    const gradesList = DB.getGradesByAssessment(this.activeAssessmentId);

    // حساب الدرجات التراكمية للمادة ككل (المجموع الكلي: كام من كام)
    const allSubjectAssessments = DB.getAssessmentsBySubject(this.activeSubjectId);
    const subjectTotalMaxScore = allSubjectAssessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0);
    const allSubjectGrades = DB.getGradesBySubject(this.activeSubjectId);

    // دمج الدرجة مع الطالب للفرز وحساب إجمالي المادة لكل طالب
    let studentRows = students.map(s => {
      const gRecord = gradesList.find(g => g.studentId === s.id);
      const hasGrade = gRecord !== undefined && gRecord.score !== null;
      const score = hasGrade ? gRecord.score : null;

      // مجموع المادة لهذا الطالب
      const studentGradesInSubject = allSubjectGrades.filter(g => g.studentId === s.id && g.score !== null && g.score !== undefined);
      const totalSubjectEarned = studentGradesInSubject.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
      const hasAnyGradesInSubject = studentGradesInSubject.length > 0;

      return {
        student: s,
        gradeRecord: gRecord,
        hasGrade: hasGrade,
        score: score,
        notes: gRecord ? gRecord.notes : '',
        totalSubjectEarned: totalSubjectEarned,
        hasAnyGradesInSubject: hasAnyGradesInSubject
      };
    });

    // الفرز
    if (this.sortMode === 'scoreDesc') {
      studentRows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else if (this.sortMode === 'scoreAsc') {
      studentRows.sort((a, b) => (a.score ?? 9999) - (b.score ?? 9999));
    } else {
      studentRows.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
    }

    if (studentRows.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem; color: var(--text-primary);">
            ⚠️ لا يوجد مخدومين مسجلين في مرحلة (${this.currentStage})
          </div>
          <div style="font-size: 0.88rem;">
            يرجى اختيار المرحلة الدراسية التي يتواجد بها مخدوموك من القائمة أعلى اليمين (مثال: أولى إعداد خدام أو تانية إعداد خدام).
          </div>
        </td></tr>
      `;
      return;
    }

    const maxScore = Number(currentLesson.maxScore) || 10;

    tbody.innerHTML = studentRows.map((r, idx) => {
      const s = r.student;
      const scoreVal = r.hasGrade ? r.score : '';
      const percent = r.hasGrade && maxScore > 0 ? Math.round((r.score / maxScore) * 100) : null;
      const statusBadge = !r.hasGrade
        ? `<span class="stat-badge" style="background: var(--bg-tertiary); color: var(--text-muted);">لم ترصد</span>`
        : percent >= 85
        ? `<span class="stat-badge" style="background: var(--success-light); color: var(--success); font-weight:800;">ممتاز (${percent}%)</span>`
        : percent >= 70
        ? `<span class="stat-badge" style="background: var(--primary-light); color: var(--primary); font-weight:800;">جيد جداً (${percent}%)</span>`
        : percent >= 50
        ? `<span class="stat-badge" style="background: var(--warning-light); color: var(--warning); font-weight:800;">ناجح (${percent}%)</span>`
        : `<span class="stat-badge" style="background: var(--danger-light); color: var(--danger); font-weight:800;">ضعيف (${percent}%)</span>`;

      // نسبة إجمالي المادة كام من كام
      const subjectPercent = subjectTotalMaxScore > 0 ? Math.round((r.totalSubjectEarned / subjectTotalMaxScore) * 100) : 0;
      const totalSubjectBadge = subjectTotalMaxScore === 0
        ? `<span style="color:var(--text-muted); font-size:0.85rem;">-</span>`
        : !r.hasAnyGradesInSubject
        ? `<span style="font-weight:700; color:var(--text-muted); font-size:0.9rem;">0 من ${subjectTotalMaxScore}</span>`
        : `
          <div style="display:flex; flex-direction:column; align-items:center; gap:0.15rem;">
            <strong style="color:var(--primary); font-size:1.05rem; font-weight:800;">
              ${r.totalSubjectEarned} <span style="font-size:0.85rem; font-weight:normal; color:var(--text-muted);">من</span> ${subjectTotalMaxScore}
            </strong>
            <span class="badge" style="
              font-size:0.75rem; font-weight:800; padding:0.1rem 0.45rem; border-radius:12px;
              background:${subjectPercent >= 85 ? 'var(--success-light)' : subjectPercent >= 50 ? 'var(--primary-light)' : 'var(--danger-light)'};
              color:${subjectPercent >= 85 ? 'var(--success)' : subjectPercent >= 50 ? 'var(--primary)' : 'var(--danger)'};
            ">
              ${subjectPercent}%
            </span>
          </div>
        `;

      return `
        <tr data-student-id="${s.id}">
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700; color: var(--text-primary);">
            <a href="student.html?id=${s.id}" style="color: inherit; text-decoration: underline;">
              ${Utils.sanitize(s.name)}
            </a>
          </td>
          <td style="text-align: center;"><strong style="font-family: monospace; background: var(--bg-tertiary); padding: 0.15rem 0.5rem; border-radius: 4px;">📟 ${s.barcode || s.code}</strong></td>
          <td style="width: 140px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
              <input type="number" step="0.5" min="0" max="${maxScore}" value="${scoreVal}" class="form-input grade-input" data-student-id="${s.id}" placeholder="من ${maxScore}" style="
                width: 85px; text-align: center; font-weight: 800; font-size: 1rem; border: 2px solid ${r.hasGrade ? 'var(--primary)' : 'var(--border-color)'}; padding: 0.35rem 0.4rem;
              " onchange="EvaluationsManager.onSingleGradeChange('${s.id}', this.value, ${maxScore})">
              <span style="font-size: 0.8rem; color: var(--text-muted);">/ ${maxScore}</span>
            </div>
          </td>
          <td style="text-align: center;" id="status-cell-${s.id}">${statusBadge}</td>
          <td style="text-align: center; background: rgba(30, 58, 138, 0.03);" id="subject-total-cell-${s.id}">
            ${totalSubjectBadge}
          </td>
          <td>
            <input type="text" class="form-input note-input" data-student-id="${s.id}" value="${Utils.sanitize(r.notes)}" placeholder="ملاحظات اختيارية..." style="padding: 0.35rem 0.6rem; font-size: 0.85rem;" onchange="EvaluationsManager.onNoteChange('${s.id}', this.value)">
          </td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm" onclick="EvaluationsManager.openStudentGradesModal('${s.id}')" title="عرض جميع درجات هذا المخدوم في جميع المواد من هنا مباشرة" style="padding: 0.3rem 0.65rem; font-size: 0.8rem; font-weight: bold; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
              📋 كشف درجاته
            </button>
          </td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm" onclick="EvaluationsManager.exportSingleStudentReport('${s.id}')" title="تصدير تقرير Word شامل لهذا الطالب" style="padding: 0.3rem 0.65rem; font-size: 0.8rem;">
              📄 وورد
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  onSingleGradeChange(studentId, val, maxScore) {
    val = val.trim();
    if (val === '') {
      DB.saveGrade(studentId, this.activeAssessmentId, null);
      Utils.showToast('تم إزالة الدرجة (غير مسجل)', 'info');
      this.renderGradesSheet();
      return;
    }

    const num = Number(val);
    if (isNaN(num) || num < 0) {
      alert('قيمة الدرجة غير صالحة!');
      this.renderGradesSheet();
      return;
    }

    if (num > maxScore) {
      alert(`⚠️ لا يمكن إدخال درجة أكبر من الدرجة العظمى (${maxScore})!`);
      this.renderGradesSheet();
      return;
    }

    const noteInput = document.querySelector(`.note-input[data-student-id="${studentId}"]`);
    const notes = noteInput ? noteInput.value.trim() : '';

    DB.saveGrade(studentId, this.activeAssessmentId, num, notes);
    Utils.showToast('تم حفظ الدرجة بنجاح ✓', 'success', 2000);
    this.renderGradesSheet();
  },

  onNoteChange(studentId, noteVal) {
    const gradeInput = document.querySelector(`.grade-input[data-student-id="${studentId}"]`);
    const val = gradeInput ? gradeInput.value.trim() : '';
    if (val !== '') {
      DB.saveGrade(studentId, this.activeAssessmentId, Number(val), noteVal);
    }
  },

  saveAllCurrentGrades() {
    if (!this.activeAssessmentId) return;
    const currentLesson = DB.getAssessmentById(this.activeAssessmentId);
    const maxScore = Number(currentLesson ? currentLesson.maxScore : 10);

    const gradeInputs = document.querySelectorAll('.grade-input');
    let savedCount = 0;

    gradeInputs.forEach(input => {
      const studentId = input.getAttribute('data-student-id');
      const val = input.value.trim();
      const noteInput = document.querySelector(`.note-input[data-student-id="${studentId}"]`);
      const notes = noteInput ? noteInput.value.trim() : '';

      if (val !== '') {
        const num = Number(val);
        if (!isNaN(num) && num >= 0 && num <= maxScore) {
          DB.saveGrade(studentId, this.activeAssessmentId, num, notes);
          savedCount++;
        }
      } else {
        DB.saveGrade(studentId, this.activeAssessmentId, null, notes);
      }
    });

    Activity.log('حفظ درجات مجمع', `تم حفظ درجات ${savedCount} مخدوم في درس (${currentLesson ? currentLesson.title : ''}).`);
    Utils.playBeep('success');
    Utils.showToast(`تم حفظ درجات جميع الطلاب (${savedCount} طالب) بنجاح!`, 'success');
    this.renderGradesSheet();
  },

  // 4. نوافذ إدارة المواد (إضافة، تعديل، أرشفة)
  openAddSubjectModal() {
    const name = prompt('أدخل اسم المادة الدراسية الجديدة (مثال: الكتاب المقدس، العقيدة، المحفوظات):');
    if (!name || !name.trim()) return;

    const academicYear = prompt('أدخل السنة أو الدورة الدراسية (مثال: 2026 أو 2026-2027):', String(new Date().getFullYear())) || String(new Date().getFullYear());
    const desc = prompt('أدخل وصفاً للمادة أو ملاحظات (اختياري):') || '';

    const newSub = DB.saveSubject({
      name: name.trim(),
      stage: this.currentStage,
      academicYear: academicYear.trim(),
      description: desc.trim(),
      status: 'active'
    });

    Activity.log('إضافة مادة جديدة', `تمت إضافة مادة جديدة (${newSub.name}) لمرحلة (${this.currentStage}).`);
    Utils.showToast(`تمت إضافة مادة "${newSub.name}" بنجاح!`, 'success');
    this.activeSubjectId = newSub.id;
    this.renderSubjectsList();
  },

  openEditSubjectModal(subjectId) {
    const sub = DB.getSubjectById(subjectId);
    if (!sub) return;

    const newName = prompt('تعديل اسم المادة:', sub.name);
    if (newName === null) return;
    if (!newName.trim()) { alert('اسم المادة لا يمكن أن يكون فارغاً'); return; }

    const newYear = prompt('تعديل السنة / الدورة الدراسية:', sub.academicYear || String(new Date().getFullYear()));
    const newDesc = prompt('تعديل الوصف:', sub.description || '');

    sub.name = newName.trim();
    if (newYear) sub.academicYear = newYear.trim();
    if (newDesc !== null) sub.description = newDesc.trim();

    DB.saveSubject(sub);
    Activity.log('تعديل مادة', `تم تعديل بيانات مادة (${sub.name}).`);
    Utils.showToast('تم تحديث بيانات المادة بنجاح!', 'success');
    this.renderSubjectsList();
  },

  archiveSubjectConfirm(subjectId) {
    const sub = DB.getSubjectById(subjectId);
    if (!sub) return;

    const ok = confirm(`📦 إنهاء المادة وأرشفتها:\nهل أنت متأكد من إنهاء مادة "${sub.name}" ونقلها للأرشيف؟\n\nستختفي من القائمة النشطة، وستظل جميع درجات وتقييمات الطلاب محفوظة بالكامل ويمكنك مراجعتها واستخراج تقارير Word عنها في أي وقت.`);
    if (ok) {
      DB.archiveSubject(subjectId);
      Activity.log('أرشفة مادة', `تمت أرشفة مادة (${sub.name}) وحفظ جميع درجات الطلاب بأمان.`);
      Utils.showToast(`تم إنهاء وأرشفة مادة "${sub.name}" بنجاح.`, 'info');
      this.renderSubjectsList();
    }
  },

  unarchiveSubjectConfirm(subjectId) {
    const sub = DB.getSubjectById(subjectId);
    if (!sub) return;

    if (confirm(`هل تريد استعادة مادة "${sub.name}" من الأرشيف إلى قائمة التقييمات النشطة؟`)) {
      DB.unarchiveSubject(subjectId);
      Activity.log('استعادة مادة من الأرشيف', `تمت استعادة مادة (${sub.name}) إلى التقييمات النشطة.`);
      Utils.showToast(`تمت استعادة مادة "${sub.name}" كنشطة بنجاح!`, 'success');
      this.renderSubjectsList();
    }
  },

  deleteSubjectConfirm(subjectId) {
    const sub = DB.getSubjectById(subjectId);
    if (!sub) return;

    const ok = confirm(`⚠️ تحذير شديد:\nهل أنت متأكد تماماً من حذف مادة "${sub.name}" نهائياً؟\n(يُفضل دائماً أرشفة المادة بدلاً من حذفها للحفاظ على السجل التاريخي للطلاب).`);
    if (ok) {
      DB.deleteSubject(subjectId);
      Activity.log('حذف مادة', `تم حذف مادة (${sub.name}) نهائياً.`);
      Utils.showToast('تم حذف المادة بنجاح', 'info');
      this.activeSubjectId = null;
      this.renderSubjectsList();
    }
  },

  // 5. نوافذ إدارة الأجزاء والدروس
  openAddLessonModal() {
    if (!this.activeSubjectId) {
      alert('يرجى اختيار مادة أولاً لإضافة الدروس داخلها.');
      return;
    }

    const currentSubject = DB.getSubjectById(this.activeSubjectId);

    const partName = prompt('أدخل اسم الجزء (مثال: سفر التكوين، المحور الأول، الترم الأول):', this.activePartName || 'الجزء الأول');
    if (!partName || !partName.trim()) return;

    const lessonTitle = prompt('أدخل اسم الدرس أو عنصر التقييم (مثال: الخليقة، آدم وحواء، امتحان شهر أكتوبر):');
    if (!lessonTitle || !lessonTitle.trim()) return;

    const maxScoreStr = prompt('أدخل الدرجة العظمى لهذا التقييم (مثال: 10 أو 20 أو 100):', '10');
    const maxScore = Number(maxScoreStr) || 10;

    const newLesson = DB.saveAssessment({
      subjectId: this.activeSubjectId,
      partName: partName.trim(),
      title: lessonTitle.trim(),
      maxScore: maxScore
    });

    Activity.log('إضافة درس تقييم', `تمت إضافة درس (${newLesson.title}) في مادة (${currentSubject ? currentSubject.name : ''}).`);
    Utils.showToast(`تمت إضافة درس "${newLesson.title}" بنجاح!`, 'success');
    this.activeAssessmentId = newLesson.id;
    this.activePartName = newLesson.partName;
    this.renderLessonNavigation();
    this.renderGradesSheet();
  },

  deleteLessonConfirm(lessonId) {
    const lesson = DB.getAssessmentById(lessonId);
    if (!lesson) return;

    if (confirm(`هل أنت متأكد من حذف درس/عنصر تقييم "${lesson.title}"؟`)) {
      DB.deleteAssessment(lessonId);
      Activity.log('حذف درس تقييم', `تم حذف درس (${lesson.title}).`);
      Utils.showToast('تم حذف الدرس بنجاح', 'info');
      this.activeAssessmentId = null;
      this.renderLessonNavigation();
      this.renderGradesSheet();
    }
  },

  // ==========================================
  // 6. تقارير التقييمات بصيغة Word (.doc / .docx)
  // ==========================================

  // 1. تقرير مادة كاملة
  exportSubjectReport() {
    if (!this.activeSubjectId) {
      alert('يرجى اختيار مادة لاستخراج تقريرها!');
      return;
    }

    const subject = DB.getSubjectById(this.activeSubjectId);
    if (!subject) return;

    const churchSettings = DB.getSettings();
    const students = DB.getStudents().filter(s => s.stage === this.currentStage);
    const assessments = DB.getAssessmentsBySubject(this.activeSubjectId);
    const allGrades = DB.getGradesBySubject(this.activeSubjectId);

    const totalMaxScore = assessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0);
    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let rowsHtml = '';
    students.forEach((s, idx) => {
      let studentSum = 0;
      let hasAnyGrade = false;

      const lessonCells = assessments.map(a => {
        const g = allGrades.find(gr => gr.studentId === s.id && gr.assessmentItemId === a.id);
        if (g && g.score !== null) {
          studentSum += g.score;
          hasAnyGrade = true;
          return `<td style="text-align:center; padding:6px; border:1px solid #cbd5e1;">${g.score}</td>`;
        }
        return `<td style="text-align:center; padding:6px; border:1px solid #cbd5e1; color:#94a3b8;">—</td>`;
      }).join('');

      const percent = hasAnyGrade && totalMaxScore > 0 ? Math.round((studentSum / totalMaxScore) * 100) : 0;
      const percentStr = hasAnyGrade ? `${percent}%` : '—';
      const sumStr = hasAnyGrade ? studentSum : '—';

      rowsHtml += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding:7px; border:1px solid #cbd5e1; font-weight:bold;">${s.name}</td>
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-family:monospace;">${s.barcode || s.code}</td>
          ${lessonCells}
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3a8a;">${sumStr} / ${totalMaxScore}</td>
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-weight:bold; color:${percent >= 50 ? '#059669' : '#dc2626'};">${percentStr}</td>
        </tr>
      `;
    });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>تقرير درجات مادة: ${subject.name}</title>
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
          @page { size: A4 landscape; margin: 1.2cm; }
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 15px; color: #0f172a; }
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 19pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 13pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 7px; border: 1px solid #1e3a8a; font-size: 9.5pt; text-align: center; }
          td { font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">كشف تقييم ودرجات مادة: ${subject.name} (${subject.status === 'archived' ? 'أرشيف ' : ''}الدورة: ${subject.academicYear || 'عام'})</div>
          <div style="font-size: 10.5pt; color: #475569; margin-top: 5px;">المرحلة: ${subject.stage} | تاريخ الاستخراج: ${exportDateStr} | عدد المخدومين: ${students.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:35px;">#</th>
              <th>اسم المخدوم</th>
              <th>الباركود</th>
              ${assessments.map(a => `<th>${a.title}<br><span style="font-weight:normal; font-size:8pt;">(${a.maxScore})</span></th>`).join('')}
              <th>المجموع</th>
              <th>النسبة %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px;">لا توجد درجات مسجلة.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 40px; width: 100%;">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; text-align:right; width: 50%;"><strong>أمين الخدمة:</strong> ..............................</td>
              <td style="border:none; text-align:left; width: 50%;"><strong>توقيع المشرف المسؤول:</strong> ..............................</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const filename = `تقرير_مادة_${subject.name.replace(/\s+/g, '_')}_${this.currentStage.replace(/\s+/g, '_')}_${Utils.formatDate()}.doc`;
    Utils.downloadWordDocument(docHtml, filename);
    Utils.showToast(`تم تصدير تقرير مادة "${subject.name}" بنجاح!`, 'success');
  },

  // 2. تقرير شامل لطالب واحد
  exportSingleStudentReport(studentId) {
    const student = DB.getStudentById(studentId);
    if (!student) return;

    const churchSettings = DB.getSettings();
    const allSubjects = DB.getSubjects(true).filter(s => s.stage === student.stage);
    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let subjectsHtml = '';
    allSubjects.forEach((sub, sIdx) => {
      const assessments = DB.getAssessmentsBySubject(sub.id);
      const grades = DB.getGradesBySubject(sub.id).filter(g => g.studentId === student.id);
      const totalMax = assessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0);
      let studentSum = 0;
      let hasAny = false;

      const lessonsRows = assessments.map((a, lIdx) => {
        const g = grades.find(gr => gr.assessmentItemId === a.id);
        const score = g && g.score !== null ? g.score : 'لم ترصد';
        if (g && g.score !== null) {
          studentSum += g.score;
          hasAny = true;
        }
        return `
          <tr>
            <td style="text-align:center; padding:6px; border:1px solid #cbd5e1;">${lIdx + 1}</td>
            <td style="padding:6px; border:1px solid #cbd5e1;">${a.partName || 'العام'}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold;">${a.title}</td>
            <td style="text-align:center; padding:6px; border:1px solid #cbd5e1;">${a.maxScore}</td>
            <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3a8a;">${score}</td>
            <td style="padding:6px; border:1px solid #cbd5e1; color:#64748b; font-size:8.5pt;">${g ? (g.notes || '') : ''}</td>
          </tr>
        `;
      }).join('');

      const percent = hasAny && totalMax > 0 ? Math.round((studentSum / totalMax) * 100) : 0;

      subjectsHtml += `
        <div style="margin-top: 25px; border: 2px solid #1e3a8a; border-radius: 8px; padding: 12px; page-break-inside: avoid;">
          <h3 style="margin: 0 0 8px 0; color: #1e3a8a; border-bottom: 2px solid #b45309; padding-bottom: 4px; display: flex; justify-content: space-between;">
            <span>[${sIdx + 1}] مادة: ${sub.name} (${sub.academicYear || 'عام'}) ${sub.status === 'archived' ? '• [مؤرشفة]' : ''}</span>
            <span style="font-size: 11pt; color: #059669;">المجموع: ${hasAny ? studentSum : 0} من ${totalMax} (${percent}%)</span>
          </h3>

          <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 6px; border: 1px solid #cbd5e1; width:35px;">#</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الجزء</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">الدرس / عنصر التقييم</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width:65px;">العظمى</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1; width:75px;">درجة الطالب</th>
                <th style="padding: 6px; border: 1px solid #cbd5e1;">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${lessonsRows || '<tr><td colspan="6" style="text-align:center; padding:10px; color:#94a3b8;">لا توجد دروس مضافة لهذه المادة.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>شهادة وبيان درجات مخدوم: ${student.name}</title>
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
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 19pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 13pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          .info-card { border: 2px solid #cbd5e1; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 6px; border: 1px solid #1e3a8a; font-size: 9.5pt; text-align: center; }
          td { font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">كشف وبيان درجات المخدوم الشامل لجميع المواد</div>
          <div style="font-size: 10pt; color: #475569; margin-top: 4px;">تاريخ الاستخراج: ${exportDateStr}</div>
        </div>

        <div class="info-card">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; width: 50%;"><strong>اسم المخدوم:</strong> ${student.name}</td>
              <td style="border:none; width: 50%;"><strong>الباركود:</strong> ${student.barcode || student.code}</td>
            </tr>
            <tr>
              <td style="border:none;"><strong>المرحلة:</strong> ${student.stage}</td>
              <td style="border:none;"><strong>رقم الهاتف:</strong> ${student.phone || 'غير مسجل'}</td>
            </tr>
          </table>
        </div>

        <h3 style="color:#1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; margin-top: 15px;">
          بيان الدرجات والتقييمات التفصيلية:
        </h3>
        ${subjectsHtml || '<p style="text-align:center; padding:20px; color:#94a3b8;">لا توجد مواد دراسية مسجلة لهذه المرحلة بعد.</p>'}

        <div style="margin-top: 45px; width: 100%; page-break-inside: avoid;">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; text-align:right; width: 50%;"><strong>أمين الخدمة:</strong> ..............................</td>
              <td style="border:none; text-align:left; width: 50%;"><strong>توقيع كاهن الكنيسة المشرف:</strong> ..............................</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const filename = `شهادة_درجات_${student.name.replace(/\s+/g, '_')}_${Utils.formatDate()}.doc`;
    Utils.downloadWordDocument(docHtml, filename);
    Utils.showToast(`تم تصدير تقرير درجات الطالب "${student.name}" بنجاح!`, 'success');
  },

  // 3. تقرير مرحلة كاملة (جميع مواد المرحلة ودرجات طلابها)
  exportStageFullReport() {
    const churchSettings = DB.getSettings();
    const students = DB.getStudents().filter(s => s.stage === this.currentStage);
    const subjects = DB.getSubjects(true).filter(s => s.stage === this.currentStage);

    if (students.length === 0 || subjects.length === 0) {
      alert('لا توجد بيانات طلاب أو مواد كافية في هذه المرحلة لاستخراج التقرير!');
      return;
    }

    const exportDateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let rowsHtml = '';
    students.forEach((s, idx) => {
      let stageGrandTotal = 0;
      let stageMaxGrandTotal = 0;

      const subjectCells = subjects.map(sub => {
        const assessments = DB.getAssessmentsBySubject(sub.id);
        const grades = DB.getGradesBySubject(sub.id).filter(g => g.studentId === s.id);
        const subMax = assessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0);
        stageMaxGrandTotal += subMax;

        let subSum = 0;
        let hasAny = false;
        assessments.forEach(a => {
          const g = grades.find(gr => gr.assessmentItemId === a.id);
          if (g && g.score !== null) {
            subSum += g.score;
            hasAny = true;
          }
        });

        if (hasAny) stageGrandTotal += subSum;

        return `<td style="text-align:center; padding:6px; border:1px solid #cbd5e1;">${hasAny ? subSum : '—'} / ${subMax}</td>`;
      }).join('');

      const percent = stageMaxGrandTotal > 0 ? Math.round((stageGrandTotal / stageMaxGrandTotal) * 100) : 0;

      rowsHtml += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding:7px; border:1px solid #cbd5e1; font-weight:bold;">${s.name}</td>
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-family:monospace;">${s.barcode || s.code}</td>
          ${subjectCells}
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-weight:bold; color:#1e3a8a;">${stageGrandTotal} / ${stageMaxGrandTotal}</td>
          <td style="text-align:center; padding:7px; border:1px solid #cbd5e1; font-weight:bold; color:${percent >= 50 ? '#059669' : '#dc2626'};">${percent}%</td>
        </tr>
      `;
    });

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>تقرير درجات مرحلة: ${this.currentStage}</title>
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
          @page { size: A4 landscape; margin: 1.2cm; }
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 15px; color: #0f172a; }
          .header-box { text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 19pt; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 13pt; color: #b45309; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #1e3a8a; color: #ffffff; padding: 7px; border: 1px solid #1e3a8a; font-size: 9.5pt; text-align: center; }
          td { font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${churchSettings.churchName || 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين'}</div>
          <div class="subtitle">التقرير العام المجمع لدرجات جميع المواد — مرحلة: ${this.currentStage}</div>
          <div style="font-size: 10.5pt; color: #475569; margin-top: 5px;">تاريخ الاستخراج: ${exportDateStr} | عدد المخدومين: ${students.length} | عدد المواد: ${subjects.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:35px;">#</th>
              <th>اسم المخدوم</th>
              <th>الباركود</th>
              ${subjects.map(s => `<th>${s.name}<br><span style="font-weight:normal; font-size:8pt;">(${s.academicYear || ''})</span></th>`).join('')}
              <th>المجموع العام</th>
              <th>النسبة %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 40px; width: 100%;">
          <table style="border:none; width: 100%;">
            <tr>
              <td style="border:none; text-align:right; width: 50%;"><strong>أمين الخدمة:</strong> ..............................</td>
              <td style="border:none; text-align:left; width: 50%;"><strong>توقيع كاهن الكنيسة المشرف:</strong> ..............................</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const filename = `تقرير_شامل_مرحلة_${this.currentStage.replace(/\s+/g, '_')}_${Utils.formatDate()}.doc`;
    Utils.downloadWordDocument(docHtml, filename);
    Utils.showToast(`تم تصدير التقرير الشامل لمرحلة "${this.currentStage}" بنجاح!`, 'success');
  },

  // ==========================================
  // 7. نافذة عرض درجات مخدوم معين من قسم التقييمات
  // ==========================================
  openStudentGradesModal(studentId) {
    const student = DB.getStudentById(studentId);
    if (!student) return;

    const modal = document.getElementById('eval-student-grades-modal');
    const nameEl = document.getElementById('modal-student-name');
    const subinfoEl = document.getElementById('modal-student-subinfo');
    const contentEl = document.getElementById('modal-student-grades-content');

    if (!modal || !contentEl) return;

    nameEl.textContent = `سجل درجات: ${student.name}`;
    subinfoEl.textContent = `المرحلة: ${student.stage} | الباركود / الكود: ${student.barcode || student.code || 'بدون'}`;

    const subjects = DB.getSubjects(true).filter(s => s.stage === student.stage);

    if (subjects.length === 0) {
      contentEl.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
          لا توجد مواد مضافة لمرحلة هذا المخدوم (${student.stage}) حتى الآن.
        </div>
      `;
      modal.style.display = 'flex';
      return;
    }

    let grandTotalEarned = 0;
    let grandTotalMax = 0;

    const subjectsHtml = subjects.map(sub => {
      const assessments = DB.getAssessmentsBySubject(sub.id);
      const grades = DB.getGradesBySubject(sub.id).filter(g => g.studentId === student.id);
      const subMax = assessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0);
      let subEarned = 0;
      let hasAny = false;

      grandTotalMax += subMax;

      const lessonsRows = assessments.map((a, idx) => {
        const g = grades.find(gr => gr.assessmentItemId === a.id);
        const score = g && g.score !== null ? g.score : null;
        if (score !== null) {
          subEarned += score;
          hasAny = true;
          grandTotalEarned += score;
        }

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.4rem 0.6rem; text-align: center;">${idx + 1}</td>
            <td style="padding: 0.4rem 0.6rem;">${Utils.sanitize(a.partName || 'الجزء الأول')}</td>
            <td style="padding: 0.4rem 0.6rem; font-weight: 600;">${Utils.sanitize(a.title)}</td>
            <td style="padding: 0.4rem 0.6rem; text-align: center; font-weight: bold; color: ${score !== null ? 'var(--primary)' : 'var(--text-muted)'};">
              ${score !== null ? score : 'لم ترصد بعد'}
            </td>
            <td style="padding: 0.4rem 0.6rem; text-align: center;">${a.maxScore}</td>
            <td style="padding: 0.4rem 0.6rem; font-size: 0.82rem; color: var(--text-muted);">${g ? Utils.sanitize(g.notes) : '-'}</td>
          </tr>
        `;
      }).join('');

      const percent = subMax > 0 && hasAny ? Math.round((subEarned / subMax) * 100) : 0;

      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.6rem;">
            <strong style="color: var(--primary); font-size: 1.05rem;">📖 ${Utils.sanitize(sub.name)}</strong>
            <div style="display: flex; gap: 0.8rem; align-items: center;">
              <span style="font-weight: 800; font-size: 0.95rem;">المجموع: ${hasAny ? subEarned : 0} من ${subMax}</span>
              <span class="badge" style="background: ${percent >= 50 ? 'var(--success-light)' : 'var(--danger-light)'}; color: ${percent >= 50 ? 'var(--success)' : 'var(--danger)'};">
                ${hasAny ? percent + '%' : 'غير مسجل'}
              </span>
            </div>
          </div>

          ${assessments.length === 0 ? `
            <div style="padding: 0.8rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              لا توجد دروس أو عناصر تقييم مضافة داخل هذه المادة.
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                  <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                    <th style="padding: 0.4rem; text-align: center; width: 35px;">#</th>
                    <th style="padding: 0.4rem;">الجزء</th>
                    <th style="padding: 0.4rem;">الدرس / عنصر التقييم</th>
                    <th style="padding: 0.4rem; text-align: center;">الدرجة</th>
                    <th style="padding: 0.4rem; text-align: center;">العظمى</th>
                    <th style="padding: 0.4rem;">الملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  ${lessonsRows}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    }).join('');

    const grandPercent = grandTotalMax > 0 ? Math.round((grandTotalEarned / grandTotalMax) * 100) : 0;

    contentEl.innerHTML = `
      <div style="background: rgba(30, 58, 138, 0.08); border: 2px solid var(--primary); border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1.2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem;">
        <div>
          <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">المجموع العام في جميع المواد:</span>
          <strong style="font-size: 1.3rem; color: var(--primary); font-weight: 900;">${grandTotalEarned} <span style="font-size: 0.95rem; font-weight: normal;">من</span> ${grandTotalMax}</strong>
        </div>
        <div>
          <span class="badge" style="font-size: 0.95rem; padding: 0.3rem 0.8rem; font-weight: 800; background: ${grandPercent >= 50 ? 'var(--success)' : 'var(--danger)'}; color: #fff;">
            النسبة العامة: ${grandPercent}%
          </span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${subjectsHtml}
      </div>
    `;

    modal.style.display = 'flex';
  },

  closeStudentGradesModal() {
    const modal = document.getElementById('eval-student-grades-modal');
    if (modal) modal.style.display = 'none';
  }
};

window.EvaluationsManager = EvaluationsManager;
document.addEventListener('DOMContentLoaded', () => {
  EvaluationsManager.init();
});

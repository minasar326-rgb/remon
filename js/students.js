/**
 * Students Directory, Smart Barcode Capture & Auto Stage Detection
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const StudentsManager = {
  html5QrCodeModal: null,
  isModalScannerOpen: false,

  init() {
    this.renderStudentsList();
    this.initFilterAndSearch();
  },

  initFilterAndSearch() {
    const searchInput = document.getElementById('students-search');
    const stageFilter = document.getElementById('students-stage-filter');

    const filterHandler = () => {
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const stage = stageFilter ? stageFilter.value : '';
      this.renderStudentsList(query, stage);
    };

    if (searchInput) searchInput.addEventListener('input', filterHandler);
    if (stageFilter) stageFilter.addEventListener('change', filterHandler);
  },

  renderStudentsList(query = '', stageFilter = '') {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    let students = DB.getStudents();

    if (query) {
      students = students.filter(s => 
        s.name.toLowerCase().includes(query) || 
        (s.barcode && s.barcode.toLowerCase().includes(query)) ||
        (s.code && s.code.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query))
      );
    }

    if (stageFilter) {
      students = students.filter(s => s.stage === stageFilter);
    }

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 1rem;">لا يوجد مخدومين مسجلين حالياً. اضغط على زر <strong>إضافة مخدوم وتصوير الباركود</strong> للبدء.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map((s, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>
          <a href="student.html?id=${s.id}" style="font-weight: 700; color: var(--primary);">
            ${Utils.sanitize(s.name)}
          </a>
        </td>
        <td>
          <strong style="font-family: monospace; font-size: 1rem; background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px dashed var(--accent-gold);">
            📟 ${s.barcode || s.code}
          </strong>
        </td>
        <td><span class="stat-badge" style="background: var(--primary-light); color: var(--primary); font-weight:bold;">${Utils.sanitize(s.stage)}</span></td>
        <td>${Utils.sanitize(s.group || '—')}</td>
        <td>${Utils.sanitize(s.phone || '—')}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;" onclick="ReportsManager.exportStudentWordReport('${s.id}')" title="تصدير Word للطالب">
              📥 Word
            </button>
            <a href="student.html?id=${s.id}" class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;" title="عرض الكارنيه">
              📄 الكارنيه
            </a>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;" onclick="StudentsManager.openEditModal('${s.id}')" title="تعديل">
              ✏️
            </button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; color: var(--danger); font-weight:bold;" onclick="StudentsManager.deleteStudent('${s.id}')" title="حذف نهائي">
              🗑️ مسح
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openAddModal() {
    const modal = document.getElementById('student-modal');
    if (!modal) return;
    document.getElementById('modal-student-id').value = '';
    document.getElementById('modal-student-name').value = '';
    document.getElementById('modal-student-barcode').value = '';
    document.getElementById('modal-student-stage').value = 'أولى إعداد خدام';
    document.getElementById('modal-student-group').value = '';
    document.getElementById('modal-student-phone').value = '';
    document.getElementById('modal-student-notes').value = '';
    document.getElementById('student-modal-title').textContent = 'إضافة مخدوم جديد مع تصوير الباركود';
    
    const camRegion = document.getElementById('modal-scanner-area');
    if (camRegion) camRegion.style.display = 'none';

    modal.classList.add('open');
  },

  async startBarcodeCapture() {
    const camRegion = document.getElementById('modal-scanner-area');
    if (!camRegion) return;
    camRegion.style.display = 'block';

    if (this.isModalScannerOpen) return;

    try {
      if (!window.Html5Qrcode) {
        Utils.showToast('مكتبة الكاميرا غير جاهزة، تأكد من الاتصال بالإنترنت', 'error');
        return;
      }

      this.html5QrCodeModal = new Html5Qrcode('modal-qr-reader');
      const config = {
        fps: 25,
        qrbox: { width: 250, height: 160 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
      };

      await this.html5QrCodeModal.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => this.handleCapturedBarcode(decodedText),
        () => {}
      );

      this.isModalScannerOpen = true;
      Utils.showToast('وجه الكاميرا نحو الباركود...', 'info');
    } catch (err) {
      console.error('Camera open error in modal:', err);
      Utils.showToast('تعذر فتح الكاميرا! تأكد من إعطاء إذن الوصول للكاميرا.', 'error');
    }
  },

  async stopBarcodeCapture() {
    if (this.html5QrCodeModal && this.isModalScannerOpen) {
      try {
        await this.html5QrCodeModal.stop();
        this.html5QrCodeModal.clear();
      } catch (e) {}
      this.isModalScannerOpen = false;
    }
    const camRegion = document.getElementById('modal-scanner-area');
    if (camRegion) camRegion.style.display = 'none';
  },

  // دالة الذكاء الاصطناعي لاكتشاف المرحلة تلقائياً من كود الباركود أو النص
  detectStageFromBarcodeData(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. فحص الكلمات الصريحة في نص الباركود
    if (text.includes('ابتدائي') || lower.includes('primary') || lower.includes('elem')) {
      return 'ابتدائي (المرحلة الابتدائية بالكامل)';
    }
    if (text.includes('أولى') || text.includes('اولى') || lower.includes('first') || lower.includes('1st') || text.includes('سنة أولى')) {
      return 'أولى إعداد خدام';
    }
    if (text.includes('تانية') || text.includes('ثانية') || lower.includes('second') || lower.includes('2nd') || text.includes('سنة تانية')) {
      return 'تانية إعداد خدام';
    }
    if (text.includes('تالتة') || text.includes('ثالثة') || lower.includes('third') || lower.includes('3rd') || text.includes('سنة تالتة')) {
      return 'تالتة إعداد خدام';
    }

    // 2. فحص الأرقام والبادئات (مثال: الباركود الذي يبدأ بـ 1 أو 101 لأولى، 2 أو 102 لتانية، 3 أو 103 لتالتة، 0 أو 4 أو 100 لابتدائي)
    const cleanNumbers = text.replace(/[^0-9]/g, '');
    if (cleanNumbers.length >= 3) {
      if (cleanNumbers.startsWith('101') || cleanNumbers.startsWith('11') || cleanNumbers.startsWith('1')) {
        return 'أولى إعداد خدام';
      }
      if (cleanNumbers.startsWith('102') || cleanNumbers.startsWith('22') || cleanNumbers.startsWith('2')) {
        return 'تانية إعداد خدام';
      }
      if (cleanNumbers.startsWith('103') || cleanNumbers.startsWith('33') || cleanNumbers.startsWith('3')) {
        return 'تالتة إعداد خدام';
      }
      if (cleanNumbers.startsWith('100') || cleanNumbers.startsWith('4') || cleanNumbers.startsWith('0')) {
        return 'ابتدائي (المرحلة الابتدائية بالكامل)';
      }
    }

    return null;
  },

  handleCapturedBarcode(decodedText) {
    if (!decodedText) return;
    const cleanText = decodedText.trim();

    Utils.playBeep('success');
    Utils.vibrate([100, 50, 100]);

    this.stopBarcodeCapture();

    let studentName = '';
    let barcodeValue = cleanText;
    let detectedStage = this.detectStageFromBarcodeData(cleanText);
    let phoneValue = '';

    // محاولة فك JSON إن وجد
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.name) studentName = parsed.name;
      if (parsed.barcode || parsed.code || parsed.id) barcodeValue = parsed.barcode || parsed.code || parsed.id;
      if (parsed.stage) detectedStage = parsed.stage;
      if (parsed.phone) phoneValue = parsed.phone;
    } catch (e) {
      // فحص النصوص المفصولة بفاصلة أو شرطة
      if (cleanText.includes('-') || cleanText.includes('|') || cleanText.includes(',')) {
        const parts = cleanText.split(/[-|,]/).map(p => p.trim());
        parts.forEach(part => {
          if (/^\d+$/.test(part) || /^ABS-\d+$/i.test(part)) {
            barcodeValue = part;
          } else if (part.length > 2 && !studentName) {
            studentName = part;
          }
        });
      }
    }

    // إذا لم تُكتشف المرحلة بعد، افحص قيمة الباركود الناتجة نفسها
    if (!detectedStage) {
      detectedStage = this.detectStageFromBarcodeData(barcodeValue);
    }

    const barcodeInput = document.getElementById('modal-student-barcode');
    const nameInput = document.getElementById('modal-student-name');
    const stageInput = document.getElementById('modal-student-stage');
    const phoneInput = document.getElementById('modal-student-phone');

    if (barcodeInput) barcodeInput.value = barcodeValue;
    if (nameInput && studentName) nameInput.value = studentName;
    if (stageInput && detectedStage) {
      stageInput.value = detectedStage;
    }
    if (phoneInput && phoneValue) phoneInput.value = phoneValue;

    Utils.showToast(`تم قراءة الباركود (${barcodeValue}) وتحديد المرحلة تلقائياً: ${detectedStage || 'المحددة'}`, 'success');
  },

  openEditModal(id) {
    const s = DB.getStudentById(id);
    if (!s) return;
    const modal = document.getElementById('student-modal');
    if (!modal) return;

    document.getElementById('modal-student-id').value = s.id;
    document.getElementById('modal-student-name').value = s.name;
    document.getElementById('modal-student-barcode').value = s.barcode || s.code || '';
    document.getElementById('modal-student-stage').value = s.stage;
    document.getElementById('modal-student-group').value = s.group || '';
    document.getElementById('modal-student-phone').value = s.phone || '';
    document.getElementById('modal-student-notes').value = s.notes || '';
    document.getElementById('student-modal-title').textContent = 'تعديل بيانات وباركود المخدوم';

    const camRegion = document.getElementById('modal-scanner-area');
    if (camRegion) camRegion.style.display = 'none';

    modal.classList.add('open');
  },

  closeModal() {
    this.stopBarcodeCapture();
    const modal = document.getElementById('student-modal');
    if (modal) modal.classList.remove('open');
  },

  saveStudentFromModal() {
    const id = document.getElementById('modal-student-id').value;
    const name = document.getElementById('modal-student-name').value.trim();
    const barcode = document.getElementById('modal-student-barcode').value.trim().toUpperCase();
    const stage = document.getElementById('modal-student-stage').value;
    const group = document.getElementById('modal-student-group').value.trim();
    const phone = document.getElementById('modal-student-phone').value.trim();
    const notes = document.getElementById('modal-student-notes').value.trim();

    if (!name || !barcode) {
      Utils.showToast('يرجى كتابة أو تصوير اسم المخدوم ورقم الباركود!', 'warning');
      return;
    }

    const existing = DB.getStudents().find(s => 
      ((s.barcode && s.barcode.toUpperCase() === barcode) || (s.code && s.code.toUpperCase() === barcode)) && 
      s.id !== id
    );
    if (existing) {
      Utils.showToast(`رقم الباركود (${barcode}) مستخدم بالفعل للمخدوم: ${existing.name}!`, 'error');
      return;
    }

    const saved = DB.saveStudent({ id, name, barcode, code: barcode, stage, group, phone, notes });
    Activity.log(id ? 'تعديل مخدوم' : 'إضافة مخدوم', `تم حفظ بيانات المخدوم ${saved.name} بباركود (${saved.barcode}) في مرحلة (${saved.stage}).`);
    Utils.showToast(`تم حفظ المخدوم ${saved.name} بنجاح!`, 'success');
    this.closeModal();
    this.renderStudentsList();
  },

  // مسح نهائي 100% ولا يرجع أبداً
  deleteStudent(id) {
    const s = DB.getStudentById(id);
    if (!s) return;
    if (confirm(`تأكيد المسح النهائي:\nهل أنت متأكد من مسح المخدوم "${s.name}" نهائياً من النظام؟\n(لن يعود مجدداً إلا إذا قمت بإضافته بنفسك)`)) {
      DB.deleteStudent(id);
      Activity.log('مسح مخدوم نهائياً', `تم مسح المخدوم ${s.name} (${s.barcode || s.code}) نهائياً من قاعدة البيانات.`);
      Utils.showToast(`تم مسح المخدوم "${s.name}" نهائياً ولن يظهر مجدداً.`, 'info');
      this.renderStudentsList();
    }
  },

  exportAllStudentsIndividually() {
    const students = DB.getStudents();
    if (students.length === 0) {
      Utils.showToast('لا يوجد طلاب لتصدير ملفاتهم!', 'warning');
      return;
    }

    if (confirm(`هل ترغب في تصدير ملف Word فردي منفصل لكل مخدوم من الـ (${students.length}) المسجلين؟`)) {
      students.forEach((s, idx) => {
        setTimeout(() => {
          ReportsManager.exportStudentWordReport(s.id);
        }, idx * 600);
      });
      Utils.showToast(`جاري تحميل ${students.length} ملف Word فردي...`, 'success');
    }
  }
};

window.StudentsManager = StudentsManager;

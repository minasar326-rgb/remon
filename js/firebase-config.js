/**
 * Local-First + Firebase Real-time Cloud Synchronization Engine (Zero Latency 0ms)
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 * متزامن لحظياً في نفس الثانية بين آلاف الأجهزة عبر Firebase Firestore
 */

// Firebase Configuration Provided by the User
const firebaseConfig = {
  apiKey: "AIzaSyDiKgedjCUpuGOvINKLORqERaZQm8aDPOg",
  authDomain: "abo-sefen-d143a.firebaseapp.com",
  projectId: "abo-sefen-d143a",
  storageBucket: "abo-sefen-d143a.firebasestorage.app",
  messagingSenderId: "134704340215",
  appId: "1:134704340215:web:4289198678f346926a87f2",
  measurementId: "G-ZVDKZ5Z89F"
};

const DB = {
  STORAGE_KEYS: {
    STUDENTS: 'abs_db_students',
    ATTENDANCE: 'abs_db_attendance',
    SETTINGS: 'abs_db_settings',
    AUDIT: 'abs_db_audit_logs',
    INITIALIZED: 'abs_db_is_initialized',
    CONFESSIONS: 'abs_db_confessions',
    SUBJECTS: 'abs_db_subjects',
    ASSESSMENTS: 'abs_db_assessments',
    GRADES: 'abs_db_grades',
    SCHEDULE: 'abs_db_attendance_schedule'
  },

  STAGES: [
    'ابتدائي (المرحلة الابتدائية بالكامل)',
    'أولى إعداد خدام',
    'تانية إعداد خدام',
    'تالتة إعداد خدام'
  ],

  PERIODS: {
    'الخميس': ['تسبحة', 'محاضرة', 'نوتة روحية'],
    'الجمعة': ['قداس', 'محاضرة']
  },

  firebaseApp: null,
  firestore: null,
  firestoreSdk: null,
  isCloudConnected: false,
  cloudError: null,
  _listenersAttached: false,

  initDatabase() {
    // 1. Initial local storage setup
    if (!localStorage.getItem(this.STORAGE_KEYS.INITIALIZED)) {
      if (!localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) {
        localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      }
      localStorage.setItem(this.STORAGE_KEYS.INITIALIZED, 'true');
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE)) {
      localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) {
      const defaultSettings = {
        churchName: 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين',
        serviceName: 'اجتماع إعداد الخدام ومدارس الأحد (خميس وجمعة)',
        adminUsername: 'admin',
        adminPassword: '123',
        churchLeader: 'أمين إعداد الخدام',
        scanCooldownSeconds: 4
      };
      localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }

    // 2. Connect to Firebase in background without blocking rendering
    this.connectFirebase();
  },

  notifyCloudStatus(connected, error = null) {
    this.isCloudConnected = connected;
    this.cloudError = error;
    window.dispatchEvent(new CustomEvent('abs-cloud-status', {
      detail: { connected, error, projectId: firebaseConfig.projectId }
    }));
  },

  async connectFirebase() {
    try {
      // Dynamic import of Firebase SDK (Modular v11)
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js");
      const { 
        initializeFirestore,
        getFirestore, 
        collection, 
        doc, 
        getDoc, 
        getDocs, 
        setDoc, 
        deleteDoc, 
        onSnapshot, 
        writeBatch 
      } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js");

      this.firebaseApp = initializeApp(firebaseConfig);
      try {
        this.firestore = initializeFirestore(this.firebaseApp, {
          experimentalAutoDetectLongPolling: true
        });
      } catch (e) {
        this.firestore = getFirestore(this.firebaseApp);
      }
      this.firestoreSdk = { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch };

      console.log("🔥 [Firebase] تهيئة SDK لمشروع كنيسة أبي سيفين (abo-sefen-d143a)...");

      // Start Real-time synchronization stream
      this.attachRealtimeListeners();
    } catch (err) {
      console.warn("⚠️ [Firebase] خطأ في تحميل مكتبة Firebase:", err);
      this.notifyCloudStatus(false, err.message);
    }
  },

  // مزامنة لحظية في نفس الثانية عبر onSnapshot لكافة الأجهزة
  attachRealtimeListeners() {
    if (this._listenersAttached || !this.firestore || !this.firestoreSdk) return;
    this._listenersAttached = true;

    const { collection, doc, setDoc, onSnapshot } = this.firestoreSdk;

    // 1. مزامنة الطلاب المباشرة
    const studentsColl = collection(this.firestore, "students");
    onSnapshot(studentsColl, (snapshot) => {
      this.notifyCloudStatus(true);
      const remoteStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // حفظ ما في السحابة مباشرة في الذاكرة المحلية (حتى لو أصبحت فارغة بعد المسح)
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(remoteStudents));
      console.log(`🔄 [Firebase Live Sync] تم مزامنة ${remoteStudents.length} مخدوم من السحابة في نفس اللحظة!`);

      window.dispatchEvent(new CustomEvent('abs-students-updated', { detail: remoteStudents }));
      if (window.StudentsManager && typeof StudentsManager.renderStudentsList === 'function') {
        StudentsManager.renderStudentsList();
      }
      if (window.AttendanceManager && typeof AttendanceManager.renderAttendanceTable === 'function') {
        AttendanceManager.renderAttendanceTable();
        AttendanceManager.updateHeaderSummary();
      }
      if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
      }
      if (window.ReportsManager && typeof ReportsManager.renderMatrixReport === 'function') {
        ReportsManager.renderMatrixReport();
      }
    }, (err) => {
      console.warn("⚠️ [Firebase Students Sync Warning]:", err.message);
      this.notifyCloudStatus(false, err.message);
    });

    // 2. مزامنة سجلات الحضور المباشرة
    const attendanceColl = collection(this.firestore, "attendance");
    onSnapshot(attendanceColl, (snapshot) => {
      this.notifyCloudStatus(true);
      const remoteAttendance = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(remoteAttendance));
      console.log(`🔄 [Firebase Live Sync] تم مزامنة ${remoteAttendance.length} عملية حضور وغياب لحظياً!`);

      window.dispatchEvent(new CustomEvent('abs-attendance-updated', { detail: remoteAttendance }));
      if (window.AttendanceManager && typeof AttendanceManager.renderAttendanceTable === 'function') {
        AttendanceManager.renderAttendanceTable();
        AttendanceManager.updateHeaderSummary();
      }
      if (typeof loadDashboardStats === 'function') {
        loadDashboardStats();
        if (typeof loadLiveFeed === 'function') loadLiveFeed();
        if (typeof updateChartData === 'function') updateChartData();
      }
      if (window.ReportsManager && typeof ReportsManager.renderMatrixReport === 'function') {
        ReportsManager.renderMatrixReport();
      }
    }, (err) => {
      console.warn("⚠️ [Firebase Attendance Sync Warning]:", err.message);
      this.notifyCloudStatus(false, err.message);
    });

    // 3. مزامنة الإعدادات العامة
    const settingsColl = collection(this.firestore, "settings");
    onSnapshot(settingsColl, (snapshot) => {
      snapshot.docs.forEach(docSnap => {
        if (docSnap.id === 'general') {
          const remoteSettings = docSnap.data();
          const current = DB.getSettings();
          localStorage.setItem(DB.STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...remoteSettings }));
          if (window.SettingsManager && typeof SettingsManager.loadSettings === 'function') {
            SettingsManager.loadSettings();
          }
        }
      });
    }, (err) => {});

    // 4. مزامنة الاعتراف الشهري اللحظية
    const confessionsColl = collection(this.firestore, "confessions");
    onSnapshot(confessionsColl, (snapshot) => {
      const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem(this.STORAGE_KEYS.CONFESSIONS, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('abs-confessions-updated', { detail: remote }));
      if (window.AttendanceManager && typeof AttendanceManager.renderAttendanceTable === 'function') {
        AttendanceManager.renderAttendanceTable();
      }
      if (window.ConfessionReportsManager && typeof ConfessionReportsManager.renderReports === 'function') {
        ConfessionReportsManager.renderReports();
      }
    }, (err) => {});

    // 5. مزامنة المواد الدراسية اللحظية
    const subjectsColl = collection(this.firestore, "subjects");
    onSnapshot(subjectsColl, (snapshot) => {
      const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem(this.STORAGE_KEYS.SUBJECTS, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('abs-subjects-updated', { detail: remote }));
      if (window.EvaluationsManager && typeof EvaluationsManager.renderSubjectsList === 'function') {
        EvaluationsManager.renderSubjectsList();
      }
    }, (err) => {});

    // 6. مزامنة الأجزاء والدروس اللحظية
    const assessmentsColl = collection(this.firestore, "assessments");
    onSnapshot(assessmentsColl, (snapshot) => {
      const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem(this.STORAGE_KEYS.ASSESSMENTS, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('abs-assessments-updated', { detail: remote }));
      if (window.EvaluationsManager && typeof EvaluationsManager.renderActiveLessonView === 'function') {
        EvaluationsManager.renderActiveLessonView();
      }
    }, (err) => {});

    // 7. مزامنة درجات الطلاب اللحظية
    const gradesColl = collection(this.firestore, "grades");
    onSnapshot(gradesColl, (snapshot) => {
      const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem(this.STORAGE_KEYS.GRADES, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('abs-grades-updated', { detail: remote }));
      if (window.EvaluationsManager && typeof EvaluationsManager.renderGradesSheet === 'function') {
        EvaluationsManager.renderGradesSheet();
      }
    }, (err) => {});

    // 8. مزامنة مواعيد تسجيل الحضور
    const scheduleColl = collection(this.firestore, "schedule");
    onSnapshot(scheduleColl, (snapshot) => {
      snapshot.docs.forEach(docSnap => {
        if (docSnap.id === 'general') {
          const remoteSchedule = docSnap.data();
          localStorage.setItem(DB.STORAGE_KEYS.SCHEDULE, JSON.stringify(remoteSchedule));
          window.dispatchEvent(new CustomEvent('abs-schedule-updated', { detail: remoteSchedule }));
          if (window.SettingsManager && typeof SettingsManager.loadScheduleSettings === 'function') {
            SettingsManager.loadScheduleSettings();
          }
        }
      });
    }, (err) => {});
  },

  getStudents() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    } catch (e) { return []; }
  },

  getStudentById(id) {
    return this.getStudents().find(s => s.id === id);
  },

  getStudentByCodeOrBarcode(query) {
    if (!query) return null;
    const clean = query.trim().toUpperCase();
    return this.getStudents().find(s => 
      (s.code && s.code.trim().toUpperCase() === clean) ||
      (s.barcode && s.barcode.trim().toUpperCase() === clean)
    );
  },

  // حفظ محلي فوري 0ms ومزامنة سحابية مع الفايربيز فوراً
  saveStudent(student) {
    const students = this.getStudents();
    student.barcode = (student.barcode || student.code || '').trim();
    student.code = (student.code || student.barcode || '').trim();
    
    student.id = student.id || Utils.generateUUID();
    student.updatedAt = Date.now();

    const index = students.findIndex(s => s.id === student.id);
    if (index >= 0) {
      students[index] = { ...students[index], ...student };
    } else {
      student.createdAt = Date.now();
      students.unshift(student);
    }
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    // مزامنة فورية مع Cloud Firestore
    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const studentRef = doc(this.firestore, "students", student.id);
        const cleanPayload = JSON.parse(JSON.stringify(student));
        setDoc(studentRef, cleanPayload, { merge: true }).catch(err => {
          console.warn("Cloud student sync error:", err);
          this.notifyCloudStatus(false, err.message);
        });
      } catch (e) {}
    }

    return student;
  },

  // حذف نهائي محلياً وسحابياً في نفس اللحظة
  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => s.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    let attendance = this.getAttendance();
    attendance = attendance.filter(a => a.studentId !== id);
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));

    // حذف فوري من Cloud Firestore
    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, deleteDoc } = this.firestoreSdk;
        const studentRef = doc(this.firestore, "students", id);
        deleteDoc(studentRef).catch(err => console.warn("Cloud delete student error:", err));
      } catch (e) {}
    }

    // إشعار فوري للواجهات في نفس المتصفح
    window.dispatchEvent(new CustomEvent('abs-students-updated', { detail: students }));
    if (window.StudentsManager && typeof StudentsManager.renderStudentsList === 'function') {
      StudentsManager.renderStudentsList();
    }
    if (typeof loadDashboardStats === 'function') {
      loadDashboardStats();
    }
  },

  getAttendance() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ATTENDANCE)) || [];
    } catch (e) { return []; }
  },

  recordAttendance(record) {
    const records = this.getAttendance();
    const newRecord = {
      id: Utils.generateUUID(),
      studentId: record.studentId,
      studentCode: record.studentCode,
      barcode: record.barcode || record.studentCode,
      studentName: record.studentName,
      stage: record.stage,
      date: record.date || Utils.formatDate(),
      dayName: record.dayName || Utils.getArabicDayName(record.date),
      period: record.period,
      timestamp: Date.now(),
      supervisor: (window.Auth && Auth.getCurrentUser()?.name) || 'مشرف النظام',
      method: record.method || 'ماسح الباركود / الكارنيه'
    };
    records.unshift(newRecord);
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

    // مزامنة فورية لسجل الحضور مع Cloud Firestore
    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const recordRef = doc(this.firestore, "attendance", newRecord.id);
        const cleanPayload = JSON.parse(JSON.stringify(newRecord));
        setDoc(recordRef, cleanPayload).catch(err => {
          console.warn("Cloud attendance sync error:", err);
          this.notifyCloudStatus(false, err.message);
        });
      } catch (e) {}
    }

    return newRecord;
  },

  deleteAttendanceRecord(id) {
    let records = this.getAttendance();
    records = records.filter(r => r.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, deleteDoc } = this.firestoreSdk;
        const recordRef = doc(this.firestore, "attendance", id);
        deleteDoc(recordRef).catch(err => console.warn("Cloud delete attendance error:", err));
      } catch (e) {}
    }
  },

  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) || {};
    } catch (e) { return {}; }
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const settingsRef = doc(this.firestore, "settings", "general");
        const cleanPayload = JSON.parse(JSON.stringify(updated));
        setDoc(settingsRef, cleanPayload, { merge: true }).catch(err => console.warn("Cloud settings error:", err));
      } catch (e) {}
    }

    return updated;
  },

  // ==========================================
  // 1. نظام الاعتراف الشهري (Monthly Confessions)
  // ==========================================
  getConfessions() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONFESSIONS)) || [];
    } catch (e) { return []; }
  },

  getCurrentMonthYear() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return { month, year, monthKey: `${year}-${month}` };
  },

  getStudentConfessionForMonth(studentId, monthKey = null) {
    if (!monthKey) {
      monthKey = this.getCurrentMonthYear().monthKey;
    }
    return this.getConfessions().find(c => c.studentId === studentId && c.monthKey === monthKey);
  },

  recordConfession(studentId, customDate = null, notes = '') {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('المخدوم غير موجود');

    const dateStr = customDate || Utils.formatDate();
    const [year, month] = dateStr.split('-');
    const monthKey = `${year}-${month}`;

    const confessions = this.getConfessions();
    const existingIndex = confessions.findIndex(c => c.studentId === studentId && c.monthKey === monthKey);

    if (existingIndex >= 0) {
      return { success: false, alreadyExists: true, confession: confessions[existingIndex] };
    }

    const currentUserName = (window.Auth && Auth.getCurrentUser()?.name) || 'مشرف الخدمة';
    const newConfession = {
      id: Utils.generateUUID(),
      studentId: student.id,
      studentName: student.name,
      stage: student.stage,
      monthKey: monthKey,
      month: month,
      year: year,
      confessionDate: dateStr,
      recordedBy: currentUserName,
      notes: notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    confessions.unshift(newConfession);
    localStorage.setItem(this.STORAGE_KEYS.CONFESSIONS, JSON.stringify(confessions));

    // مزامنة سحابية مع Firestore
    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "confessions", newConfession.id);
        setDoc(ref, JSON.parse(JSON.stringify(newConfession)), { merge: true }).catch(err => console.warn("Cloud confession save error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-confessions-updated', { detail: confessions }));
    return { success: true, confession: newConfession };
  },

  removeConfession(confessionId) {
    let confessions = this.getConfessions();
    const target = confessions.find(c => c.id === confessionId);
    confessions = confessions.filter(c => c.id !== confessionId);
    localStorage.setItem(this.STORAGE_KEYS.CONFESSIONS, JSON.stringify(confessions));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, deleteDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "confessions", confessionId);
        deleteDoc(ref).catch(err => console.warn("Cloud confession delete error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-confessions-updated', { detail: confessions }));
    return target;
  },

  // ==========================================
  // 2. نظام المواد والأجزاء والدروس (Subjects, Parts & Lessons)
  // ==========================================
  getSubjects(includeArchived = false) {
    try {
      const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUBJECTS)) || [];
      if (includeArchived) return list;
      return list.filter(s => s.status !== 'archived');
    } catch (e) { return []; }
  },

  getSubjectById(subjectId) {
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUBJECTS)) || [];
    return list.find(s => s.id === subjectId);
  },

  saveSubject(subject) {
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUBJECTS)) || [];
    subject.id = subject.id || Utils.generateUUID();
    subject.status = subject.status || 'active'; // active | archived
    subject.academicYear = subject.academicYear || String(new Date().getFullYear());
    subject.updatedAt = Date.now();
    if (!subject.createdAt) subject.createdAt = Date.now();

    const idx = list.findIndex(s => s.id === subject.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...subject };
    } else {
      list.unshift(subject);
    }

    localStorage.setItem(this.STORAGE_KEYS.SUBJECTS, JSON.stringify(list));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "subjects", subject.id);
        setDoc(ref, JSON.parse(JSON.stringify(subject)), { merge: true }).catch(err => console.warn("Cloud subject save error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-subjects-updated', { detail: list }));
    return subject;
  },

  archiveSubject(subjectId) {
    const subject = this.getSubjectById(subjectId);
    if (!subject) return null;
    subject.status = 'archived';
    subject.archivedAt = Date.now();
    return this.saveSubject(subject);
  },

  unarchiveSubject(subjectId) {
    const subject = this.getSubjectById(subjectId);
    if (!subject) return null;
    subject.status = 'active';
    subject.unarchivedAt = Date.now();
    return this.saveSubject(subject);
  },

  deleteSubject(subjectId) {
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUBJECTS)) || [];
    list = list.filter(s => s.id !== subjectId);
    localStorage.setItem(this.STORAGE_KEYS.SUBJECTS, JSON.stringify(list));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, deleteDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "subjects", subjectId);
        deleteDoc(ref).catch(err => console.warn("Cloud subject delete error:", err));
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('abs-subjects-updated', { detail: list }));
  },

  // ==========================================
  // 3. أجزاء المواد وعناصر التقييم / الدروس (Parts & Lessons)
  // ==========================================
  getAssessments() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ASSESSMENTS)) || [];
    } catch (e) { return []; }
  },

  getAssessmentsBySubject(subjectId) {
    return this.getAssessments().filter(a => a.subjectId === subjectId);
  },

  getAssessmentById(assessmentId) {
    return this.getAssessments().find(a => a.id === assessmentId);
  },

  saveAssessment(assessment) {
    const list = this.getAssessments();
    assessment.id = assessment.id || Utils.generateUUID();
    assessment.sortOrder = assessment.sortOrder || (list.length + 1);
    assessment.maxScore = Number(assessment.maxScore) || 10;
    assessment.updatedAt = Date.now();
    if (!assessment.createdAt) assessment.createdAt = Date.now();

    const idx = list.findIndex(a => a.id === assessment.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...assessment };
    } else {
      list.push(assessment);
    }

    localStorage.setItem(this.STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "assessments", assessment.id);
        setDoc(ref, JSON.parse(JSON.stringify(assessment)), { merge: true }).catch(err => console.warn("Cloud assessment save error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-assessments-updated', { detail: list }));
    return assessment;
  },

  deleteAssessment(assessmentId) {
    let list = this.getAssessments();
    list = list.filter(a => a.id !== assessmentId);
    localStorage.setItem(this.STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, deleteDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "assessments", assessmentId);
        deleteDoc(ref).catch(err => console.warn("Cloud assessment delete error:", err));
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('abs-assessments-updated', { detail: list }));
  },

  // ==========================================
  // 4. درجات الطلاب (Student Grades)
  // ==========================================
  getGrades() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GRADES)) || [];
    } catch (e) { return []; }
  },

  getStudentGrade(studentId, assessmentItemId) {
    return this.getGrades().find(g => g.studentId === studentId && g.assessmentItemId === assessmentItemId);
  },

  getGradesByAssessment(assessmentItemId) {
    return this.getGrades().filter(g => g.assessmentItemId === assessmentItemId);
  },

  getGradesBySubject(subjectId) {
    const assessments = this.getAssessmentsBySubject(subjectId).map(a => a.id);
    return this.getGrades().filter(g => assessments.includes(g.assessmentItemId));
  },

  getGradesByStudent(studentId) {
    return this.getGrades().filter(g => g.studentId === studentId);
  },

  saveGrade(studentId, assessmentItemId, score, notes = '') {
    const list = this.getGrades();
    const currentUserName = (window.Auth && Auth.getCurrentUser()?.name) || 'مشرف الخدمة';
    
    // إذا كانت الدرجة null أو فارغة يتم حذف التسجيل أو تركه غير مسجل
    const existingIndex = list.findIndex(g => g.studentId === studentId && g.assessmentItemId === assessmentItemId);

    if (score === null || score === undefined || score === '') {
      if (existingIndex >= 0) {
        const deletedId = list[existingIndex].id;
        list.splice(existingIndex, 1);
        localStorage.setItem(this.STORAGE_KEYS.GRADES, JSON.stringify(list));
        if (this.firestore && this.firestoreSdk) {
          try {
            const { doc, deleteDoc } = this.firestoreSdk;
            const ref = doc(this.firestore, "grades", deletedId);
            deleteDoc(ref).catch(err => console.warn("Cloud grade delete error:", err));
          } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('abs-grades-updated', { detail: list }));
      }
      return null;
    }

    const numScore = Number(score);
    let gradeRecord = {
      id: existingIndex >= 0 ? list[existingIndex].id : Utils.generateUUID(),
      studentId,
      assessmentItemId,
      score: numScore,
      notes: notes || '',
      recordedBy: currentUserName,
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...gradeRecord };
    } else {
      gradeRecord.createdAt = Date.now();
      list.push(gradeRecord);
    }

    localStorage.setItem(this.STORAGE_KEYS.GRADES, JSON.stringify(list));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "grades", gradeRecord.id);
        setDoc(ref, JSON.parse(JSON.stringify(gradeRecord)), { merge: true }).catch(err => console.warn("Cloud grade save error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-grades-updated', { detail: list }));
    return gradeRecord;
  },

  // حفظ متعدد في خطوة واحدة
  saveBulkGrades(gradesArray) {
    gradesArray.forEach(g => {
      this.saveGrade(g.studentId, g.assessmentItemId, g.score, g.notes);
    });
  },

  // ==========================================
  // 5. مواعيد تسجيل الحضور (Attendance Schedule)
  // ==========================================
  getAttendanceSchedule() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SCHEDULE));
      if (stored) return stored;
    } catch (e) {}

    // الإعداد الافتراضي
    return {
      enabled: false, // تعطيل القيود افتراضياً حتى يحددها المسؤول
      timezone: 'Africa/Cairo',
      thursday: {
        enabled: true,
        startTime: '17:00',
        endTime: '22:00'
      },
      friday: {
        enabled: true,
        startTime: '08:00',
        endTime: '13:00'
      },
      updatedAt: Date.now()
    };
  },

  saveAttendanceSchedule(scheduleData) {
    const current = this.getAttendanceSchedule();
    const updated = { ...current, ...scheduleData, updatedAt: Date.now() };
    localStorage.setItem(this.STORAGE_KEYS.SCHEDULE, JSON.stringify(updated));

    if (this.firestore && this.firestoreSdk) {
      try {
        const { doc, setDoc } = this.firestoreSdk;
        const ref = doc(this.firestore, "schedule", "general");
        setDoc(ref, JSON.parse(JSON.stringify(updated)), { merge: true }).catch(err => console.warn("Cloud schedule save error:", err));
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('abs-schedule-updated', { detail: updated }));
    return updated;
  },

  // التحقق الدقيق من موعد تسجيل الحضور بتوقيت القاهرة
  isAttendanceAllowedNow() {
    const schedule = this.getAttendanceSchedule();
    if (!schedule || !schedule.enabled) {
      return { allowed: true, reason: 'القيود الزمنية غير مفعلة' };
    }

    try {
      // الحصول على الوقت الحالي بتوقيت القاهرة
      const cairoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
      const dayIndex = cairoNow.getDay(); // 4 = الخميس, 5 = الجمعة
      const currentHours = cairoNow.getHours();
      const currentMinutes = cairoNow.getMinutes();
      const currentTimeVal = currentHours * 60 + currentMinutes;

      let daySchedule = null;
      let dayName = '';

      if (dayIndex === 4) { // الخميس
        daySchedule = schedule.thursday;
        dayName = 'الخميس';
      } else if (dayIndex === 5) { // الجمعة
        daySchedule = schedule.friday;
        dayName = 'الجمعة';
      } else {
        return { 
          allowed: false, 
          message: 'تسجيل الحضور غير متاح اليوم. المواعيد المسموح بها هي يومي الخميس والجمعة فقط حسب الإعدادات.' 
        };
      }

      if (!daySchedule || !daySchedule.enabled) {
        return { 
          allowed: false, 
          message: `تسجيل الحضور معطل ليوم ${dayName} حسب الإعدادات المحددة.` 
        };
      }

      const [startH, startM] = (daySchedule.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (daySchedule.endTime || '23:59').split(':').map(Number);

      const startTimeVal = startH * 60 + startM;
      const endTimeVal = endH * 60 + endM;

      if (currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal) {
        return { allowed: true, dayName };
      } else {
        return { 
          allowed: false, 
          message: `تسجيل الحضور غير متاح حالياً. الموعد المسموح ليوم ${dayName} هو من ${daySchedule.startTime} إلى ${daySchedule.endTime} (بتوقيت القاهرة). يُرجى المحاولة خلال الموعد المحدد.` 
        };
      }
    } catch (e) {
      console.warn("Time verification fallback:", e);
      return { allowed: true, reason: 'Fallback on error' };
    }
  }
};

DB.initDatabase();
window.DB = DB;

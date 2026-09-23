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
    INITIALIZED: 'abs_db_is_initialized'
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

  async connectFirebase() {
    try {
      // Dynamic import of Firebase SDK (Modular v11)
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js");
      const { 
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
      this.firestore = getFirestore(this.firebaseApp);
      this.firestoreSdk = { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch };
      this.isCloudConnected = true;

      console.log("🔥 [Firebase] تم الاتصال السحابي بمشروع كنيسة أبي سيفين (abo-sefen-d143a) بنجاح!");

      // Start Real-time synchronization stream (الاستماع للتغييرات اللحظية في نفس الثانية)
      this.attachRealtimeListeners();
    } catch (err) {
      console.warn("⚠️ [Firebase] تنبيه الاتصال السحابي (يعمل في وضع التخزين المحلي فائق السرعة):", err);
    }
  },

  // مزامنة لحظية في نفس الثانية عبر onSnapshot لكافة الأجهزة
  attachRealtimeListeners() {
    if (this._listenersAttached || !this.firestore || !this.firestoreSdk) return;
    this._listenersAttached = true;

    const { collection, onSnapshot } = this.firestoreSdk;

    // 1. مزامنة الطلاب المباشرة
    const studentsColl = collection(this.firestore, "students");
    onSnapshot(studentsColl, (snapshot) => {
      // عند حدوث أي تعديل في الكلاود من أي جهاز
      const remoteStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // حفظ في الذاكرة المحلية
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(remoteStudents));
      console.log(`🔄 [Firebase Live Sync] تم مزامنة ${remoteStudents.length} مخدوم من السحابة في نفس اللحظة!`);

      // إخطار الشاشات المفتوحة لتحديث الواجهة فوراً
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
    }, (err) => {
      console.warn("Students realtime sync warning:", err.message);
    });

    // 2. مزامنة سجلات الحضور المباشرة
    const attendanceColl = collection(this.firestore, "attendance");
    onSnapshot(attendanceColl, (snapshot) => {
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
      console.warn("Attendance realtime sync warning:", err.message);
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
        setDoc(studentRef, student, { merge: true }).catch(err => {
          console.warn("Cloud student sync error:", err);
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
        setDoc(recordRef, newRecord).catch(err => console.warn("Cloud attendance sync error:", err));
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
        setDoc(settingsRef, updated, { merge: true }).catch(err => console.warn("Cloud settings error:", err));
      } catch (e) {}
    }

    return updated;
  }
};

DB.initDatabase();
window.DB = DB;

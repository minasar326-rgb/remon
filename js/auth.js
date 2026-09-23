/**
 * Authentication & Supervisor Session Manager
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const Auth = {
  SESSION_KEY: 'abs_current_session',
  
  // Default master admin credentials (can be updated from settings)
  getDefaultAdmin() {
    return {
      username: 'admin',
      passwordHash: 'sefeen2026', // Stored in settings
      name: 'أمين الخدمة الرئيسي',
      role: 'admin'
    };
  },

  getCurrentUser() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.replace('login.html');
      }
    }
  },

  login(username, password) {
    // 1. Check Brute-force lockout
    const bfCheck = Security.checkBruteForce();
    if (!bfCheck.allowed) {
      return { success: false, error: bfCheck.error };
    }

    // 2. Validate against stored or default admin
    const cleanUser = username ? username.trim().toLowerCase() : '';
    const cleanPass = password ? password.trim() : '';

    const storedSettings = DB.getSettings();
    const validUser = (storedSettings.adminUsername || 'admin').toLowerCase();
    const validPass = storedSettings.adminPassword || '123456';

    if (cleanUser === validUser && cleanPass === validPass) {
      // Successful login
      Security.resetFailedAttempts();
      const userSession = {
        username: cleanUser,
        name: storedSettings.churchLeader || 'خادم مشرف',
        role: 'admin',
        loginTime: Date.now()
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userSession));
      
      // Log Audit Event
      Activity.log('تسجيل دخول', `قام المشرف ${userSession.name} بتسجيل الدخول إلى النظام.`);
      
      return { success: true };
    } else {
      // Failed login
      const attempts = Security.recordFailedAttempt();
      const remaining = Security.MAX_FAILED_ATTEMPTS - attempts;
      if (remaining <= 0) {
        return {
          success: false,
          error: 'تم تجاوز الحد الأقصى للمحاولات (5). تم قفل الحساب مؤقتاً لمدة 15 دقيقة.'
        };
      } else {
        return {
          success: false,
          error: `اسم المستخدم أو كلمة المرور غير صحيحة! (متبقي ${remaining} محاولات قبل القفل)`
        };
      }
    }
  },

  verifyCurrentPassword(password) {
    const storedSettings = DB.getSettings();
    const validPass = storedSettings.adminPassword || '123456';
    return (password && password.trim() === validPass);
  },

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      Activity.log('تسجيل خروج', `قام المشرف ${user.name} بتسجيل الخروج.`);
    }
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.replace('login.html');
  }
};

window.Auth = Auth;

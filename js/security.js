/**
 * Security Suite: Brute-Force Protection & Inactivity Auto-Lock
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const Security = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_TIME_MS: 15 * 60 * 1000, // 15 Minutes
  INACTIVITY_LIMIT_MS: 15 * 60 * 1000, // 15 Minutes

  inactivityTimer: null,
  isScreenLocked: false,

  // 1. Brute-Force Prevention Check
  checkBruteForce() {
    const raw = localStorage.getItem('abs_auth_attempts');
    if (!raw) return { allowed: true };

    try {
      const data = JSON.parse(raw);
      if (data.attempts >= this.MAX_FAILED_ATTEMPTS) {
        const timePassed = Date.now() - data.lastFailedAt;
        if (timePassed < this.LOCKOUT_TIME_MS) {
          const remainingMinutes = Math.ceil((this.LOCKOUT_TIME_MS - timePassed) / 60000);
          return {
            allowed: false,
            remainingMinutes,
            error: `تم قفل الحساب مؤقتاً لحمايته بسبب 5 محاولات خاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`
          };
        } else {
          // Lockout expired, reset
          this.resetFailedAttempts();
          return { allowed: true };
        }
      }
    } catch (e) {
      this.resetFailedAttempts();
    }
    return { allowed: true };
  },

  recordFailedAttempt() {
    const raw = localStorage.getItem('abs_auth_attempts');
    let data = { attempts: 0, lastFailedAt: 0 };
    if (raw) {
      try { data = JSON.parse(raw); } catch (e) {}
    }
    data.attempts += 1;
    data.lastFailedAt = Date.now();
    localStorage.setItem('abs_auth_attempts', JSON.stringify(data));
    return data.attempts;
  },

  resetFailedAttempts() {
    localStorage.removeItem('abs_auth_attempts');
  },

  // 2. Inactivity Auto-Lock Engine
  initInactivityWatcher() {
    // Only monitor on authenticated pages (not on login.html)
    if (window.location.pathname.endsWith('login.html')) return;

    const resetTimer = () => {
      if (this.isScreenLocked) return;
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = setTimeout(() => {
        this.triggerScreenLock();
      }, this.INACTIVITY_LIMIT_MS);
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();
  },

  triggerScreenLock() {
    if (this.isScreenLocked) return;
    this.isScreenLocked = true;

    // Show Lock Screen Overlay
    const overlay = document.createElement('div');
    overlay.id = 'lockscreen-overlay';
    overlay.className = 'lockscreen-overlay';
    overlay.innerHTML = `
      <div class="lockscreen-card">
        <div class="lockscreen-avatar">🔒</div>
        <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary);">تم قفل الشاشة تلقائياً</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">لحماية سرية بيانات الطلاب، تم تأمين الجلسة بسبب عدم النشاط لمدة 15 دقيقة.</p>
        <div class="form-group" style="text-align: right;">
          <label class="form-label">أدخل كلمة المرور لإلغاء القفل:</label>
          <input type="password" id="lock-pass-input" class="form-input" placeholder="كلمة المرور..." autofocus />
        </div>
        <button id="btn-unlock-screen" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">إلغاء القفل والمتابعة</button>
        <button id="btn-logout-lock" class="btn btn-secondary" style="width: 100%; margin-top: 0.8rem;">تسجيل الخروج</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const unlock = () => {
      const pass = document.getElementById('lock-pass-input').value;
      if (Auth && Auth.verifyCurrentPassword(pass)) {
        overlay.remove();
        this.isScreenLocked = false;
        this.initInactivityWatcher();
        Utils.showToast('تم إلغاء القفل بنجاح', 'success');
      } else {
        Utils.showToast('كلمة المرور غير صحيحة!', 'error');
        Utils.playBeep('error');
      }
    };

    document.getElementById('btn-unlock-screen').onclick = unlock;
    document.getElementById('lock-pass-input').onkeydown = (e) => {
      if (e.key === 'Enter') unlock();
    };
    document.getElementById('btn-logout-lock').onclick = () => {
      Auth.logout();
    };
  }
};

window.Security = Security;

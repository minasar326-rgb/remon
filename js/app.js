/**
 * Global App Orchestrator & PWA Integration
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Enforce Authentication on private pages
  if (window.Auth) {
    Auth.requireAuth();
  }

  // 2. Initialize Inactivity Auto-Lockout Watcher
  if (window.Security) {
    Security.initInactivityWatcher();
  }

  // 3. Theme Toggle (Dark/Light mode)
  initTheme();

  // 4. Update Current User Header Badge
  updateUserBadge();

  // 5. Register PWA Service Worker
  initServiceWorker();

  // 6. Network Online / Offline Detection
  initNetworkStatusWatcher();

  // 7. Cloud Realtime Sync Status Badge
  initCloudSyncBadge();
});


function initTheme() {
  const savedTheme = localStorage.getItem('abs_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('abs_theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function updateUserBadge() {
  const user = window.Auth && Auth.getCurrentUser();
  const nameEl = document.getElementById('current-user-name');
  if (nameEl && user) {
    nameEl.textContent = user.name;
  }
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.log('Service Worker failed:', err));
    });
  }
}

function initNetworkStatusWatcher() {
  const offlineBanner = document.getElementById('offline-banner');
  const updateStatus = () => {
    if (offlineBanner) {
      if (!navigator.onLine) {
        offlineBanner.classList.add('visible');
        offlineBanner.textContent = '⚡ أنت تعمل الآن بدون اتصال بالإنترنت (Offline Mode). جميع العمليات تُحفظ محلياً بسرعة 0ms.';
      } else {
        offlineBanner.classList.remove('visible');
      }
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

function initCloudSyncBadge() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  let badge = document.getElementById('cloud-sync-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'cloud-sync-badge';
    badge.className = 'cloud-status-badge connecting';
    badge.title = 'جاري التحقق من المزامنة السحابية عبر Firebase...';
    badge.innerHTML = '<span class="cloud-dot"></span><span>جاري المزامنة...</span>';
    navActions.prepend(badge);
  }

  const updateBadgeUI = (connected, error) => {
    let alertBanner = document.getElementById('cloud-action-banner');
    if (!alertBanner) {
      alertBanner = document.createElement('div');
      alertBanner.id = 'cloud-action-banner';
      alertBanner.className = 'cloud-action-banner';
      const mainHeader = document.querySelector('header.app-header') || document.querySelector('.app-header');
      if (mainHeader && mainHeader.parentNode) {
        mainHeader.parentNode.insertBefore(alertBanner, mainHeader.nextSibling);
      }
    }

    if (connected) {
      badge.className = 'cloud-status-badge synced';
      badge.title = 'متصل سحابياً بلحظية 0ms عبر Firebase Firestore';
      badge.innerHTML = '<span class="cloud-dot" style="background:#10b981; box-shadow: 0 0 8px #10b981;"></span><span>متزامن لحظياً ⚡</span>';
      if (alertBanner) alertBanner.style.display = 'none';
    } else {
      badge.className = 'cloud-status-badge offline';
      badge.title = error || 'لم يتم تفعيل قاعدة بيانات Firestore في حساب الفايربيز';
      badge.innerHTML = '<span class="cloud-dot" style="background:#ef4444; box-shadow: 0 0 8px #ef4444;"></span><span>السحابة غير مفعلة</span>';
      if (alertBanner) {
        alertBanner.style.display = 'block';
        alertBanner.innerHTML = `
          <div style="background: #7f1d1d; color: #fecaca; padding: 0.75rem 1.25rem; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ef4444; flex-wrap: wrap; gap: 0.5rem; text-align: right;">
            <div>
              <strong>⚠️ تنبيه تفعيل المزامنة بين الأجهزة:</strong>
              قاعدة بيانات Cloud Firestore لم تُنشأ بعد في مشروعك (<code>abo-sefen-d143a</code>). لن تظهر البيانات في الأجهزة الأخرى حتى تنشئ قاعدة البيانات في لوحة تحكم Firebase.
            </div>
            <a href="https://console.firebase.google.com/project/abo-sefen-d143a/firestore" target="_blank" style="background: #ef4444; color: white; padding: 0.4rem 0.9rem; border-radius: 6px; text-decoration: none; font-weight: bold; white-space: nowrap;">
              👉 اضغط هنا لإنشاء قاعدة البيانات (خطوة واحدة)
            </a>
          </div>
        `;
      }
    }
  };

  window.addEventListener('abs-cloud-status', (e) => {
    updateBadgeUI(e.detail.connected, e.detail.error);
  });

  if (window.DB && DB.isCloudConnected) {
    updateBadgeUI(true);
  }
}


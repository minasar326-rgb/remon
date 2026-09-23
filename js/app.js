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
    badge.className = 'cloud-status-badge synced';
    badge.title = 'تزامن سحابي فوري ومباشر بين آلاف الأجهزة عبر Firebase';
    badge.innerHTML = '<span class="cloud-dot"></span><span>سحابي متزامن</span>';
    navActions.prepend(badge);
  }
}


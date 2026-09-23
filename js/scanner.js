/**
 * Fast Multi-Format Scanner & Anti-Duplicate Cooldown Engine
 * يدعم كاميرا الهاتف واللابتوب بكافة صيغ QR والباركود (Code128, EAN13...)
 * كنيسة الشهيد العظيم فيلوباتير مرقوريوس أبي سيفين
 */

const AttendanceScanner = {
  html5QrCode: null,
  isScanning: false,
  lastScannedCode: null,
  lastScannedTime: 0,
  cooldownSeconds: 5,

  init(videoContainerId, onScanSuccess) {
    this.containerId = videoContainerId;
    this.onScanSuccessCallback = onScanSuccess;

    const settings = DB.getSettings();
    this.cooldownSeconds = settings.scanCooldownSeconds || 5;
  },

  async start() {
    if (this.isScanning) return;
    try {
      if (!window.Html5Qrcode) {
        console.error('Html5Qrcode library not loaded');
        Utils.showToast('تعذر تحميل مشغل الكاميرا، تأكد من الاتصال بالإنترنت', 'error');
        return;
      }

      this.html5QrCode = new Html5Qrcode(this.containerId);
      const config = {
        fps: 25, // High FPS for instant scanning
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
      };

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => this.handleScan(decodedText),
        (errorMessage) => {
          // Ignore frequent frame decode misses
        }
      );

      this.isScanning = true;
      const statusEl = document.getElementById('scanner-live-status');
      if (statusEl) statusEl.textContent = '🟢 الكاميرا تعمل - وجه الكارنيه أمام العدسة';
    } catch (err) {
      console.error('Scanner start failed:', err);
      Utils.showToast('تعذر تشغيل الكاميرا! يرجى منح الإذن للمتصفح.', 'error');
      const statusEl = document.getElementById('scanner-live-status');
      if (statusEl) statusEl.textContent = '🔴 الكاميرا متوقفة أو غير مصرح بها';
    }
  },

  async stop() {
    if (!this.isScanning || !this.html5QrCode) return;
    try {
      await this.html5QrCode.stop();
      this.html5QrCode.clear();
      this.isScanning = false;
      const statusEl = document.getElementById('scanner-live-status');
      if (statusEl) statusEl.textContent = '⚪ الكاميرا متوقفة';
    } catch (err) {
      console.warn('Scanner stop error:', err);
    }
  },

  handleScan(code) {
    if (!code) return;
    const cleanCode = code.trim();
    const now = Date.now();

    // 1. Scan Cooldown: Prevent immediate double scan of the same student
    if (this.lastScannedCode === cleanCode && (now - this.lastScannedTime) < (this.cooldownSeconds * 1000)) {
      const remainingSeconds = Math.ceil((this.cooldownSeconds * 1000 - (now - this.lastScannedTime)) / 1000);
      Utils.playBeep('warning');
      Utils.vibrate([40, 50, 40]);
      Utils.showToast(`تم مسح هذا الكارنيه للتو! انتظر ${remainingSeconds} ثوانٍ لتجنب التكرار.`, 'warning', 2000);
      return;
    }

    this.lastScannedCode = cleanCode;
    this.lastScannedTime = now;

    // 2. Trigger feedback
    Utils.playBeep('success');
    Utils.vibrate([100]);
    this.triggerFlashEffect();

    // 3. Dispatch to callback
    if (this.onScanSuccessCallback) {
      this.onScanSuccessCallback(cleanCode);
    }
  },

  triggerFlashEffect() {
    const flashEl = document.getElementById('scanner-flash');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 250);
    }
  }
};

window.AttendanceScanner = AttendanceScanner;

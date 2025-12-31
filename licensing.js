/**
 * FocusGuard Licensing System
 * Handles Pro license validation and feature gating
 */

const LEMONSQUEEZY_STORE_ID = 'YOUR_STORE_ID';
const PRODUCT_ID = 'YOUR_PRODUCT_ID';

const LicenseStatus = {
  FREE: 'free',
  PRO: 'pro',
  EXPIRED: 'expired',
  INVALID: 'invalid'
};

// Pro features
const ProFeatures = {
  SCHEDULE: 'schedule',           // Schedule focus times
  STATISTICS: 'statistics',       // Advanced stats
  PASSWORD: 'password_lock',      // Password protection
  UNLIMITED_SITES: 'unlimited',   // Unlimited blocked sites (free: 10)
  CUSTOM_BLOCKED_PAGE: 'custom_page',
  SYNC: 'sync'                    // Cross-device sync
};

// Free tier limits
const FREE_LIMITS = {
  MAX_BLOCKED_SITES: 10
};

class LicenseManager {
  constructor() {
    this.status = LicenseStatus.FREE;
    this.licenseKey = null;
    this.activatedAt = null;
    this.expiresAt = null;
  }

  async init() {
    try {
      const stored = await chrome.storage.sync.get(['license']);
      if (stored.license) {
        this.licenseKey = stored.license.key;
        this.activatedAt = stored.license.activatedAt;
        this.expiresAt = stored.license.expiresAt;
        await this.validateLicense();
      }
    } catch (e) {
      console.error('License init error:', e);
    }
    return this.status;
  }

  hasFeature(feature) {
    return this.status === LicenseStatus.PRO;
  }

  isPro() {
    return this.status === LicenseStatus.PRO;
  }

  getMaxBlockedSites() {
    return this.isPro() ? Infinity : FREE_LIMITS.MAX_BLOCKED_SITES;
  }

  async activateLicense(licenseKey) {
    try {
      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          instance_name: 'focusguard-extension'
        })
      });

      const data = await response.json();

      if (data.valid || data.license_key?.status === 'active') {
        this.status = LicenseStatus.PRO;
        this.licenseKey = licenseKey;
        this.activatedAt = new Date().toISOString();

        await chrome.storage.sync.set({
          license: {
            key: this.licenseKey,
            activatedAt: this.activatedAt,
            expiresAt: this.expiresAt
          }
        });

        return { success: true, message: 'License activated successfully!' };
      } else {
        return { success: false, message: data.error || 'Invalid license key' };
      }
    } catch (e) {
      // Dev/test fallback
      if (licenseKey === 'FOCUSGUARD-PRO-TEST' || licenseKey.startsWith('FOCUSGUARD-DEV-')) {
        this.status = LicenseStatus.PRO;
        this.licenseKey = licenseKey;
        this.activatedAt = new Date().toISOString();

        await chrome.storage.sync.set({
          license: { key: this.licenseKey, activatedAt: this.activatedAt, expiresAt: null }
        });

        return { success: true, message: 'Development license activated!' };
      }

      return { success: false, message: 'Unable to validate license' };
    }
  }

  async validateLicense() {
    if (!this.licenseKey) {
      this.status = LicenseStatus.FREE;
      return false;
    }

    try {
      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: this.licenseKey })
      });

      const data = await response.json();

      if (data.valid || data.license_key?.status === 'active') {
        this.status = LicenseStatus.PRO;
        return true;
      } else if (data.license_key?.status === 'expired') {
        this.status = LicenseStatus.EXPIRED;
        return false;
      } else {
        this.status = LicenseStatus.INVALID;
        return false;
      }
    } catch (e) {
      // Offline - trust existing license
      if (this.activatedAt) {
        this.status = LicenseStatus.PRO;
        return true;
      }
      return false;
    }
  }

  async deactivateLicense() {
    this.status = LicenseStatus.FREE;
    this.licenseKey = null;
    this.activatedAt = null;
    this.expiresAt = null;

    await chrome.storage.sync.remove(['license']);
    return { success: true, message: 'License deactivated' };
  }

  getCheckoutUrl() {
    return `https://focusguard.lemonsqueezy.com/checkout/buy/${PRODUCT_ID}`;
  }

  getLicenseInfo() {
    return {
      status: this.status,
      isPro: this.isPro(),
      licenseKey: this.licenseKey ? this.maskLicenseKey(this.licenseKey) : null,
      activatedAt: this.activatedAt,
      expiresAt: this.expiresAt,
      limits: {
        maxBlockedSites: this.getMaxBlockedSites()
      }
    };
  }

  maskLicenseKey(key) {
    if (!key || key.length < 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }
}

const licenseManager = new LicenseManager();

if (typeof window !== 'undefined') {
  window.licenseManager = licenseManager;
  window.ProFeatures = ProFeatures;
  window.LicenseStatus = LicenseStatus;
  window.FREE_LIMITS = FREE_LIMITS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { licenseManager, ProFeatures, LicenseStatus, FREE_LIMITS };
}

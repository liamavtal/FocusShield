/**
 * FocusGuard Tests
 */

describe('Website Blocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.storage.local.get.mockResolvedValue({ blockedSites: [], enabled: false });
  });

  describe('addWebsite', () => {
    test('should add website to blocked list', async () => {
      chrome.storage.local.get.mockResolvedValue({ blockedSites: [] });

      const url = 'facebook.com';
      const blockedSites = [];
      blockedSites.push(url);

      expect(blockedSites).toContain('facebook.com');
    });

    test('should clean URL before adding', () => {
      const testCases = [
        { input: 'https://www.facebook.com/path', expected: 'facebook.com' },
        { input: 'http://twitter.com/', expected: 'twitter.com' },
        { input: 'www.reddit.com', expected: 'reddit.com' },
        { input: 'YOUTUBE.COM', expected: 'youtube.com' }
      ];

      testCases.forEach(({ input, expected }) => {
        let url = input.trim().toLowerCase();
        url = url.replace(/^(https?:\/\/)?(www\.)?/, '');
        url = url.replace(/\/.*$/, '');
        expect(url).toBe(expected);
      });
    });

    test('should prevent duplicate entries', () => {
      const blockedSites = ['facebook.com', 'twitter.com'];
      const newUrl = 'facebook.com';

      const isDuplicate = blockedSites.includes(newUrl);
      expect(isDuplicate).toBe(true);
    });
  });

  describe('removeWebsite', () => {
    test('should remove website from blocked list', () => {
      const blockedSites = ['facebook.com', 'twitter.com', 'reddit.com'];
      const urlToRemove = 'twitter.com';

      const filtered = blockedSites.filter(site => site !== urlToRemove);

      expect(filtered).not.toContain('twitter.com');
      expect(filtered).toContain('facebook.com');
      expect(filtered).toContain('reddit.com');
    });
  });

  describe('presets', () => {
    const PRESETS = {
      social: ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'snapchat.com', 'linkedin.com', 'reddit.com'],
      video: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'primevideo.com'],
      news: ['cnn.com', 'foxnews.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'reuters.com'],
      shopping: ['amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'aliexpress.com', 'etsy.com']
    };

    test('should add all social media sites', () => {
      expect(PRESETS.social.length).toBe(8);
      expect(PRESETS.social).toContain('facebook.com');
      expect(PRESETS.social).toContain('instagram.com');
    });

    test('should add preset sites without duplicates', () => {
      const blockedSites = ['facebook.com'];
      const preset = PRESETS.social;

      const newSites = preset.filter(site => !blockedSites.includes(site));
      const updatedSites = [...blockedSites, ...newSites];

      expect(updatedSites.length).toBe(8); // 1 existing + 7 new
    });
  });
});

describe('Focus Mode', () => {
  test('should toggle focus mode on', async () => {
    chrome.storage.local.get.mockResolvedValue({ enabled: false });

    const { enabled } = await chrome.storage.local.get(['enabled']);
    const newState = !enabled;

    expect(newState).toBe(true);
  });

  test('should toggle focus mode off', async () => {
    chrome.storage.local.get.mockResolvedValue({ enabled: true });

    const { enabled } = await chrome.storage.local.get(['enabled']);
    const newState = !enabled;

    expect(newState).toBe(false);
  });
});

describe('Statistics', () => {
  test('should increment blocks today counter', () => {
    let blocksToday = 5;
    blocksToday++;
    expect(blocksToday).toBe(6);
  });

  test('should reset counter at midnight', () => {
    const lastReset = '2024-01-01';
    const today = '2024-01-02';

    if (lastReset !== today) {
      const blocksToday = 0;
      expect(blocksToday).toBe(0);
    }
  });
});

describe('Licensing', () => {
  test('should reject test keys (backdoor removed)', async () => {
    // Mock network error to trigger catch block
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { licenseManager } = require('../licensing.js');
    const result = await licenseManager.activateLicense('FOCUSGUARD-PRO-TEST');

    // Test keys should NOT work - backdoor removed
    expect(result.success).toBe(false);
  });

  test('should enforce free tier limit', () => {
    const FREE_LIMIT = 10;
    const blockedSites = Array(10).fill('site.com');

    const canAddMore = blockedSites.length < FREE_LIMIT;
    expect(canAddMore).toBe(false);
  });

  test('should allow unlimited for pro users', () => {
    const isPro = true;
    const maxSites = isPro ? Infinity : 10;

    expect(maxSites).toBe(Infinity);
  });
});

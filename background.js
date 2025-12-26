// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                     FOCUSGUARD BACKGROUND SERVICE                           ║
// ║                                                                              ║
// ║  Handles website blocking, authentication, sync, and Pro features           ║
// ╚════════════════════════════════════════════════════════════════════════════╝

importScripts('config.js', 'api.js');

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ══════════════════════════════════════════════════════════════════════════════

const PRESETS = {
  social: {
    name: 'Social Media',
    icon: '📱',
    sites: ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'snapchat.com', 'linkedin.com', 'reddit.com', 'pinterest.com', 'tumblr.com', 'threads.net', 'mastodon.social']
  },
  video: {
    name: 'Video & Streaming',
    icon: '📺',
    sites: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'max.com', 'primevideo.com', 'vimeo.com', 'dailymotion.com', 'crunchyroll.com', 'peacocktv.com']
  },
  news: {
    name: 'News & Media',
    icon: '📰',
    sites: ['cnn.com', 'foxnews.com', 'nytimes.com', 'bbc.com', 'huffpost.com', 'buzzfeed.com', 'vice.com', 'theguardian.com', 'washingtonpost.com', 'news.google.com', 'news.ycombinator.com']
  },
  shopping: {
    name: 'Shopping',
    icon: '🛒',
    sites: ['amazon.com', 'ebay.com', 'etsy.com', 'walmart.com', 'target.com', 'aliexpress.com', 'wish.com', 'shein.com', 'temu.com', 'bestbuy.com']
  },
  gaming: {
    name: 'Gaming',
    icon: '🎮',
    sites: ['twitch.tv', 'discord.com', 'steampowered.com', 'epicgames.com', 'roblox.com', 'minecraft.net', 'itch.io', 'gog.com', 'origin.com', 'ubisoft.com']
  }
};

const DEFAULT_STATE = {
  focusMode: false,
  blockedSites: [],
  enabledPresets: [],
  stats: {
    blocksToday: 0,
    blocksTotal: 0,
    blocksThisWeek: 0,
    blocksThisMonth: 0,
    lastResetDate: new Date().toDateString(),
    weekStartDate: getWeekStart(),
    monthStartDate: getMonthStart(),
    dailyHistory: [],
    streakDays: 0,
    longestStreak: 0,
    focusMinutesToday: 0,
    totalFocusMinutes: 0,
    mostBlockedSites: {}
  },
  schedule: {
    enabled: false,
    days: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  passwordProtection: {
    enabled: false,
    hash: ''
  },
  settings: {
    theme: 'system',
    showMotivation: true,
    playSound: false,
    strictMode: false,
    syncEnabled: true,
    notifications: true
  }
};

let api = null;
let cachedProStatus = null;
let proStatusCheckedAt = 0;

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toDateString();
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toDateString();
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function getState() {
  const { focusguard } = await chrome.storage.local.get('focusguard');
  return { ...DEFAULT_STATE, ...focusguard };
}

async function saveState(state) {
  await chrome.storage.local.set({ focusguard: state });
  
  // Sync to cloud if enabled and logged in
  if (api && state.settings?.syncEnabled) {
    try {
      const user = api.getUser();
      if (user) {
        await api.syncData(state);
      }
    } catch (e) {
      console.warn('[FocusGuard] Sync error:', e.message);
    }
  }
}

async function checkProStatus(forceRefresh = false) {
  // Return cached if fresh (< 5 minutes)
  if (!forceRefresh && cachedProStatus !== null && Date.now() - proStatusCheckedAt < 300000) {
    return cachedProStatus;
  }

  // Check if logged in
  if (!api || !api.isAuthenticated()) {
    cachedProStatus = false;
    proStatusCheckedAt = Date.now();
    return false;
  }

  try {
    cachedProStatus = await api.checkProStatus();
    proStatusCheckedAt = Date.now();
    return cachedProStatus;
  } catch (e) {
    console.error('[FocusGuard] Pro status check error:', e);
    return cachedProStatus || false;
  }
}

function shouldBlock(url, state) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    
    // Check custom blocked sites
    if (state.blockedSites.some(site => {
      const cleanSite = site.replace(/^www\./, '').toLowerCase();
      return hostname === cleanSite || hostname.endsWith('.' + cleanSite);
    })) {
      return true;
    }

    // Check enabled presets
    for (const presetId of state.enabledPresets) {
      const preset = PRESETS[presetId];
      if (preset && preset.sites.some(site => {
        const cleanSite = site.replace(/^www\./, '').toLowerCase();
        return hostname === cleanSite || hostname.endsWith('.' + cleanSite);
      })) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isWithinSchedule(schedule) {
  if (!schedule.enabled) return false;

  const now = new Date();
  const day = now.getDay();

  if (!schedule.days.includes(day)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function updateStats(state, hostname) {
  const today = new Date().toDateString();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  // Daily reset
  if (state.stats.lastResetDate !== today) {
    // Save yesterday's data
    if (state.stats.blocksToday > 0 || state.stats.focusMinutesToday > 0) {
      state.stats.dailyHistory.push({
        date: state.stats.lastResetDate,
        blocks: state.stats.blocksToday,
        focusMinutes: state.stats.focusMinutesToday
      });
      
      // Keep 90 days of history
      if (state.stats.dailyHistory.length > 90) {
        state.stats.dailyHistory.shift();
      }
      
      state.stats.streakDays++;
      state.stats.longestStreak = Math.max(state.stats.longestStreak, state.stats.streakDays);
    } else {
      state.stats.streakDays = 0;
    }
    
    state.stats.blocksToday = 0;
    state.stats.focusMinutesToday = 0;
    state.stats.lastResetDate = today;
  }

  // Weekly reset
  if (state.stats.weekStartDate !== weekStart) {
    state.stats.blocksThisWeek = 0;
    state.stats.weekStartDate = weekStart;
  }

  // Monthly reset
  if (state.stats.monthStartDate !== monthStart) {
    state.stats.blocksThisMonth = 0;
    state.stats.monthStartDate = monthStart;
  }

  // Update counts
  state.stats.blocksToday++;
  state.stats.blocksTotal++;
  state.stats.blocksThisWeek++;
  state.stats.blocksThisMonth++;

  // Track most blocked sites
  const site = hostname.replace(/^www\./, '');
  state.stats.mostBlockedSites[site] = (state.stats.mostBlockedSites[site] || 0) + 1;

  // Keep only top 20 most blocked
  const sorted = Object.entries(state.stats.mostBlockedSites)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  state.stats.mostBlockedSites = Object.fromEntries(sorted);

  return state;
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize state
  const existing = await chrome.storage.local.get('focusguard');
  if (!existing.focusguard) {
    await chrome.storage.local.set({ focusguard: DEFAULT_STATE });
  }

  // Set up alarms
  chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });
  chrome.alarms.create('statsReset', { periodInMinutes: 60 });
  chrome.alarms.create('syncData', { periodInMinutes: 5 });
  chrome.alarms.create('focusTimeTracker', { periodInMinutes: 1 });
  chrome.alarms.create('proStatusCheck', { periodInMinutes: 30 });

  // Initialize API
  initializeAPI();

  // Show welcome page for new installs
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('auth.html?welcome=true') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  initializeAPI();
});

async function initializeAPI() {
  if (!CONFIG.SUPABASE_URL.includes('your')) {
    api = new FocusGuardAPI(CONFIG);
    await api.initialize();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVIGATION BLOCKING
// ══════════════════════════════════════════════════════════════════════════════

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only block main frame
  if (details.frameId !== 0) return;
  
  // Skip chrome:// and extension pages
  if (details.url.startsWith('chrome') || details.url.startsWith('moz-extension')) return;

  const state = await getState();
  const isPro = await checkProStatus();

  // Determine if blocking is active
  const scheduleActive = isPro && isWithinSchedule(state.schedule);
  const isActive = state.focusMode || scheduleActive;

  if (!isActive) return;

  // Check if URL should be blocked
  if (shouldBlock(details.url, state)) {
    const hostname = new URL(details.url).hostname;
    
    // Update statistics
    const updatedState = updateStats(state, hostname);
    await saveState(updatedState);

    // Show notification if enabled
    if (state.settings.notifications) {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Site Blocked',
        message: `${hostname} was blocked. Stay focused!`,
        priority: 0
      });
    }

    // Redirect to blocked page
    const blockedUrl = chrome.runtime.getURL('blocked.html') +
      '?url=' + encodeURIComponent(details.url) +
      '&site=' + encodeURIComponent(hostname);

    chrome.tabs.update(details.tabId, { url: blockedUrl });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ALARM HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const state = await getState();

  switch (alarm.name) {
    case 'focusTimeTracker':
      if (state.focusMode) {
        state.stats.focusMinutesToday++;
        state.stats.totalFocusMinutes++;
        await saveState(state);
      }
      break;

    case 'syncData':
      if (api && api.isAuthenticated() && state.settings.syncEnabled) {
        try {
          await api.syncData(state);
        } catch (e) {
          console.warn('[FocusGuard] Auto-sync failed:', e.message);
        }
      }
      break;

    case 'proStatusCheck':
      await checkProStatus(true);
      break;

    case 'statsReset':
      // Stats are reset on demand in updateStats
      break;
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(message, sender) {
  const state = await getState();
  const isPro = await checkProStatus();

  switch (message.type) {
    // ══════════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    case 'getState':
      return {
        ...state,
        isPro,
        user: api?.getUser() || null,
        profile: api?.profile || null,
        isLoggedIn: api?.isAuthenticated() || false
      };

    case 'toggleFocus':
      // Check password protection when disabling
      if (state.focusMode && isPro && state.passwordProtection.enabled) {
        if (!message.password || simpleHash(message.password) !== state.passwordProtection.hash) {
          return { error: 'PASSWORD_REQUIRED' };
        }
      }
      state.focusMode = !state.focusMode;
      await saveState(state);
      return { ...state, isPro };

    case 'setFocusMode':
      if (!message.enabled && isPro && state.passwordProtection.enabled) {
        if (!message.password || simpleHash(message.password) !== state.passwordProtection.hash) {
          return { error: 'PASSWORD_REQUIRED' };
        }
      }
      state.focusMode = message.enabled;
      await saveState(state);
      return { ...state, isPro };

    // ══════════════════════════════════════════════════════════════════════════
    // SITE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    case 'addSite': {
      const site = message.site.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
      
      if (state.blockedSites.includes(site)) {
        return { ...state, isPro, warning: 'ALREADY_BLOCKED' };
      }
      
      if (!isPro && state.blockedSites.length >= CONFIG.FREE_SITE_LIMIT) {
        return { error: 'LIMIT_REACHED', limit: CONFIG.FREE_SITE_LIMIT };
      }
      
      state.blockedSites.push(site);
      await saveState(state);
      return { ...state, isPro };
    }

    case 'removeSite':
      state.blockedSites = state.blockedSites.filter(s => s !== message.site);
      await saveState(state);
      return { ...state, isPro };

    case 'togglePreset': {
      const presetId = message.preset;
      if (!PRESETS[presetId]) {
        return { error: 'INVALID_PRESET' };
      }

      const idx = state.enabledPresets.indexOf(presetId);
      if (idx > -1) {
        state.enabledPresets.splice(idx, 1);
      } else {
        if (!isPro && state.enabledPresets.length >= CONFIG.FREE_PRESET_LIMIT) {
          return { error: 'PRESET_LIMIT_REACHED', limit: CONFIG.FREE_PRESET_LIMIT };
        }
        state.enabledPresets.push(presetId);
      }
      
      await saveState(state);
      return { ...state, isPro };
    }

    case 'getPresets':
      return { presets: PRESETS };

    // ══════════════════════════════════════════════════════════════════════════
    // PRO FEATURES
    // ══════════════════════════════════════════════════════════════════════════

    case 'updateSchedule':
      if (!isPro) return { error: 'PRO_REQUIRED' };
      state.schedule = { ...state.schedule, ...message.schedule };
      await saveState(state);
      return { ...state, isPro };

    case 'setPassword':
      if (!isPro) return { error: 'PRO_REQUIRED' };
      if (message.password) {
        state.passwordProtection.enabled = true;
        state.passwordProtection.hash = simpleHash(message.password);
      } else {
        state.passwordProtection.enabled = false;
        state.passwordProtection.hash = '';
      }
      await saveState(state);
      return { ...state, isPro };

    case 'updateSettings':
      state.settings = { ...state.settings, ...message.settings };
      await saveState(state);
      return { ...state, isPro };

    // ══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════════════════

    case 'signUp':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.signUp(message.email, message.password, message.metadata);
      cachedProStatus = null;
      return { 
        success: true, 
        user: api.getUser(),
        profile: api.profile 
      };

    case 'signIn':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.signIn(message.email, message.password);
      cachedProStatus = null;
      
      // Load synced data if available
      if (state.settings.syncEnabled) {
        const syncedData = await api.loadSyncedData();
        if (syncedData) {
          // Merge synced data (prefer newer)
          const mergedState = {
            ...state,
            blockedSites: syncedData.blocked_sites || state.blockedSites,
            settings: { ...state.settings, ...syncedData.settings },
            schedule: { ...state.schedule, ...syncedData.schedule }
          };
          await saveState(mergedState);
        }
      }
      
      return { 
        success: true, 
        user: api.getUser(),
        profile: api.profile
      };

    case 'signInWithGoogle':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.signInWithGoogle();
      cachedProStatus = null;
      return { 
        success: true, 
        user: api.getUser(),
        profile: api.profile
      };

    case 'signOut':
      if (api) {
        await api.signOut();
      }
      cachedProStatus = false;
      return { success: true };

    case 'resetPassword':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.resetPassword(message.email);
      return { success: true };

    case 'updatePassword':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.updatePassword(message.password);
      return { success: true };

    case 'updateEmail':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.updateEmail(message.email);
      return { success: true };

    case 'updateProfile':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      const profile = await api.updateProfile(message.updates);
      return { success: true, profile };

    case 'deleteAccount':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.deleteAccount();
      return { success: true };

    // ══════════════════════════════════════════════════════════════════════════
    // SUBSCRIPTION
    // ══════════════════════════════════════════════════════════════════════════

    case 'createCheckout':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      if (!api.isAuthenticated()) return { error: 'NOT_AUTHENTICATED' };
      const checkout = await api.createCheckoutSession(message.priceId);
      return checkout;

    case 'openPortal':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      if (!api.isAuthenticated()) return { error: 'NOT_AUTHENTICATED' };
      const portal = await api.createPortalSession();
      return portal;

    case 'refreshSubscription':
      if (!api) return { error: 'API_NOT_CONFIGURED' };
      await api.refreshSubscription();
      cachedProStatus = null;
      return { 
        isPro: await checkProStatus(true),
        subscription: api.subscription 
      };

    // ══════════════════════════════════════════════════════════════════════════
    // DATA MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    case 'exportData':
      return {
        version: CONFIG.APP_VERSION,
        exportedAt: new Date().toISOString(),
        data: state
      };

    case 'importData':
      if (!message.data?.data) return { error: 'INVALID_DATA' };
      const importedState = { ...DEFAULT_STATE, ...message.data.data };
      await saveState(importedState);
      return { success: true, state: importedState };

    case 'resetStats':
      state.stats = { ...DEFAULT_STATE.stats };
      await saveState(state);
      return { ...state, isPro };

    case 'resetAll':
      await chrome.storage.local.set({ focusguard: DEFAULT_STATE });
      return { success: true };

    case 'syncNow':
      if (!api || !api.isAuthenticated()) return { error: 'NOT_AUTHENTICATED' };
      await api.syncData(state);
      return { success: true };

    default:
      return { error: 'UNKNOWN_MESSAGE_TYPE' };
  }
}

// Initialize on load
initializeAPI();

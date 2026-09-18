import { DEFAULT_SETTINGS, PASSWORD_MODES, PROTECTION_MODES, CHALLENGE_INTERVALS } from '../utils/constants.js';
import { formatDomainName } from '../utils/domains.js';
import {
  generateNextChallenge,
  scheduleChallengeAlarm,
  clearChallengeAlarm,
} from '../security/random-challenge.js';

export const STORAGE_KEYS = {
  SETTINGS: 'weblock_settings',
  SECURITY: 'weblock_security',
  LOCKED_SITES: 'weblock_locked_sites',
  SCHEMA_VERSION: 'weblock_schema_version',
  FAVICON_CACHE: 'weblock_favicon_cache',
};

export const SESSION_KEYS = {
  UNLOCKED_TABS: 'weblock_unlocked_tabs',
  RATE_LIMIT: 'weblock_rate_limit',
};

/**
 * Helper to safely query chrome.storage.local
 */
export async function localGet(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return await chrome.storage.local.get(keys);
  }
  return {};
}

/**
 * Helper to safely set chrome.storage.local
 */
export async function localSet(items) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set(items);
  }
}

/**
 * Helper to safely query chrome.storage.session
 */
export async function sessionGet(keys) {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    return await chrome.storage.session.get(keys);
  }
  return {};
}

/**
 * Helper to safely set chrome.storage.session
 */
export async function sessionSet(items) {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.set(items);
  }
}

/**
 * Idempotently migrates storage data to ensure backward compatibility:
 * 1. Checks for legacy 'site-lock' format (passwordHash, lockedSites as string array)
 * 2. Ensures all sites have passwordMode ('universal' by default), name, enabled, and favicon fields
 * 3. Ensures weblock_security has recoveryQuestions array initialized
 * 4. Never deletes existing user data
 */
export async function migrateStorage() {
  try {
    const data = await localGet(null); // Retrieve all keys in storage.local

    let needsSave = false;
    const updates = {};

    // 1. Check for legacy 'site-lock' prototype data
    let lockedSites = data[STORAGE_KEYS.LOCKED_SITES] || [];
    if (!data[STORAGE_KEYS.LOCKED_SITES] && Array.isArray(data.lockedSites)) {
      // Convert legacy string array to site objects
      lockedSites = data.lockedSites.map((d) => {
        const domain = typeof d === 'string' ? d.trim().toLowerCase() : d?.domain;
        return {
          id: 'site_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          domain,
          name: formatDomainName(domain),
          enabled: true,
          includeSubdomains: true,
          passwordMode: PASSWORD_MODES.UNIVERSAL,
          protectionMode: PROTECTION_MODES.EVERY_TAB,
          randomChallenge: null,
          security: null,
          faviconUrl: null,
          faviconData: null,
          faviconSource: null,
          createdAt: Date.now(),
        };
      });
      updates[STORAGE_KEYS.LOCKED_SITES] = lockedSites;
      needsSave = true;
    }

    // 2. Check legacy passwordHash
    let security = data[STORAGE_KEYS.SECURITY] || null;
    if (!security && data.passwordHash) {
      // Legacy prototype had an unsalted or raw hash; wrap into security record
      security = {
        algorithm: 'SHA-256-legacy',
        iterations: 1,
        salt: '',
        hash: data.passwordHash,
        recoveryQuestions: [],
        createdAt: Date.now(),
      };
      updates[STORAGE_KEYS.SECURITY] = security;
      needsSave = true;
    }

    // 3. Migrate existing locked sites to schema v2
    if (Array.isArray(lockedSites)) {
      let sitesModified = false;
      const normalizedSites = lockedSites.map((site) => {
        if (typeof site === 'string') {
          sitesModified = true;
          return {
            id: 'site_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            domain: site,
            name: formatDomainName(site),
            enabled: true,
            includeSubdomains: true,
            passwordMode: PASSWORD_MODES.UNIVERSAL,
            security: null,
            faviconUrl: null,
            faviconData: null,
            faviconSource: null,
            createdAt: Date.now(),
          };
        }

        const updated = { ...site };
        if (!updated.id) {
          updated.id = 'site_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          sitesModified = true;
        }
        if (!updated.name) {
          updated.name = formatDomainName(updated.domain);
          sitesModified = true;
        }
        if (typeof updated.enabled !== 'boolean') {
          updated.enabled = true;
          sitesModified = true;
        }
        if (typeof updated.includeSubdomains !== 'boolean') {
          updated.includeSubdomains = true;
          sitesModified = true;
        }
        if (!updated.passwordMode) {
          updated.passwordMode = PASSWORD_MODES.UNIVERSAL;
          sitesModified = true;
        }
        if (!updated.protectionMode) {
          updated.protectionMode = PROTECTION_MODES.EVERY_TAB;
          sitesModified = true;
        }
        if (updated.randomChallenge === undefined) {
          updated.randomChallenge = null;
          sitesModified = true;
        } else if (updated.protectionMode === PROTECTION_MODES.RANDOM && updated.randomChallenge) {
          if (typeof updated.randomChallenge.challengeActive !== 'boolean') {
            updated.randomChallenge.challengeActive = false;
            sitesModified = true;
          }
        }
        if (updated.security === undefined) {
          updated.security = null;
          sitesModified = true;
        }
        if (updated.faviconUrl === undefined) {
          updated.faviconUrl = null;
          sitesModified = true;
        }
        if (updated.faviconData === undefined) {
          updated.faviconData = null;
          sitesModified = true;
        }
        if (updated.faviconSource === undefined) {
          updated.faviconSource = null;
          sitesModified = true;
        }
        return updated;
      });

      if (sitesModified) {
        updates[STORAGE_KEYS.LOCKED_SITES] = normalizedSites;
        needsSave = true;
      }
    }

    // 4. Ensure security record has recoveryQuestions array
    if (security) {
      if (!Array.isArray(security.recoveryQuestions)) {
        security.recoveryQuestions = [];
        updates[STORAGE_KEYS.SECURITY] = security;
        needsSave = true;
      }
    }

    // Mark current schema version
    if (data[STORAGE_KEYS.SCHEMA_VERSION] !== 2) {
      updates[STORAGE_KEYS.SCHEMA_VERSION] = 2;
      needsSave = true;
    }

    if (needsSave) {
      await localSet(updates);
      console.log('[WebLock Migration] Storage migrated to schema v2 without data loss.');
    }

    return { success: true, migrated: needsSave };
  } catch (err) {
    console.error('[WebLock Migration Error]:', err);
    return { success: false, error: err.message };
  }
}

export async function getSettings() {
  const data = await localGet(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
}

export async function saveSettings(newSettings) {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };
  await localSet({ [STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

export async function getSecurity() {
  const data = await localGet(STORAGE_KEYS.SECURITY);
  return data[STORAGE_KEYS.SECURITY] || null;
}

export async function saveSecurity(securityRecord) {
  await localSet({ [STORAGE_KEYS.SECURITY]: securityRecord });
}

export async function getLockedSites() {
  const data = await localGet(STORAGE_KEYS.LOCKED_SITES);
  return data[STORAGE_KEYS.LOCKED_SITES] || [];
}

export async function saveLockedSites(sites) {
  await localSet({ [STORAGE_KEYS.LOCKED_SITES]: sites });
  return sites;
}

export async function getSiteByDomain(domain) {
  if (!domain) return null;
  const sites = await getLockedSites();
  const clean = domain.replace(/^www\./, '').toLowerCase();
  return (
    sites.find((s) => {
      const sDomain = s.domain.replace(/^www\./, '').toLowerCase();
      if (sDomain === clean) return true;
      if (s.includeSubdomains && clean.endsWith('.' + sDomain)) return true;
      return false;
    }) || null
  );
}

export async function addLockedSite({
  domain,
  name,
  includeSubdomains = true,
  passwordMode = PASSWORD_MODES.UNIVERSAL,
  protectionMode = PROTECTION_MODES.EVERY_TAB,
  challengeInterval = CHALLENGE_INTERVALS.WEEKLY,
  security = null,
  faviconUrl = null,
  faviconData = null,
  faviconSource = null,
}) {
  const sites = await getLockedSites();
  const existing = sites.find((s) => s.domain === domain);
  if (existing) {
    return { success: false, error: 'This domain is already locked.' };
  }

  let randomChallenge = null;
  const isRandom = protectionMode === PROTECTION_MODES.RANDOM;
  if (isRandom) {
    const now = Date.now();
    const interval = challengeInterval || CHALLENGE_INTERVALS.WEEKLY;
    randomChallenge = {
      interval,
      lastAuthenticatedAt: now,
      nextChallengeAt: generateNextChallenge(interval, now),
      challengeActive: false,
    };
  }

  const newSite = {
    id: 'site_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    domain,
    name: name || formatDomainName(domain),
    enabled: true,
    includeSubdomains: includeSubdomains !== false,
    passwordMode: passwordMode || PASSWORD_MODES.UNIVERSAL,
    protectionMode: protectionMode || PROTECTION_MODES.EVERY_TAB,
    randomChallenge,
    security: security || null,
    faviconUrl: faviconUrl || null,
    faviconData: faviconData || null,
    faviconSource: faviconSource || null,
    createdAt: Date.now(),
  };

  sites.push(newSite);
  await saveLockedSites(sites);

  if (isRandom) {
    await scheduleChallengeAlarm(newSite);
  }

  return { success: true, site: newSite };
}

export async function updateSite(siteId, updates) {
  const sites = await getLockedSites();
  const index = sites.findIndex((s) => s.id === siteId || s.domain === siteId);
  if (index === -1) {
    return { success: false, error: 'Site not found.' };
  }

  sites[index] = { ...sites[index], ...updates };
  await saveLockedSites(sites);
  return { success: true, site: sites[index] };
}

export async function updateSiteSecurity(siteId, { passwordMode, security }) {
  return await updateSite(siteId, {
    passwordMode: passwordMode || PASSWORD_MODES.UNIVERSAL,
    security: security || null,
  });
}

export async function updateSiteProtection(siteId, {
  passwordMode,
  protectionMode,
  challengeInterval,
  security,
}) {
  const sites = await getLockedSites();
  const index = sites.findIndex((s) => s.id === siteId || s.domain === siteId);
  if (index === -1) {
    return { success: false, error: 'Site not found.' };
  }

  const site = sites[index];
  const oldProtectionMode = site.protectionMode || PROTECTION_MODES.EVERY_TAB;
  const targetProtectionMode = protectionMode || oldProtectionMode;

  const updates = {};
  if (passwordMode !== undefined) {
    updates.passwordMode = passwordMode;
  }
  if (security !== undefined) {
    updates.security = security;
  }

  if (targetProtectionMode === PROTECTION_MODES.RANDOM) {
    updates.protectionMode = PROTECTION_MODES.RANDOM;
    if (oldProtectionMode !== PROTECTION_MODES.RANDOM || !site.randomChallenge) {
      // Switching from every-tab to random: initialize without immediate challenge
      const now = Date.now();
      const interval = challengeInterval || CHALLENGE_INTERVALS.WEEKLY;
      updates.randomChallenge = {
        interval,
        lastAuthenticatedAt: now,
        nextChallengeAt: generateNextChallenge(interval, now),
        challengeActive: false,
      };
      await scheduleChallengeAlarm({ id: site.id, domain: site.domain, randomChallenge: updates.randomChallenge });
    } else {
      // Already random: user updating frequency preference
      // Keep existing nextChallengeAt and challengeActive unchanged!
      const interval = challengeInterval || site.randomChallenge.interval || CHALLENGE_INTERVALS.WEEKLY;
      updates.randomChallenge = {
        ...site.randomChallenge,
        interval,
      };
    }
  } else {
    // Switching to every-tab
    updates.protectionMode = PROTECTION_MODES.EVERY_TAB;
    updates.randomChallenge = null;
    await clearChallengeAlarm(site.id);
  }

  sites[index] = { ...site, ...updates };
  await saveLockedSites(sites);
  return { success: true, site: sites[index] };
}

export async function updateSiteFavicon(siteId, { faviconUrl, faviconData, faviconSource }) {
  return await updateSite(siteId, {
    faviconUrl: faviconUrl || null,
    faviconData: faviconData || null,
    faviconSource: faviconSource || null,
  });
}

export async function removeLockedSite(siteId) {
  const sites = await getLockedSites();
  const targetSite = sites.find((s) => s.id === siteId || s.domain === siteId);
  if (targetSite) {
    await clearChallengeAlarm(targetSite.id);
  }
  const filtered = sites.filter((s) => s.id !== siteId && s.domain !== siteId);
  await saveLockedSites(filtered);
  return filtered;
}

export async function toggleLockedSite(siteId, enabled) {
  const sites = await getLockedSites();
  const site = sites.find((s) => s.id === siteId || s.domain === siteId);
  if (site) {
    site.enabled = typeof enabled === 'boolean' ? enabled : !site.enabled;
    await saveLockedSites(sites);
  }
  return sites;
}

/**
 * Retrieves the session map of currently unlocked tabs from chrome.storage.session.
 * Structure: { [tabId]: { [domain]: ruleId } }
 */
export async function getUnlockedTabs() {
  const data = await sessionGet(SESSION_KEYS.UNLOCKED_TABS);
  return data[SESSION_KEYS.UNLOCKED_TABS] || {};
}

/**
 * Saves the session map of currently unlocked tabs to chrome.storage.session.
 */
export async function saveUnlockedTabs(map) {
  await sessionSet({ [SESSION_KEYS.UNLOCKED_TABS]: map });
}

/**
 * Retrieves rate-limiting state for lock-screen password entries.
 */
export async function getRateLimitState() {
  const data = await sessionGet(SESSION_KEYS.RATE_LIMIT);
  return data[SESSION_KEYS.RATE_LIMIT] || { failedAttempts: 0, lockedUntil: 0 };
}

/**
 * Saves rate-limiting state.
 */
export async function saveRateLimitState(state) {
  await sessionSet({ [SESSION_KEYS.RATE_LIMIT]: state });
}


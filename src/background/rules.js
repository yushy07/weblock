import { DNR_RULE_ID_OFFSET } from '../utils/constants.js';
import { buildDnrRegex } from '../utils/domains.js';
import {
  getSettings,
  getLockedSites,
  getUnlockedTabs,
  saveUnlockedTabs,
} from '../storage/storage.js';

let nextSessionRuleId = DNR_RULE_ID_OFFSET.SESSION;

/**
 * Synchronizes declarativeNetRequest dynamic rules with the current list of locked sites.
 * If protection is disabled globally, all dynamic rules are removed.
 */
export async function syncDynamicRules() {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return;
  }

  const settings = await getSettings();
  const lockedSites = await getLockedSites();

  // Fetch current dynamic rules to safely clean up existing ones
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);

  if (!settings.enabled) {
    // Protection paused: clear all redirect rules
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: [],
      });
    }
    return;
  }

  // Filter only active locked sites
  const activeSites = lockedSites.filter((s) => s.enabled !== false);
  const extId = chrome.runtime.id;
  const lockPageBase = `chrome-extension://${extId}/src/lock/lock.html`;

  const addRules = activeSites.map((site, index) => {
    const ruleId = DNR_RULE_ID_OFFSET.DYNAMIC + index + 1;
    const regexPattern = buildDnrRegex(site.domain, site.includeSubdomains ?? true);

    return {
      id: ruleId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${lockPageBase}?site=${encodeURIComponent(site.domain)}&target=\\0`,
        },
      },
      condition: {
        regexFilter: regexPattern,
        resourceTypes: ['main_frame'],
      },
    };
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  console.log(`[WebLock] Dynamic rules synced. Active locked sites: ${addRules.length}`);
}

/**
 * Adds a session-scoped allow rule for a specific tab ID and domain.
 * This overrides the priority-1 redirect rule with a priority-2 allow rule.
 *
 * @param {number} tabId
 * @param {string} domain
 * @returns {Promise<{ success: boolean, ruleId?: number }>}
 */
export async function addSessionAllowRule(tabId, domain) {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return { success: false, error: 'DNR API unavailable' };
  }

  const unlockedMap = await getUnlockedTabs();
  const tabRecord = unlockedMap[tabId] || {};

  // If already unlocked for this tab and domain, return existing
  if (tabRecord[domain]) {
    return { success: true, ruleId: tabRecord[domain] };
  }

  // Generate a rule ID that is unique
  const existingSessionRules = await chrome.declarativeNetRequest.getSessionRules();
  const existingIds = new Set(existingSessionRules.map((r) => r.id));
  
  let candidateId = nextSessionRuleId++;
  while (existingIds.has(candidateId)) {
    candidateId = nextSessionRuleId++;
  }

  const regexPattern = buildDnrRegex(domain, true);

  const allowRule = {
    id: candidateId,
    priority: 2, // Overrides Priority 1 redirect rule
    action: {
      type: 'allow',
    },
    condition: {
      tabIds: [tabId],
      regexFilter: regexPattern,
      resourceTypes: ['main_frame'],
    },
  };

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: [allowRule],
    });

    tabRecord[domain] = candidateId;
    unlockedMap[tabId] = tabRecord;
    await saveUnlockedTabs(unlockedMap);

    console.log(`[WebLock] Tab ${tabId} unlocked for ${domain} (Session rule #${candidateId})`);
    return { success: true, ruleId: candidateId };
  } catch (err) {
    console.error('[WebLock] Failed to add session allow rule:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Cleans up session rules when a tab is closed.
 * @param {number} tabId
 */
export async function removeSessionRulesForTab(tabId) {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return;
  }

  const unlockedMap = await getUnlockedTabs();
  const tabRecord = unlockedMap[tabId];
  if (!tabRecord) return;

  const ruleIdsToRemove = Object.values(tabRecord);
  if (ruleIdsToRemove.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: ruleIdsToRemove,
      });
      console.log(`[WebLock] Cleaned up session rules for Tab ${tabId}:`, ruleIdsToRemove);
    } catch (err) {
      console.warn('[WebLock] Error removing session rules for tab:', err);
    }
  }

  delete unlockedMap[tabId];
  await saveUnlockedTabs(unlockedMap);
}

/**
 * Removes all active session rules (relocking all currently open tabs).
 */
export async function clearAllSessionRules() {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) {
    return;
  }

  try {
    const existingRules = await chrome.declarativeNetRequest.getSessionRules();
    const removeRuleIds = existingRules.map((r) => r.id);
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds,
      });
    }
    await saveUnlockedTabs({});
    console.log('[WebLock] All session unlock rules cleared.');
  } catch (err) {
    console.error('[WebLock] Failed to clear all session rules:', err);
  }
}

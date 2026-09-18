import {
  MESSAGE_TYPES,
  RATE_LIMIT,
  PASSWORD_MODES,
  PROTECTION_MODES,
  CHALLENGE_INTERVALS,
  ALARM_PREFIX,
} from '../utils/constants.js';
import { normalizeDomain, formatDomainName } from '../utils/domains.js';
import { resolveFavicon } from '../utils/favicons.js';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  hashSecurityAnswer,
  verifySecurityAnswer,
  createSecurityRecord,
} from '../security/crypto.js';
import {
  isChallengeDue,
  resetChallenge,
  scheduleChallengeAlarm,
  clearChallengeAlarm,
  getAlarmName,
} from '../security/random-challenge.js';
import {
  getSettings,
  saveSettings,
  getSecurity,
  saveSecurity,
  getLockedSites,
  saveLockedSites,
  getSiteByDomain,
  addLockedSite,
  updateSite,
  updateSiteSecurity,
  updateSiteProtection,
  updateSiteFavicon,
  removeLockedSite,
  toggleLockedSite,
  getRateLimitState,
  saveRateLimitState,
  migrateStorage,
} from '../storage/storage.js';
import {
  syncDynamicRules,
  addSessionAllowRule,
  removeSessionRulesForTab,
  clearAllSessionRules,
} from './rules.js';

/**
 * Updates the extension toolbar badge to reflect active protection state.
 */
async function updateBadge() {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  const settings = await getSettings();
  const sites = await getLockedSites();
  const activeCount = sites.filter((s) => s.enabled !== false).length;

  if (!settings.enabled) {
    await chrome.action.setBadgeText({ text: 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ color: '#71717A' });
  } else if (activeCount > 0) {
    await chrome.action.setBadgeText({ text: String(activeCount) });
    await chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Checks whether the extension is allowed in Incognito mode.
 */
function isIncognitoAllowed() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.extension?.isAllowedIncognitoAccess) {
      chrome.extension.isAllowedIncognitoAccess((isAllowed) => resolve(!!isAllowed));
    } else {
      resolve(false);
    }
  });
}

/**
 * Reconciles random challenge state across all locked websites.
 * 1. Checks Date.now() against nextChallengeAt.
 * 2. If challenge timestamp has already passed -> sets challengeActive = true and enables DNR redirect rule.
 * 3. If challenge timestamp is in the future -> ensures chrome.alarms alarm exists without shortening cooldown.
 * 4. Persists any changes and synchronizes DNR dynamic rules.
 */
export async function reconcileRandomChallenges() {
  const sites = await getLockedSites();
  const now = Date.now();
  let modified = false;

  for (const site of sites) {
    if (site.protectionMode !== PROTECTION_MODES.RANDOM || !site.randomChallenge) {
      continue;
    }

    const challenge = site.randomChallenge;
    if (typeof challenge.nextChallengeAt === 'number' && now >= challenge.nextChallengeAt) {
      if (!challenge.challengeActive) {
        challenge.challengeActive = true;
        modified = true;
      }
    } else if (typeof challenge.nextChallengeAt === 'number' && now < challenge.nextChallengeAt) {
      if (typeof chrome !== 'undefined' && chrome.alarms?.get) {
        const alarmName = getAlarmName(site.id);
        const existing = await chrome.alarms.get(alarmName);
        if (!existing) {
          await scheduleChallengeAlarm(site);
        }
      }
    }
  }

  if (modified) {
    await saveLockedSites(sites);
  }
  await syncDynamicRules();
}

// Alarm listener for random challenge activations
if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (!alarm?.name || !alarm.name.startsWith(ALARM_PREFIX)) return;
    const siteId = alarm.name.replace(ALARM_PREFIX, '');

    const sites = await getLockedSites();
    const site = sites.find((s) => s.id === siteId);
    if (site && site.protectionMode === PROTECTION_MODES.RANDOM && site.randomChallenge) {
      site.randomChallenge.challengeActive = true;
      await saveLockedSites(sites);
      await syncDynamicRules();
      console.log(`[WebLock] Random challenge activated for ${site.domain} via alarm.`);
    }
  });
}

// Top-level worker reconciliation
reconcileRandomChallenges().catch((e) => console.warn('[WebLock] Reconcile on init error:', e));

// Extension installation & startup hooks
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[WebLock] Installed/Updated:', details.reason);
  await migrateStorage();
  await reconcileRandomChallenges();
  await syncDynamicRules();
  await updateBadge();

  if (details.reason === 'install') {
    // Open dashboard on first install so user can set master password
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[WebLock] Chrome startup.');
  await migrateStorage();
  await reconcileRandomChallenges();
  await syncDynamicRules();
  await updateBadge();
});

// Clean up tab-scoped session rules when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeSessionRulesForTab(tabId);
});

// Main communication message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case MESSAGE_TYPES.GET_STATE: {
          const settings = await getSettings();
          const lockedSites = await getLockedSites();
          const security = await getSecurity();
          const incognitoAllowed = await isIncognitoAllowed();

          const hasRecovery = !!(
            security &&
            Array.isArray(security.recoveryQuestions) &&
            security.recoveryQuestions.length === 3
          );

          // Return sanitized questions (without salt or answerHash)
          const sanitizedQuestions = hasRecovery
            ? security.recoveryQuestions.map((q) => ({
                questionId: q.questionId,
                question: q.question,
              }))
            : [];

          const rateState = await getRateLimitState();
          const now = Date.now();
          const isRateLimited = !!(rateState.lockedUntil && now < rateState.lockedUntil);
          const cooldownSeconds = isRateLimited
            ? Math.ceil((rateState.lockedUntil - now) / 1000)
            : 0;

          sendResponse({
            success: true,
            settings,
            lockedSites,
            hasPassword: !!(security && security.hash),
            hasRecovery,
            recoveryQuestions: sanitizedQuestions,
            isIncognitoAllowed: incognitoAllowed,
            rateLimited: isRateLimited,
            cooldownSeconds,
          });
          break;
        }

        case MESSAGE_TYPES.GET_SITE_DETAILS: {
          const { domain, siteId } = message;
          let site = null;
          if (siteId) {
            const sites = await getLockedSites();
            site = sites.find((s) => s.id === siteId);
          } else if (domain) {
            site = await getSiteByDomain(domain);
          }

          if (!site) {
            sendResponse({ success: false, error: 'Site not found.' });
            return;
          }

          // Return sanitized site details (never expose security hashes)
          sendResponse({
            success: true,
            site: {
              id: site.id,
              domain: site.domain,
              name: site.name,
              enabled: site.enabled,
              passwordMode: site.passwordMode || PASSWORD_MODES.UNIVERSAL,
              protectionMode: site.protectionMode || PROTECTION_MODES.EVERY_TAB,
              challengeInterval: site.randomChallenge?.interval || null,
              challengeActive: !!site.randomChallenge?.challengeActive,
              hasCustomPassword: !!(site.security && site.security.hash),
              faviconUrl: site.faviconUrl,
              faviconData: site.faviconData,
              faviconSource: site.faviconSource,
            },
          });
          break;
        }

        case MESSAGE_TYPES.SET_PASSWORD: {
          const { password } = message;
          if (!password || password.length < 4) {
            sendResponse({ success: false, error: 'Password must be at least 4 characters.' });
            return;
          }

          const secRecord = await createSecurityRecord(password);
          const currentSec = await getSecurity();

          await saveSecurity({
            ...secRecord,
            recoveryQuestions: currentSec?.recoveryQuestions || [],
          });

          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.CHANGE_PASSWORD: {
          const { oldPassword, newPassword } = message;
          const security = await getSecurity();
          if (!security) {
            sendResponse({ success: false, error: 'No existing password configured.' });
            return;
          }

          const isValidOld = await verifyPassword(oldPassword, security);
          if (!isValidOld) {
            sendResponse({ success: false, error: 'Current password is incorrect.' });
            return;
          }

          if (!newPassword || newPassword.length < 4) {
            sendResponse({ success: false, error: 'New password must be at least 4 characters.' });
            return;
          }

          const newSec = await createSecurityRecord(newPassword);
          await saveSecurity({
            ...newSec,
            recoveryQuestions: security.recoveryQuestions || [],
          });

          // Invalidate all temporary unlock sessions immediately
          await clearAllSessionRules();

          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.SETUP_RECOVERY: {
          const { questions, masterPassword } = message;
          const security = await getSecurity();

          if (!security || !security.hash) {
            sendResponse({ success: false, error: 'Set up master password first.' });
            return;
          }

          if (masterPassword) {
            const isValid = await verifyPassword(masterPassword, security);
            if (!isValid) {
              sendResponse({ success: false, error: 'Master password is incorrect.' });
              return;
            }
          }

          if (!Array.isArray(questions) || questions.length !== 3) {
            sendResponse({ success: false, error: 'Exactly 3 recovery questions are required.' });
            return;
          }

          // Verify no duplicate questions
          const questionIds = new Set(questions.map((q) => q.questionId));
          if (questionIds.size !== 3) {
            sendResponse({ success: false, error: 'Please select 3 different questions.' });
            return;
          }

          // Hash each answer with its own independent random salt
          const hashedQuestions = [];
          for (const item of questions) {
            if (!item.answer || item.answer.trim().length < 2) {
              sendResponse({ success: false, error: 'All answers must be at least 2 characters.' });
              return;
            }

            const salt = generateSalt();
            const answerHash = await hashSecurityAnswer(item.answer, salt);
            hashedQuestions.push({
              questionId: item.questionId,
              question: item.question,
              salt,
              answerHash,
            });
          }

          security.recoveryQuestions = hashedQuestions;
          await saveSecurity(security);

          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.VERIFY_RECOVERY_ANSWER: {
          const { questionId, answer } = message;
          const security = await getSecurity();

          if (!security?.recoveryQuestions || security.recoveryQuestions.length === 0) {
            sendResponse({ success: false, error: 'Recovery questions not configured.' });
            return;
          }

          const targetQ = security.recoveryQuestions.find((q) => q.questionId === questionId);
          if (!targetQ) {
            sendResponse({ success: false, error: 'Question not found.' });
            return;
          }

          const isValid = await verifySecurityAnswer(answer, targetQ);
          if (isValid) {
            sendResponse({ success: true, valid: true });
          } else {
            sendResponse({
              success: false,
              valid: false,
              error: 'Incorrect answer. Try another recovery question.',
            });
          }
          break;
        }

        case MESSAGE_TYPES.RESET_PASSWORD_WITH_RECOVERY: {
          const { questionId, answer, newPassword } = message;
          const security = await getSecurity();

          if (!security?.recoveryQuestions || security.recoveryQuestions.length === 0) {
            sendResponse({ success: false, error: 'Recovery questions not configured.' });
            return;
          }

          const targetQ = security.recoveryQuestions.find((q) => q.questionId === questionId);
          if (!targetQ) {
            sendResponse({ success: false, error: 'Question not found.' });
            return;
          }

          const isValid = await verifySecurityAnswer(answer, targetQ);
          if (!isValid) {
            sendResponse({
              success: false,
              error: 'Incorrect answer. Try another recovery question.',
            });
            return;
          }

          if (!newPassword || newPassword.length < 4) {
            sendResponse({ success: false, error: 'New password must be at least 4 characters.' });
            return;
          }

          // Create new master security record with fresh salt and hash
          const newSec = await createSecurityRecord(newPassword);
          await saveSecurity({
            ...newSec,
            recoveryQuestions: security.recoveryQuestions, // Preserve recovery questions!
          });

          // Invalidate all active tab unlocks across browser
          await clearAllSessionRules();

          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.VERIFY_PASSWORD: {
          const { password, domain } = message;
          const security = await getSecurity();

          if (!security) {
            sendResponse({ success: false, error: 'No password configured yet.' });
            return;
          }

          // Check rate limit
          const rateState = await getRateLimitState();
          const now = Date.now();
          if (rateState.lockedUntil && now < rateState.lockedUntil) {
            const remaining = Math.ceil((rateState.lockedUntil - now) / 1000);
            sendResponse({
              success: false,
              rateLimited: true,
              cooldownSeconds: remaining,
              error: `Too many failed attempts. Please wait ${remaining}s.`,
            });
            return;
          }

          // Check if domain uses a site-specific password
          let isValid = false;
          let isSiteSpecific = false;
          let siteName = '';

          if (domain) {
            const site = await getSiteByDomain(domain);
            if (site) {
              siteName = site.name || site.domain;
              if (site.passwordMode === PASSWORD_MODES.SEPARATE && site.security) {
                isSiteSpecific = true;
                isValid = await verifyPassword(password, site.security);
              }
            }
          }

          // Fall back to universal master password check if not a valid site-specific match
          if (!isSiteSpecific) {
            isValid = await verifyPassword(password, security);
          }

          if (isValid) {
            // Reset rate limit on success
            await saveRateLimitState({ failedAttempts: 0, lockedUntil: 0 });
            sendResponse({
              success: true,
              valid: true,
              passwordMode: isSiteSpecific ? PASSWORD_MODES.SEPARATE : PASSWORD_MODES.UNIVERSAL,
            });
          } else {
            const failedAttempts = (rateState.failedAttempts || 0) + 1;
            let lockedUntil = 0;
            let cooldown = 0;

            if (failedAttempts >= RATE_LIMIT.maxAttempts) {
              cooldown = RATE_LIMIT.cooldownSeconds;
              lockedUntil = now + cooldown * 1000;
            }

            await saveRateLimitState({ failedAttempts, lockedUntil });

            const errorMsg = cooldown > 0
              ? `Too many failed attempts. Locked for ${cooldown}s.`
              : isSiteSpecific
              ? `Incorrect password for ${siteName}.`
              : 'Incorrect password. Try again.';

            sendResponse({
              success: false,
              valid: false,
              failedAttempts,
              rateLimited: cooldown > 0,
              cooldownSeconds: cooldown,
              error: errorMsg,
            });
          }
          break;
        }

        case MESSAGE_TYPES.SET_SITE_PASSWORD_MODE: {
          const { siteId, passwordMode, sitePassword, currentAuthPassword } = message;
          const sites = await getLockedSites();
          const site = sites.find((s) => s.id === siteId || s.domain === siteId);

          if (!site) {
            sendResponse({ success: false, error: 'Site not found.' });
            return;
          }

          const masterSec = await getSecurity();

          if (passwordMode === PASSWORD_MODES.SEPARATE) {
            if (!sitePassword || sitePassword.length < 4) {
              sendResponse({ success: false, error: 'Password must be at least 4 characters.' });
              return;
            }

            // If site already had separate password or we require auth, verify
            if (site.passwordMode === PASSWORD_MODES.SEPARATE && site.security) {
              const validSite = await verifyPassword(currentAuthPassword, site.security);
              const validMaster = masterSec ? await verifyPassword(currentAuthPassword, masterSec) : false;
              if (!validSite && !validMaster) {
                sendResponse({ success: false, error: 'Current password authentication failed.' });
                return;
              }
            }

            const newSiteSec = await createSecurityRecord(sitePassword);
            await updateSiteSecurity(site.id, {
              passwordMode: PASSWORD_MODES.SEPARATE,
              security: newSiteSec,
            });

            sendResponse({ success: true, passwordMode: PASSWORD_MODES.SEPARATE });
          } else {
            // Switching to Universal
            if (site.passwordMode === PASSWORD_MODES.SEPARATE && site.security) {
              const validSite = await verifyPassword(currentAuthPassword, site.security);
              const validMaster = masterSec ? await verifyPassword(currentAuthPassword, masterSec) : false;
              if (!validSite && !validMaster) {
                sendResponse({ success: false, error: 'Password authentication failed.' });
                return;
              }
            }

            await updateSiteSecurity(site.id, {
              passwordMode: PASSWORD_MODES.UNIVERSAL,
              security: null,
            });

            sendResponse({ success: true, passwordMode: PASSWORD_MODES.UNIVERSAL });
          }
          break;
        }

        case MESSAGE_TYPES.RESET_SITE_PASSWORD: {
          const { siteId, masterPassword, newSitePassword, resetToUniversal } = message;
          const masterSec = await getSecurity();

          if (!masterSec) {
            sendResponse({ success: false, error: 'Master security not configured.' });
            return;
          }

          const isMasterValid = await verifyPassword(masterPassword, masterSec);
          if (!isMasterValid) {
            sendResponse({ success: false, error: 'Master password is incorrect.' });
            return;
          }

          const sites = await getLockedSites();
          const site = sites.find((s) => s.id === siteId || s.domain === siteId);
          if (!site) {
            sendResponse({ success: false, error: 'Site not found.' });
            return;
          }

          if (resetToUniversal) {
            await updateSiteSecurity(site.id, {
              passwordMode: PASSWORD_MODES.UNIVERSAL,
              security: null,
            });
            sendResponse({ success: true, passwordMode: PASSWORD_MODES.UNIVERSAL });
          } else {
            if (!newSitePassword || newSitePassword.length < 4) {
              sendResponse({ success: false, error: 'New site password must be at least 4 characters.' });
              return;
            }

            const newSiteSec = await createSecurityRecord(newSitePassword);
            await updateSiteSecurity(site.id, {
              passwordMode: PASSWORD_MODES.SEPARATE,
              security: newSiteSec,
            });

            sendResponse({ success: true, passwordMode: PASSWORD_MODES.SEPARATE });
          }
          break;
        }

        case MESSAGE_TYPES.RESOLVE_FAVICON: {
          const { domain } = message;
          const result = await resolveFavicon(domain);
          sendResponse({ success: true, ...result });
          break;
        }

        case MESSAGE_TYPES.UNLOCK_TAB: {
          const { tabId, domain } = message;
          if (!tabId || !domain) {
            sendResponse({ success: false, error: 'tabId and domain are required' });
            return;
          }

          const site = await getSiteByDomain(domain);
          if (site && site.protectionMode === PROTECTION_MODES.RANDOM) {
            // Successful authentication of random challenge:
            // 1. Reset challenge: challengeActive = false, lastAuthenticatedAt = now, new nextChallengeAt (>= lastAuthenticatedAt + 4 days)
            const updatedSite = resetChallenge(site, Date.now());
            await updateSite(updatedSite.id, { randomChallenge: updatedSite.randomChallenge });
            // 2. Schedule next alarm
            await scheduleChallengeAlarm(updatedSite);
            // 3. Remove DNR redirect rule
            await syncDynamicRules();
          }

          const result = await addSessionAllowRule(tabId, domain);
          sendResponse(result);
          break;
        }

        case MESSAGE_TYPES.ADD_SITE: {
          const {
            input,
            includeSubdomains,
            passwordMode,
            protectionMode,
            challengeInterval,
            sitePassword,
          } = message;
          const norm = normalizeDomain(input);
          if (norm.error) {
            sendResponse({ success: false, error: norm.error });
            return;
          }

          // Resolve favicon
          const favResult = await resolveFavicon(norm.domain);

          // Configure site-specific password if requested
          let siteSecurity = null;
          const mode = passwordMode === PASSWORD_MODES.SEPARATE
            ? PASSWORD_MODES.SEPARATE
            : PASSWORD_MODES.UNIVERSAL;

          if (mode === PASSWORD_MODES.SEPARATE) {
            if (!sitePassword || sitePassword.length < 4) {
              sendResponse({ success: false, error: 'Separate password must be at least 4 characters.' });
              return;
            }
            siteSecurity = await createSecurityRecord(sitePassword);
          }

          const addRes = await addLockedSite({
            domain: norm.domain,
            name: formatDomainName(norm.domain),
            includeSubdomains: includeSubdomains ?? true,
            passwordMode: mode,
            protectionMode: protectionMode || PROTECTION_MODES.EVERY_TAB,
            challengeInterval: challengeInterval || CHALLENGE_INTERVALS.WEEKLY,
            security: siteSecurity,
            faviconUrl: favResult.faviconUrl,
            faviconSource: favResult.faviconSource,
          });

          if (!addRes.success) {
            sendResponse(addRes);
            return;
          }

          await syncDynamicRules();
          await updateBadge();
          sendResponse({ success: true, site: addRes.site });
          break;
        }

        case MESSAGE_TYPES.UPDATE_SITE_PROTECTION: {
          const {
            siteId,
            passwordMode,
            protectionMode,
            challengeInterval,
            sitePassword,
            currentAuthPassword,
          } = message;

          const sites = await getLockedSites();
          const site = sites.find((s) => s.id === siteId || s.domain === siteId);
          if (!site) {
            sendResponse({ success: false, error: 'Site not found.' });
            return;
          }

          const masterSec = await getSecurity();
          let newSiteSecurity = site.security;

          if (passwordMode === PASSWORD_MODES.SEPARATE) {
            if (sitePassword) {
              if (sitePassword.length < 4) {
                sendResponse({ success: false, error: 'Password must be at least 4 characters.' });
                return;
              }
              if (site.passwordMode === PASSWORD_MODES.SEPARATE && site.security && currentAuthPassword) {
                const validSite = await verifyPassword(currentAuthPassword, site.security);
                const validMaster = masterSec ? await verifyPassword(currentAuthPassword, masterSec) : false;
                if (!validSite && !validMaster) {
                  sendResponse({ success: false, error: 'Current password authorization failed.' });
                  return;
                }
              }
              newSiteSecurity = await createSecurityRecord(sitePassword);
            }
          } else if (passwordMode === PASSWORD_MODES.UNIVERSAL) {
            if (site.passwordMode === PASSWORD_MODES.SEPARATE && site.security && currentAuthPassword) {
              const validSite = await verifyPassword(currentAuthPassword, site.security);
              const validMaster = masterSec ? await verifyPassword(currentAuthPassword, masterSec) : false;
              if (!validSite && !validMaster) {
                sendResponse({ success: false, error: 'Current password authorization failed.' });
                return;
              }
            }
            newSiteSecurity = null;
          }

          const updateRes = await updateSiteProtection(site.id, {
            passwordMode: passwordMode || site.passwordMode || PASSWORD_MODES.UNIVERSAL,
            protectionMode: protectionMode || site.protectionMode || PROTECTION_MODES.EVERY_TAB,
            challengeInterval: challengeInterval || site.randomChallenge?.interval || CHALLENGE_INTERVALS.WEEKLY,
            security: newSiteSecurity,
          });

          await syncDynamicRules();
          await updateBadge();
          sendResponse(updateRes);
          break;
        }

        case MESSAGE_TYPES.REMOVE_SITE: {
          const { siteId } = message;
          await removeLockedSite(siteId);
          await syncDynamicRules();
          await updateBadge();
          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.TOGGLE_SITE: {
          const { siteId, enabled } = message;
          await toggleLockedSite(siteId, enabled);
          await syncDynamicRules();
          await updateBadge();
          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.UPDATE_SETTINGS: {
          const { settings } = message;
          const updated = await saveSettings(settings);
          await syncDynamicRules();
          await updateBadge();
          sendResponse({ success: true, settings: updated });
          break;
        }

        case MESSAGE_TYPES.CLEAR_ALL_SESSIONS: {
          await clearAllSessionRules();
          sendResponse({ success: true });
          break;
        }

        case MESSAGE_TYPES.CHECK_INCOGNITO: {
          const isAllowed = await isIncognitoAllowed();
          sendResponse({ success: true, isAllowed });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          break;
      }
    } catch (err) {
      console.error('[WebLock SW Error]:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for asynchronous responses
});


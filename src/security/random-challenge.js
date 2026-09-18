import {
  PROTECTION_MODES,
  CHALLENGE_INTERVALS,
  MIN_RANDOM_CHALLENGE_WAIT_MS,
  ALARM_PREFIX,
} from '../utils/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Maps interval string to milliseconds.
 * Restricted to intervals >= 4 days (Weekly, 2 Weeks, Monthly).
 *
 * @param {string} interval - e.g. '7d', '14d', '30d'
 * @returns {number} Milliseconds
 */
export function getIntervalMs(interval) {
  const norm = String(interval || '').toLowerCase().trim();

  switch (norm) {
    case '7d':
    case 'weekly':
    case '1w':
      return 7 * DAY_MS;
    case '14d':
    case '2w':
    case 'two-weeks':
    case '2-weeks':
      return 14 * DAY_MS;
    case '30d':
    case 'monthly':
    case '1m':
    case 'month':
      return 30 * DAY_MS;
    default:
      return 7 * DAY_MS;
  }
}

/**
 * Generates a random future challenge timestamp.
 * Enforces a hard minimum cooldown of 4 days from lastAuthenticatedAt.
 * Range: [lastAuthTime + 4 days, lastAuthTime + intervalMs]
 *
 * @param {string} interval - e.g. '7d', '14d', '30d'
 * @param {number} [lastAuthTime=Date.now()] - Timestamp of last successful auth
 * @returns {number} Target challenge timestamp
 */
export function generateNextChallenge(interval, lastAuthTime = Date.now()) {
  const minWait = MIN_RANDOM_CHALLENGE_WAIT_MS; // 4 days (345,600,000 ms)
  const intervalMs = getIntervalMs(interval);
  const maxWait = Math.max(intervalMs, minWait);

  // Random point between minWait and maxWait
  const randomOffset = minWait + Math.random() * (maxWait - minWait);
  return Math.round(lastAuthTime + randomOffset);
}

/**
 * Checks whether a site currently requires a random challenge.
 *
 * @param {object} site - Locked site object
 * @param {number} [now=Date.now()] - Current timestamp
 * @returns {boolean} True if challenge is due / active
 */
export function isChallengeDue(site, now = Date.now()) {
  if (!site || site.protectionMode !== PROTECTION_MODES.RANDOM) {
    return false;
  }

  const challenge = site.randomChallenge;
  if (!challenge) {
    return true; // Uninitialized random site requires setup / challenge
  }

  if (challenge.challengeActive === true) {
    return true;
  }

  if (typeof challenge.nextChallengeAt === 'number') {
    return now >= challenge.nextChallengeAt;
  }

  return true;
}

/**
 * Initializes random challenge metadata for a site without challenging immediately.
 * Sets challengeActive to false and schedules next challenge between 4 and selected days.
 *
 * @param {object} site
 * @param {number} [now=Date.now()]
 * @returns {object} Updated site object
 */
export function initializeChallenge(siteOrInterval = CHALLENGE_INTERVALS.WEEKLY, now = Date.now()) {
  const isString = typeof siteOrInterval === 'string';
  const interval = isString
    ? siteOrInterval
    : (siteOrInterval?.randomChallenge?.interval || siteOrInterval?.challengeInterval || CHALLENGE_INTERVALS.WEEKLY);
  const nextChallengeAt = generateNextChallenge(interval, now);

  const challengeObj = {
    interval,
    lastAuthenticatedAt: now,
    nextChallengeAt,
    challengeActive: false,
  };

  if (isString) {
    return challengeObj;
  }

  return {
    ...siteOrInterval,
    protectionMode: PROTECTION_MODES.RANDOM,
    randomChallenge: challengeObj,
  };
}

/**
 * Resets challenge state after successful password authentication.
 * Enforces a fresh 4-day minimum cooldown from now.
 *
 * @param {object} site
 * @param {number} [now=Date.now()]
 * @returns {object} Updated site object
 */
export function resetChallenge(site, now = Date.now()) {
  const interval = site.randomChallenge?.interval || CHALLENGE_INTERVALS.WEEKLY;
  const nextChallengeAt = generateNextChallenge(interval, now);

  return {
    ...site,
    randomChallenge: {
      interval,
      lastAuthenticatedAt: now,
      nextChallengeAt,
      challengeActive: false,
    },
  };
}

/**
 * Generates unique alarm identifier for a site.
 *
 * @param {string} siteId
 * @returns {string} Alarm name
 */
export function getAlarmName(siteId) {
  return `${ALARM_PREFIX}${siteId}`;
}

/**
 * Schedules a one-shot chrome.alarms alarm for site challenge.
 *
 * @param {object} site
 * @returns {Promise<boolean>}
 */
export async function scheduleChallengeAlarm(site) {
  if (typeof chrome === 'undefined' || !chrome.alarms?.create) {
    return false;
  }

  if (!site?.id || !site.randomChallenge?.nextChallengeAt) {
    return false;
  }

  const alarmName = getAlarmName(site.id);
  const when = site.randomChallenge.nextChallengeAt;

  try {
    // persistAcrossSessions supported in modern Chrome MV3
    try {
      await chrome.alarms.create(alarmName, {
        when,
        persistAcrossSessions: true,
      });
    } catch {
      // Fallback if persistAcrossSessions property is not recognized by older environment
      await chrome.alarms.create(alarmName, { when });
    }
    return true;
  } catch (err) {
    console.warn(`[WebLock] Error creating alarm for ${site.domain}:`, err);
    return false;
  }
}

/**
 * Clears chrome.alarms alarm for a site.
 *
 * @param {string} siteId
 * @returns {Promise<boolean>}
 */
export async function clearChallengeAlarm(siteId) {
  if (typeof chrome === 'undefined' || !chrome.alarms?.clear || !siteId) {
    return false;
  }

  try {
    await chrome.alarms.clear(getAlarmName(siteId));
    return true;
  } catch (err) {
    console.warn(`[WebLock] Error clearing alarm for ${siteId}:`, err);
    return false;
  }
}

/**
 * Formats interval code into a human-friendly string.
 *
 * @param {string} interval - e.g. '7d', '14d', '30d'
 * @returns {string} Label
 */
export function formatIntervalLabel(interval) {
  const norm = String(interval || '').toLowerCase().trim();
  switch (norm) {
    case '7d':
    case 'weekly':
    case '1w':
      return 'Weekly';
    case '14d':
    case '2w':
    case 'two-weeks':
    case '2-weeks':
      return 'Every 2 weeks';
    case '30d':
    case 'monthly':
    case '1m':
    case 'month':
      return 'Monthly';
    default:
      return 'Weekly';
  }
}

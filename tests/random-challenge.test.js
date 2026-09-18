import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PROTECTION_MODES,
  CHALLENGE_INTERVALS,
  MIN_RANDOM_CHALLENGE_WAIT_MS,
  PASSWORD_MODES,
  ALARM_PREFIX,
} from '../src/utils/constants.js';
import {
  getIntervalMs,
  generateNextChallenge,
  isChallengeDue,
  initializeChallenge,
  resetChallenge,
  getAlarmName,
  scheduleChallengeAlarm,
  clearChallengeAlarm,
  formatIntervalLabel,
} from '../src/security/random-challenge.js';
import { shouldSiteBeRedirected } from '../src/background/rules.js';
import {
  STORAGE_KEYS,
  addLockedSite,
  updateSiteProtection,
  removeLockedSite,
  getLockedSites,
} from '../src/storage/storage.js';

describe('Random Challenge Protection Mode', () => {
  let mockStorage = {};
  let scheduledAlarms = new Map();

  beforeEach(() => {
    mockStorage = {};
    scheduledAlarms = new Map();

    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (keys === null) return { ...mockStorage };
            if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
            if (Array.isArray(keys)) {
              const res = {};
              keys.forEach((k) => {
                if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
              });
              return res;
            }
            return { ...mockStorage };
          }),
          set: vi.fn(async (items) => {
            Object.assign(mockStorage, items);
          }),
        },
      },
      alarms: {
        create: vi.fn(async (name, alarmInfo) => {
          scheduledAlarms.set(name, alarmInfo);
        }),
        clear: vi.fn(async (name) => {
          const existed = scheduledAlarms.has(name);
          scheduledAlarms.delete(name);
          return existed;
        }),
        get: vi.fn(async (name) => {
          const info = scheduledAlarms.get(name);
          return info ? { name, ...info } : null;
        }),
        getAll: vi.fn(async () => {
          return Array.from(scheduledAlarms.entries()).map(([name, info]) => ({ name, ...info }));
        }),
      },
    };
  });

  describe('Mathematical Invariants & 4-Day Minimum Cooldown', () => {
    it('has MIN_RANDOM_CHALLENGE_WAIT_MS exactly equal to 4 days (345,600,000 ms)', () => {
      expect(MIN_RANDOM_CHALLENGE_WAIT_MS).toBe(4 * 24 * 60 * 60 * 1000);
      expect(MIN_RANDOM_CHALLENGE_WAIT_MS).toBe(345600000);
    });

    it('returns accurate millisecond durations for supported intervals', () => {
      expect(getIntervalMs(CHALLENGE_INTERVALS.WEEKLY)).toBe(7 * 24 * 60 * 60 * 1000);
      expect(getIntervalMs(CHALLENGE_INTERVALS.TWO_WEEKS)).toBe(14 * 24 * 60 * 60 * 1000);
      expect(getIntervalMs(CHALLENGE_INTERVALS.MONTHLY)).toBe(30 * 24 * 60 * 60 * 1000);
      // Fallback for unknown defaults to Weekly
      expect(getIntervalMs('unknown')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('enforces nextChallengeAt >= lastAuthenticatedAt + 4 days across 1,000 Weekly trials', () => {
      const now = 1790000000000;
      const minBound = now + MIN_RANDOM_CHALLENGE_WAIT_MS;
      const maxBound = now + 7 * 24 * 60 * 60 * 1000;
      const sampledTimes = new Set();

      for (let i = 0; i < 1000; i++) {
        const nextTime = generateNextChallenge(CHALLENGE_INTERVALS.WEEKLY, now);
        expect(nextTime).toBeGreaterThanOrEqual(minBound);
        expect(nextTime).toBeLessThanOrEqual(maxBound);
        sampledTimes.add(nextTime);
      }

      // Ensure random distribution (multiple distinct points in time)
      expect(sampledTimes.size).toBeGreaterThan(900);
    });

    it('enforces nextChallengeAt within [4 days, 14 days] across 1,000 Two-Weeks trials', () => {
      const now = 1790000000000;
      const minBound = now + MIN_RANDOM_CHALLENGE_WAIT_MS;
      const maxBound = now + 14 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < 1000; i++) {
        const nextTime = generateNextChallenge(CHALLENGE_INTERVALS.TWO_WEEKS, now);
        expect(nextTime).toBeGreaterThanOrEqual(minBound);
        expect(nextTime).toBeLessThanOrEqual(maxBound);
      }
    });

    it('enforces nextChallengeAt within [4 days, 30 days] across 1,000 Monthly trials', () => {
      const now = 1790000000000;
      const minBound = now + MIN_RANDOM_CHALLENGE_WAIT_MS;
      const maxBound = now + 30 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < 1000; i++) {
        const nextTime = generateNextChallenge(CHALLENGE_INTERVALS.MONTHLY, now);
        expect(nextTime).toBeGreaterThanOrEqual(minBound);
        expect(nextTime).toBeLessThanOrEqual(maxBound);
      }
    });

    it('correctly evaluates isChallengeDue boundary conditions', () => {
      const now = 1790000000000;
      const site = {
        protectionMode: PROTECTION_MODES.RANDOM,
        randomChallenge: {
          challengeActive: false,
          nextChallengeAt: now + 1000,
        },
      };

      // 1 ms before due
      expect(isChallengeDue(site, now + 999)).toBe(false);

      // Exactly at due time
      expect(isChallengeDue(site, now + 1000)).toBe(true);

      // Past due time
      expect(isChallengeDue(site, now + 5000)).toBe(true);

      // Already active flag
      site.randomChallenge.challengeActive = true;
      expect(isChallengeDue(site, now)).toBe(true);

      // Non-random sites are not due for random challenge
      expect(isChallengeDue({ protectionMode: PROTECTION_MODES.EVERY_TAB }, now + 999999)).toBe(false);
    });
  });

  describe('Alarm Scheduling & DNR Logic', () => {
    it('generates consistent alarm names with prefix', () => {
      expect(getAlarmName('site-xyz')).toBe(`${ALARM_PREFIX}site-xyz`);
    });

    it('schedules chrome.alarms with exact timestamp and persistAcrossSessions', async () => {
      const site = {
        id: 'site-test-1',
        protectionMode: PROTECTION_MODES.RANDOM,
        randomChallenge: {
          nextChallengeAt: 1790500000000,
        },
      };

      await scheduleChallengeAlarm(site);

      expect(globalThis.chrome.alarms.create).toHaveBeenCalledWith(
        'weblock_challenge_site-test-1',
        {
          when: 1790500000000,
          persistAcrossSessions: true,
        }
      );
      expect(scheduledAlarms.get('weblock_challenge_site-test-1')).toEqual({
        when: 1790500000000,
        persistAcrossSessions: true,
      });
    });

    it('clears alarm when requested', async () => {
      scheduledAlarms.set('weblock_challenge_site-test-1', { when: 12345 });
      await clearChallengeAlarm('site-test-1');
      expect(scheduledAlarms.has('weblock_challenge_site-test-1')).toBe(false);
    });

    it('evaluates shouldSiteBeRedirected without navigation race conditions', () => {
      // 1. Every-tab mode: always redirected when enabled
      const everyTabSite = {
        id: 's1',
        enabled: true,
        protectionMode: PROTECTION_MODES.EVERY_TAB,
      };
      expect(shouldSiteBeRedirected(everyTabSite)).toBe(true);

      // 2. Random mode - Challenge Inactive (user in cooldown period) -> NO DNR redirect
      const randomSiteCooldown = {
        id: 's2',
        enabled: true,
        protectionMode: PROTECTION_MODES.RANDOM,
        randomChallenge: {
          challengeActive: false,
          nextChallengeAt: Date.now() + 100000,
        },
      };
      expect(shouldSiteBeRedirected(randomSiteCooldown)).toBe(false);

      // 3. Random mode - Alarm fired, Challenge Active -> DNR redirect active BEFORE navigation
      const randomSiteActive = {
        id: 's2',
        enabled: true,
        protectionMode: PROTECTION_MODES.RANDOM,
        randomChallenge: {
          challengeActive: true,
          nextChallengeAt: Date.now() - 5000,
        },
      };
      expect(shouldSiteBeRedirected(randomSiteActive)).toBe(true);

      // 4. Disabled sites are never redirected
      expect(shouldSiteBeRedirected({ ...randomSiteActive, enabled: false })).toBe(false);
      expect(shouldSiteBeRedirected({ ...everyTabSite, enabled: false })).toBe(false);
    });
  });

  describe('Challenge Lifecycle & Reset on Authentication', () => {
    it('initializes random challenge with 4-day cooldown upon creation', () => {
      const now = 1790000000000;
      const initial = initializeChallenge(CHALLENGE_INTERVALS.WEEKLY, now);

      expect(initial.interval).toBe(CHALLENGE_INTERVALS.WEEKLY);
      expect(initial.lastAuthenticatedAt).toBe(now);
      expect(initial.challengeActive).toBe(false);
      expect(initial.nextChallengeAt).toBeGreaterThanOrEqual(now + MIN_RANDOM_CHALLENGE_WAIT_MS);
      expect(initial.nextChallengeAt).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 * 1000);
    });

    it('resets challenge on successful authentication: clears active flag and schedules new 4-day minimum cooldown', () => {
      const authTime = 1790500000000;
      const existingSite = {
        id: 'site-alpha',
        protectionMode: PROTECTION_MODES.RANDOM,
        randomChallenge: {
          interval: CHALLENGE_INTERVALS.WEEKLY,
          lastAuthenticatedAt: authTime - 500000000,
          nextChallengeAt: authTime - 1000,
          challengeActive: true,
        },
      };

      const reset = resetChallenge(existingSite, authTime);

      expect(reset.randomChallenge.challengeActive).toBe(false);
      expect(reset.randomChallenge.lastAuthenticatedAt).toBe(authTime);
      expect(reset.randomChallenge.nextChallengeAt).toBeGreaterThanOrEqual(
        authTime + MIN_RANDOM_CHALLENGE_WAIT_MS
      );
      expect(reset.randomChallenge.nextChallengeAt).toBeLessThanOrEqual(
        authTime + 7 * 24 * 60 * 60 * 1000
      );
    });

    it('preserves current cooldown when user changes frequency preference', async () => {
      const now = 1790000000000;
      mockStorage[STORAGE_KEYS.LOCKED_SITES] = [
        {
          id: 'site-freq-test',
          domain: 'example.com',
          name: 'Example',
          enabled: true,
          protectionMode: PROTECTION_MODES.RANDOM,
          randomChallenge: {
            interval: CHALLENGE_INTERVALS.WEEKLY,
            lastAuthenticatedAt: now,
            nextChallengeAt: now + 5 * 24 * 60 * 60 * 1000, // 5 days from now
            challengeActive: false,
          },
        },
      ];

      // User updates preference to Two Weeks (14d)
      await updateSiteProtection('site-freq-test', {
        protectionMode: PROTECTION_MODES.RANDOM,
        challengeInterval: CHALLENGE_INTERVALS.TWO_WEEKS,
      });

      const sites = await getLockedSites();
      const updatedSite = sites[0];

      // Interval updated, but existing nextChallengeAt is NOT prematurely changed
      expect(updatedSite.randomChallenge.interval).toBe(CHALLENGE_INTERVALS.TWO_WEEKS);
      expect(updatedSite.randomChallenge.nextChallengeAt).toBe(now + 5 * 24 * 60 * 60 * 1000);
      expect(updatedSite.randomChallenge.challengeActive).toBe(false);

      // When the user authenticates after next challenge, the new 14d interval window takes effect
      const nextAuthTime = now + 5 * 24 * 60 * 60 * 1000;
      const afterAuth = resetChallenge(updatedSite, nextAuthTime);

      expect(afterAuth.randomChallenge.interval).toBe(CHALLENGE_INTERVALS.TWO_WEEKS);
      expect(afterAuth.randomChallenge.nextChallengeAt).toBeGreaterThanOrEqual(
        nextAuthTime + MIN_RANDOM_CHALLENGE_WAIT_MS
      );
      expect(afterAuth.randomChallenge.nextChallengeAt).toBeLessThanOrEqual(
        nextAuthTime + 14 * 24 * 60 * 60 * 1000
      );
    });
  });

  describe('4-Way Matrix: Password Mode x Protection Mode', () => {
    it('supports Universal Password + Every Tab', async () => {
      const res = await addLockedSite({
        domain: 'uni-every.com',
        passwordMode: PASSWORD_MODES.UNIVERSAL,
        protectionMode: PROTECTION_MODES.EVERY_TAB,
      });

      expect(res.success).toBe(true);
      expect(res.site.passwordMode).toBe(PASSWORD_MODES.UNIVERSAL);
      expect(res.site.protectionMode).toBe(PROTECTION_MODES.EVERY_TAB);
      expect(res.site.randomChallenge).toBeNull();
      expect(shouldSiteBeRedirected(res.site)).toBe(true);
    });

    it('supports Universal Password + Random Challenge', async () => {
      const res = await addLockedSite({
        domain: 'uni-random.com',
        passwordMode: PASSWORD_MODES.UNIVERSAL,
        protectionMode: PROTECTION_MODES.RANDOM,
        challengeInterval: CHALLENGE_INTERVALS.WEEKLY,
      });

      expect(res.success).toBe(true);
      expect(res.site.passwordMode).toBe(PASSWORD_MODES.UNIVERSAL);
      expect(res.site.protectionMode).toBe(PROTECTION_MODES.RANDOM);
      expect(res.site.randomChallenge).toBeDefined();
      expect(res.site.randomChallenge.challengeActive).toBe(false);
      expect(shouldSiteBeRedirected(res.site)).toBe(false);
      expect(scheduledAlarms.has(`weblock_challenge_${res.site.id}`)).toBe(true);
    });

    it('supports Separate Password + Every Tab', async () => {
      const res = await addLockedSite({
        domain: 'sep-every.com',
        passwordMode: PASSWORD_MODES.SEPARATE,
        protectionMode: PROTECTION_MODES.EVERY_TAB,
        security: { hash: 'custom_hash', salt: 's' },
      });

      expect(res.success).toBe(true);
      expect(res.site.passwordMode).toBe(PASSWORD_MODES.SEPARATE);
      expect(res.site.protectionMode).toBe(PROTECTION_MODES.EVERY_TAB);
      expect(res.site.randomChallenge).toBeNull();
      expect(shouldSiteBeRedirected(res.site)).toBe(true);
    });

    it('supports Separate Password + Random Challenge', async () => {
      const res = await addLockedSite({
        domain: 'sep-random.com',
        passwordMode: PASSWORD_MODES.SEPARATE,
        protectionMode: PROTECTION_MODES.RANDOM,
        challengeInterval: CHALLENGE_INTERVALS.MONTHLY,
        security: { hash: 'custom_hash', salt: 's' },
      });

      expect(res.success).toBe(true);
      expect(res.site.passwordMode).toBe(PASSWORD_MODES.SEPARATE);
      expect(res.site.protectionMode).toBe(PROTECTION_MODES.RANDOM);
      expect(res.site.randomChallenge.interval).toBe(CHALLENGE_INTERVALS.MONTHLY);
      expect(shouldSiteBeRedirected(res.site)).toBe(false);
    });

    it('cleans up alarms when a random-mode site is removed', async () => {
      const res = await addLockedSite({
        domain: 'to-remove.com',
        protectionMode: PROTECTION_MODES.RANDOM,
      });

      const alarmKey = `weblock_challenge_${res.site.id}`;
      expect(scheduledAlarms.has(alarmKey)).toBe(true);

      await removeLockedSite(res.site.id);
      expect(scheduledAlarms.has(alarmKey)).toBe(false);
    });

    it('correctly transitions between Every-Tab and Random Challenge modes', async () => {
      const res = await addLockedSite({
        domain: 'switch-test.com',
        protectionMode: PROTECTION_MODES.EVERY_TAB,
      });

      const siteId = res.site.id;
      const alarmKey = `weblock_challenge_${siteId}`;
      expect(scheduledAlarms.has(alarmKey)).toBe(false);

      // Switch to Random
      await updateSiteProtection(siteId, {
        protectionMode: PROTECTION_MODES.RANDOM,
        challengeInterval: CHALLENGE_INTERVALS.WEEKLY,
      });

      let sites = await getLockedSites();
      expect(sites[0].protectionMode).toBe(PROTECTION_MODES.RANDOM);
      expect(sites[0].randomChallenge).toBeDefined();
      expect(scheduledAlarms.has(alarmKey)).toBe(true);

      // Switch back to Every-Tab
      await updateSiteProtection(siteId, {
        protectionMode: PROTECTION_MODES.EVERY_TAB,
      });

      sites = await getLockedSites();
      expect(sites[0].protectionMode).toBe(PROTECTION_MODES.EVERY_TAB);
      expect(sites[0].randomChallenge).toBeNull();
      expect(scheduledAlarms.has(alarmKey)).toBe(false);
    });
  });

  describe('UI Formatting & Interval Labels', () => {
    it('formats interval strings for UI badges and labels', () => {
      expect(formatIntervalLabel(CHALLENGE_INTERVALS.WEEKLY)).toBe('Weekly');
      expect(formatIntervalLabel(CHALLENGE_INTERVALS.TWO_WEEKS)).toBe('Every 2 weeks');
      expect(formatIntervalLabel(CHALLENGE_INTERVALS.MONTHLY)).toBe('Monthly');
      expect(formatIntervalLabel('unknown')).toBe('Weekly');
    });
  });
});

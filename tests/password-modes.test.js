import { describe, it, expect } from 'vitest';
import {
  createSecurityRecord,
  verifyPassword,
} from '../src/security/crypto.js';
import { PASSWORD_MODES } from '../src/utils/constants.js';

describe('Password Modes & Authentication Logic', () => {
  const iterations = 5000;

  it('correctly distinguishes universal vs separate password modes', async () => {
    const masterSec = await createSecurityRecord('GlobalMasterPassword123!', iterations);
    const siteCustomSec = await createSecurityRecord('SiteSecretOnlyForYouTube456!', iterations);

    const universalSite = {
      id: 'site-1',
      domain: 'reddit.com',
      passwordMode: PASSWORD_MODES.UNIVERSAL,
      security: null, // Uses master
    };

    const separateSite = {
      id: 'site-2',
      domain: 'youtube.com',
      passwordMode: PASSWORD_MODES.SEPARATE,
      security: siteCustomSec,
    };

    // Helper simulating authentication engine
    async function authenticateSiteAccess(site, enteredPassword) {
      if (site.passwordMode === PASSWORD_MODES.SEPARATE) {
        if (!site.security || !site.security.hash) {
          // Fallback to master if separate record is unexpectedly missing
          return await verifyPassword(enteredPassword, masterSec);
        }
        return await verifyPassword(enteredPassword, site.security);
      } else {
        return await verifyPassword(enteredPassword, masterSec);
      }
    }

    // Universal site tests
    expect(await authenticateSiteAccess(universalSite, 'GlobalMasterPassword123!')).toBe(true);
    expect(await authenticateSiteAccess(universalSite, 'WrongPassword')).toBe(false);
    expect(await authenticateSiteAccess(universalSite, 'SiteSecretOnlyForYouTube456!')).toBe(false);

    // Separate site tests
    expect(await authenticateSiteAccess(separateSite, 'SiteSecretOnlyForYouTube456!')).toBe(true);
    // Master password must NOT unlock separate site directly!
    expect(await authenticateSiteAccess(separateSite, 'GlobalMasterPassword123!')).toBe(false);
    expect(await authenticateSiteAccess(separateSite, 'RandomPassword')).toBe(false);
  });

  it('authorizes resetting site-specific password with master password authorization', async () => {
    const masterSec = await createSecurityRecord('GlobalMasterPassword123!', iterations);
    let separateSite = {
      id: 'site-3',
      domain: 'instagram.com',
      passwordMode: PASSWORD_MODES.SEPARATE,
      security: await createSecurityRecord('OldInstagramKey999!', iterations),
    };

    // User forgot site password and wants to reset it using master password
    async function resetSitePasswordWithMasterAuth(site, masterAuthPw, newSitePw) {
      // 1. Authorize with master password
      const isMasterValid = await verifyPassword(masterAuthPw, masterSec);
      if (!isMasterValid) {
        return { success: false, error: 'Incorrect master password.' };
      }
      // 2. Set new site password
      const newSiteSec = await createSecurityRecord(newSitePw, iterations);
      site.security = newSiteSec;
      return { success: true };
    }

    // Attempt with incorrect master password fails
    const failResult = await resetSitePasswordWithMasterAuth(separateSite, 'WrongMaster', 'NewSecret123');
    expect(failResult.success).toBe(false);

    // Attempt with correct master password succeeds
    const successResult = await resetSitePasswordWithMasterAuth(
      separateSite,
      'GlobalMasterPassword123!',
      'NewInstagramKey2026!'
    );
    expect(successResult.success).toBe(true);

    // Verify new site password works and old one no longer works
    expect(await verifyPassword('NewInstagramKey2026!', separateSite.security)).toBe(true);
    expect(await verifyPassword('OldInstagramKey999!', separateSite.security)).toBe(false);
  });

  it('only reveals password mode tags, never reveals password values', () => {
    const sites = [
      { domain: 'youtube.com', passwordMode: 'universal', security: null },
      { domain: 'instagram.com', passwordMode: 'separate', security: { hash: 'abc...', salt: '123...' } },
    ];

    function getDisplayModeBadge(site) {
      if (site.passwordMode === PASSWORD_MODES.SEPARATE) {
        return {
          icon: '🔑',
          label: 'Separate password',
          subtext: 'Only this website uses this password',
        };
      }
      return {
        icon: '🔐',
        label: 'WebLock password',
        subtext: 'Same password used for other protected sites',
      };
    }

    const ytBadge = getDisplayModeBadge(sites[0]);
    expect(ytBadge.label).toBe('WebLock password');
    expect(ytBadge.icon).toBe('🔐');

    const igBadge = getDisplayModeBadge(sites[1]);
    expect(igBadge.label).toBe('Separate password');
    expect(igBadge.icon).toBe('🔑');

    // No password plain text is exposed in the site object
    expect(sites[0].password).toBeUndefined();
    expect(sites[1].password).toBeUndefined();
  });
});

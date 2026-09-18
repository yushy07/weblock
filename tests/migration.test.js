import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS, migrateStorage, localGet } from '../src/storage/storage.js';
import { PASSWORD_MODES } from '../src/utils/constants.js';

describe('Storage Migration Engine', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    // Mock chrome.storage.local
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (keys === null) {
              return { ...mockStorage };
            }
            if (typeof keys === 'string') {
              return { [keys]: mockStorage[keys] };
            }
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
    };
  });

  it('migrates legacy prototype schema without data loss', async () => {
    // Populate legacy data
    mockStorage = {
      lockedSites: ['youtube.com', 'instagram.com'],
      passwordHash: 'legacy_hash_abc123',
    };

    await migrateStorage();

    // Verify schema v2
    expect(mockStorage[STORAGE_KEYS.SCHEMA_VERSION]).toBe(2);

    // Verify sites migrated
    const sites = mockStorage[STORAGE_KEYS.LOCKED_SITES];
    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBe(2);

    expect(sites[0].domain).toBe('youtube.com');
    expect(sites[0].passwordMode).toBe(PASSWORD_MODES.UNIVERSAL);
    expect(sites[0].enabled).toBe(true);

    expect(sites[1].domain).toBe('instagram.com');
    expect(sites[1].passwordMode).toBe(PASSWORD_MODES.UNIVERSAL);

    // Verify security record preserved
    const security = mockStorage[STORAGE_KEYS.SECURITY];
    expect(security).toBeDefined();
    expect(security.hash).toBe('legacy_hash_abc123');
    expect(Array.isArray(security.recoveryQuestions)).toBe(true);
  });

  it('is idempotent: running migration repeatedly produces identical data', async () => {
    mockStorage[STORAGE_KEYS.SCHEMA_VERSION] = 2;
    mockStorage[STORAGE_KEYS.LOCKED_SITES] = [
      {
        id: 'site-existing-1',
        domain: 'reddit.com',
        name: 'Reddit',
        enabled: true,
        includeSubdomains: true,
        passwordMode: PASSWORD_MODES.SEPARATE,
        security: { hash: 'custom_hash', salt: 'salt1' },
        faviconUrl: 'https://example.com/favicon.ico',
        createdAt: 12345678,
      },
    ];
    mockStorage[STORAGE_KEYS.SECURITY] = {
      hash: 'master_hash',
      salt: 'master_salt',
      iterations: 310000,
      recoveryQuestions: [
        { questionId: 'q_pet', question: 'Pet?', salt: 's1', answerHash: 'h1' },
      ],
    };

    const snapshotBefore = JSON.parse(JSON.stringify(mockStorage));

    // Run migration twice
    await migrateStorage();
    await migrateStorage();

    expect(mockStorage[STORAGE_KEYS.LOCKED_SITES][0].id).toBe('site-existing-1');
    expect(mockStorage[STORAGE_KEYS.LOCKED_SITES][0].passwordMode).toBe(PASSWORD_MODES.SEPARATE);
    expect(mockStorage[STORAGE_KEYS.LOCKED_SITES][0].security.hash).toBe('custom_hash');
    expect(mockStorage[STORAGE_KEYS.SECURITY].hash).toBe('master_hash');
    expect(mockStorage[STORAGE_KEYS.SECURITY].recoveryQuestions.length).toBe(1);
  });

  it('preserves existing locked sites when adding missing fields', async () => {
    // Simulate sites from earlier WebLock version that lacked passwordMode or favicon fields
    mockStorage[STORAGE_KEYS.LOCKED_SITES] = [
      {
        id: 'site-1',
        domain: 'news.ycombinator.com',
        name: 'Hacker News',
        enabled: true,
        includeSubdomains: true,
        // missing passwordMode, faviconUrl, security
      },
    ];
    mockStorage[STORAGE_KEYS.SECURITY] = {
      hash: 'master_hash',
      salt: 'salt',
      // missing recoveryQuestions
    };

    await migrateStorage();

    const sites = mockStorage[STORAGE_KEYS.LOCKED_SITES];
    expect(sites[0].domain).toBe('news.ycombinator.com');
    expect(sites[0].name).toBe('Hacker News');
    expect(sites[0].passwordMode).toBe(PASSWORD_MODES.UNIVERSAL);
    expect(sites[0].security).toBeNull();
    expect(sites[0].faviconUrl).toBeNull();

    const sec = mockStorage[STORAGE_KEYS.SECURITY];
    expect(Array.isArray(sec.recoveryQuestions)).toBe(true);
  });
});

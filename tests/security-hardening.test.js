import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveFavicon, cacheFavicon } from '../src/utils/favicons.js';
import { STORAGE_KEYS } from '../src/storage/storage.js';

describe('Security Hardening & Polish Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
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
    };
  });

  describe('Open Redirect Defense (Target URL Sanitization)', () => {
    function sanitizeTargetUrl(rawUrl, expectedDomain) {
      if (!rawUrl || typeof rawUrl !== 'string') {
        return `https://${expectedDomain}`;
      }

      try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return `https://${expectedDomain}`;
        }

        const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const cleanExpected = expectedDomain.replace(/^www\./, '').toLowerCase();

        if (hostname === cleanExpected || hostname.endsWith(`.${cleanExpected}`)) {
          return parsed.toString();
        }
      } catch (e) {
        // Malformed URL
      }

      return `https://${expectedDomain}`;
    }

    it('allows valid target URLs matching domain and subdomains', () => {
      expect(sanitizeTargetUrl('https://youtube.com/feed/subscriptions', 'youtube.com'))
        .toBe('https://youtube.com/feed/subscriptions');

      expect(sanitizeTargetUrl('https://music.youtube.com/watch?v=abc', 'youtube.com'))
        .toBe('https://music.youtube.com/watch?v=abc');

      expect(sanitizeTargetUrl('https://www.reddit.com/r/webdev', 'reddit.com'))
        .toBe('https://www.reddit.com/r/webdev');
    });

    it('blocks open redirect to foreign domains and falls back safely', () => {
      // Phishing attempt
      expect(sanitizeTargetUrl('https://evil-phishing.com/steal-creds', 'youtube.com'))
        .toBe('https://youtube.com');

      // Attempted bypass with youtube in query or path
      expect(sanitizeTargetUrl('https://attacker.org/?redirect=youtube.com', 'youtube.com'))
        .toBe('https://youtube.com');
    });

    it('blocks dangerous URL schemes (javascript:, data:, file:)', () => {
      expect(sanitizeTargetUrl('javascript:alert(document.cookie)', 'youtube.com'))
        .toBe('https://youtube.com');

      expect(sanitizeTargetUrl('data:text/html,<script>evil()</script>', 'youtube.com'))
        .toBe('https://youtube.com');

      expect(sanitizeTargetUrl('chrome-extension://someid/evil.html', 'youtube.com'))
        .toBe('https://youtube.com');
    });
  });

  describe('Persistent Favicon Caching (0ms Offline Resolving)', () => {
    it('caches resolved icons and retrieves them from local storage on subsequent queries', async () => {
      // Initially no cache
      const initial = await resolveFavicon('github.com');
      expect(initial.faviconSource).toBe('resolver');

      // Cache the icon
      await cacheFavicon('github.com', 'https://github.com/custom-favicon.ico');

      // Second resolve retrieves directly from persistent cache without network resolver
      const cached = await resolveFavicon('github.com');
      expect(cached.faviconSource).toBe('local-cache');
      expect(cached.faviconUrl).toBe('https://github.com/custom-favicon.ico');
    });
  });
});

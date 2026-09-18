import { describe, it, expect } from 'vitest';
import { normalizeDomain, buildDnrRegex, escapeRegex, formatDomainName } from '../src/utils/domains.js';

describe('Domain Normalization', () => {
  it('normalizes full URLs with protocols and paths', () => {
    expect(normalizeDomain('https://www.youtube.com/watch?v=123').domain).toBe('youtube.com');
    expect(normalizeDomain('http://instagram.com/reels/xyz').domain).toBe('instagram.com');
    expect(normalizeDomain('https://www.reddit.com/r/technology').domain).toBe('reddit.com');
  });

  it('normalizes bare hostnames with leading www', () => {
    expect(normalizeDomain('www.facebook.com').domain).toBe('facebook.com');
    expect(normalizeDomain('facebook.com').domain).toBe('facebook.com');
  });

  it('preserves subdomains when explicitly entered', () => {
    expect(normalizeDomain('music.youtube.com').domain).toBe('music.youtube.com');
    expect(normalizeDomain('https://old.reddit.com/').domain).toBe('old.reddit.com');
  });

  it('disallows browser internal schemes', () => {
    expect(normalizeDomain('chrome://extensions').error).toContain('Internal browser pages');
    expect(normalizeDomain('chrome-extension://xyz/popup.html').error).toContain('Internal browser pages');
    expect(normalizeDomain('edge://settings').error).toContain('Internal browser pages');
    expect(normalizeDomain('about:blank').error).toContain('Internal browser pages');
  });

  it('validates invalid inputs', () => {
    expect(normalizeDomain('').error).toBe('Input cannot be empty.');
    expect(normalizeDomain('not a domain').error).toBeTruthy();
    expect(normalizeDomain('xyz').error).toBe('Domain must include a valid extension (e.g. .com, .org).');
  });
});

describe('DNR Regex Generation', () => {
  it('escapes regex characters properly', () => {
    expect(escapeRegex('reddit.com')).toBe('reddit\\.com');
  });

  it('builds subdomain matching pattern when includeSubdomains is true', () => {
    const pattern = buildDnrRegex('youtube.com', true);
    const regex = new RegExp(pattern);

    expect(regex.test('https://youtube.com')).toBe(true);
    expect(regex.test('http://youtube.com')).toBe(true);
    expect(regex.test('https://www.youtube.com/watch?v=1')).toBe(true);
    expect(regex.test('https://music.youtube.com/')).toBe(true);
    expect(regex.test('https://studio.youtube.com/channel/123')).toBe(true);

    // Should NOT match a different domain that happens to contain youtube.com as a substring
    expect(regex.test('https://notyoutube.com')).toBe(false);
    expect(regex.test('https://myyoutube.com')).toBe(false);
  });

  it('builds exact host matching pattern when includeSubdomains is false', () => {
    const pattern = buildDnrRegex('youtube.com', false);
    const regex = new RegExp(pattern);

    expect(regex.test('https://youtube.com')).toBe(true);
    expect(regex.test('https://youtube.com/feed/trending')).toBe(true);
    // Should NOT match subdomains
    expect(regex.test('https://music.youtube.com')).toBe(false);
  });
});

describe('Format Domain Name', () => {
  it('capitalizes domain nicely', () => {
    expect(formatDomainName('youtube.com')).toBe('Youtube');
    expect(formatDomainName('reddit.com')).toBe('Reddit');
  });
});

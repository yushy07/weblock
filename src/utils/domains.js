/**
 * Utility functions for domain normalization, validation, and regex generation for DNR.
 */

const DISALLOWED_SCHEMES = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'about:',
  'file:',
  'devtools:',
  'view-source:',
  'brave:',
  'opera:',
];

export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes user input into a clean hostname.
 * Examples:
 *   "https://www.youtube.com/watch?v=123" -> "youtube.com"
 *   "www.reddit.com/r/gaming"             -> "reddit.com"
 *   "music.youtube.com"                  -> "music.youtube.com"
 *   "http://localhost:3000"              -> "localhost"
 *
 * @param {string} input - Raw URL or domain string
 * @returns {{ domain: string | null, error: string | null }}
 */
export function normalizeDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    return { domain: null, error: 'Input cannot be empty.' };
  }

  let raw = input.trim().toLowerCase();

  // Check for disallowed browser-internal schemes
  for (const scheme of DISALLOWED_SCHEMES) {
    if (raw.startsWith(scheme)) {
      return { domain: null, error: `Internal browser pages (${scheme}) cannot be locked.` };
    }
  }

  // Ensure scheme is present for standard URL parser
  if (!/^https?:\/\//i.test(raw)) {
    // If user provided path or query without protocol, e.g. "reddit.com/r/web"
    raw = 'https://' + raw;
  }

  let hostname = '';
  try {
    const parsed = new URL(raw);
    hostname = parsed.hostname.toLowerCase();
  } catch (err) {
    return { domain: null, error: 'Invalid URL format.' };
  }

  // Strip leading www.
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  // Basic validation: must have at least one dot or be localhost / ip
  if (!hostname || hostname.length < 2) {
    return { domain: null, error: 'Domain name is too short.' };
  }

  if (hostname !== 'localhost' && !hostname.includes('.')) {
    return { domain: null, error: 'Domain must include a valid extension (e.g. .com, .org).' };
  }

  // Disallow invalid characters
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(hostname)) {
    return { domain: null, error: 'Domain contains invalid characters.' };
  }

  return { domain: hostname, error: null };
}

/**
 * Builds a regex pattern for DNR condition matching.
 * Matches:
 *  - http:// or https://
 *  - with or without subdomains (if includeSubdomains is true)
 *  - optional port
 *  - optional path and query string
 *
 * @param {string} domain - Normalized domain (e.g. "youtube.com")
 * @param {boolean} [includeSubdomains=true]
 * @returns {string} Regex pattern suitable for DNR regexFilter
 */
export function buildDnrRegex(domain, includeSubdomains = true) {
  const escaped = escapeRegex(domain);
  if (includeSubdomains) {
    // Matches youtube.com, www.youtube.com, music.youtube.com, etc.
    return `^https?://(?:[a-zA-Z0-9-]+\\.)*${escaped}(?::[0-9]+)?(?:/.*)?$`;
  }
  // Matches strictly youtube.com
  return `^https?://${escaped}(?::[0-9]+)?(?:/.*)?$`;
}

/**
 * Derives a human-friendly name from a domain.
 * e.g. "youtube.com" -> "YouTube", "reddit.com" -> "Reddit"
 */
export function formatDomainName(domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  const base = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

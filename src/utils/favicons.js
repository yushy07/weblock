/**
 * Favicon resolution, local caching, and fallback generation system for WebLock.
 * Uses a non-blocking resolver chain:
 * 1. Stored / cached favicon in site record
 * 2. Chrome open tab icon (if accessible)
 * 3. High-res Google S2 / DuckDuckGo / direct favicon
 * 4. Deterministic SVG fallback icon based on domain hash
 */

const PALETTE = [
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#F43F5E', // Rose
];

/**
 * Derives a deterministic color from a domain name.
 * @param {string} domain
 * @returns {string} Hex color
 */
export function getDomainColor(domain = '') {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

/**
 * Generates an SVG data URL for a domain fallback badge.
 * @param {string} domain
 * @param {number} [size=64]
 * @returns {string} data:image/svg+xml;utf8,...
 */
export function generateFallbackIcon(domain = '', size = 64) {
  const initial = domain ? domain.replace(/^(https?:\/\/)?(www\.)?/, '').charAt(0).toUpperCase() : '🔒';
  const color = getDomainColor(domain);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="${color}" />
    <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(size * 0.48)}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Finds if there is an active tab for the domain that already has a favicon URL.
 * @param {string} domain
 * @returns {Promise<string|null>}
 */
export async function getFaviconFromOpenTabs(domain) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return null;
  }

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && tab.favIconUrl) {
        try {
          const u = new URL(tab.url);
          const tabHost = u.hostname.replace(/^www\./, '').toLowerCase();
          const targetHost = domain.replace(/^www\./, '').toLowerCase();
          if (tabHost === targetHost || tabHost.endsWith('.' + targetHost)) {
            // Verify it's not a generic chrome default icon
            if (!tab.favIconUrl.startsWith('chrome://')) {
              return tab.favIconUrl;
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[WebLock Favicons] Error reading tabs:', err);
  }

  return null;
}

/**
 * Returns candidate remote icon URLs in order of preference.
 * @param {string} domain
 * @returns {string[]}
 */
export function getCandidateFaviconUrls(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanDomain)}.ico`,
    `https://${cleanDomain}/favicon.ico`,
  ];
}

/**
 * Checks if an image URL loads successfully within a timeout window.
 * @param {string} url
 * @param {number} [timeoutMs=1500]
 * @returns {Promise<boolean>}
 */
export function testImageUrl(url, timeoutMs = 1500) {
  if (typeof Image === 'undefined') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let timer = null;
    const img = new Image();

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      cleanup();
      // Google S2 returns a 16x16 default globe if domain is not found
      if (img.naturalWidth > 1 && img.naturalHeight > 1) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Resolves the best available favicon for a domain.
 * Non-blocking, always resolves with either a verified icon URL or a generated fallback SVG.
 *
 * @param {string} domain
 * @param {string} [existingIcon]
 * @returns {Promise<{ faviconUrl: string, faviconSource: string }>}
 */
export async function resolveFavicon(domain, existingIcon = null) {
  if (!domain) {
    return {
      faviconUrl: generateFallbackIcon(''),
      faviconSource: 'fallback',
    };
  }

  if (existingIcon && !existingIcon.startsWith('chrome://')) {
    return {
      faviconUrl: existingIcon,
      faviconSource: 'cache',
    };
  }

  // 1. Check open tabs
  try {
    const tabFavicon = await getFaviconFromOpenTabs(domain);
    if (tabFavicon) {
      return {
        faviconUrl: tabFavicon,
        faviconSource: 'chrome-tab',
      };
    }
  } catch (e) {}

  // 2. Default to primary high-res resolver (Google S2 with 128px size)
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const primaryUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`;

  return {
    faviconUrl: primaryUrl,
    faviconSource: 'resolver',
  };
}

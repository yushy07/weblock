import { MESSAGE_TYPES } from '../utils/constants.js';
import { getIcon } from '../utils/icons.js';
import { normalizeDomain } from '../utils/domains.js';
import { generateFallbackIcon } from '../utils/favicons.js';

// DOM Elements
const brandIcon = document.getElementById('brandIcon');
const relockIcon = document.getElementById('relockIcon');
const relockAllBtn = document.getElementById('relockAllBtn');
const settingsIcon = document.getElementById('settingsIcon');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusSubtext = document.getElementById('statusSubtext');
const globalToggle = document.getElementById('globalToggle');

// Active Tab Card
const activeTabCard = document.getElementById('activeTabCard');
const activeTabModePill = document.getElementById('activeTabModePill');
const currentTabFavicon = document.getElementById('currentTabFavicon');
const currentTabInitial = document.getElementById('currentTabInitial');
const currentTabDomainText = document.getElementById('currentTabDomainText');
const currentTabActionWrap = document.getElementById('currentTabActionWrap');
const quickLockBtn = document.getElementById('quickLockBtn');
const quickLockPlusIcon = document.getElementById('quickLockPlusIcon');
const alreadyProtectedPill = document.getElementById('alreadyProtectedPill');
const pillCheckIcon = document.getElementById('pillCheckIcon');

// Stats Strip
const badgeLockIcon = document.getElementById('badgeLockIcon');
const lockedCountText = document.getElementById('lockedCountText');
const badgeShieldIcon = document.getElementById('badgeShieldIcon');
const incognitoBadge = document.getElementById('incognitoBadge');
const incognitoText = document.getElementById('incognitoText');

// Mini List
const sitesHeaderCount = document.getElementById('sitesHeaderCount');
const miniSiteList = document.getElementById('miniSiteList');
const openDashboardBtn = document.getElementById('openDashboardBtn');
const arrowRightIcon = document.getElementById('arrowRightIcon');
const popupToast = document.getElementById('popupToast');

let currentState = null;
let currentTabDomain = null;

function showToast(message) {
  popupToast.textContent = message;
  popupToast.style.display = 'block';
  setTimeout(() => {
    popupToast.style.display = 'none';
  }, 2200);
}

function initIcons() {
  brandIcon.innerHTML = getIcon('shield', 18);
  relockIcon.innerHTML = getIcon('refresh', 15);
  settingsIcon.innerHTML = getIcon('settings', 16);
  quickLockPlusIcon.innerHTML = getIcon('plus', 14);
  pillCheckIcon.innerHTML = getIcon('check', 13);
  badgeLockIcon.innerHTML = getIcon('lock', 13);
  badgeShieldIcon.innerHTML = getIcon('shieldCheck', 13);
  arrowRightIcon.innerHTML = getIcon('arrowRight', 15);
}

function renderState() {
  if (!currentState) return;

  const { settings, lockedSites, isIncognitoAllowed } = currentState;

  // Global toggle
  globalToggle.checked = !!settings.enabled;
  if (settings.enabled) {
    statusDot.classList.remove('paused');
    statusText.textContent = 'Protection Active';
    statusSubtext.textContent = 'Enforcing rules via DNR';
  } else {
    statusDot.classList.add('paused');
    statusText.textContent = 'Protection Paused';
    statusSubtext.textContent = 'All rules temporarily bypassed';
  }

  // Stats
  const activeCount = lockedSites.filter((s) => s.enabled !== false).length;
  lockedCountText.textContent = `${activeCount} locked`;
  sitesHeaderCount.textContent = `${lockedSites.length} total`;

  // Incognito
  if (isIncognitoAllowed) {
    incognitoBadge.classList.add('active');
    incognitoText.textContent = 'Incognito ON';
  } else {
    incognitoBadge.classList.remove('active');
    incognitoText.textContent = 'Incognito OFF';
  }

  // Active Tab Context Card
  if (currentTabDomain) {
    activeTabCard.style.display = 'flex';
    currentTabDomainText.textContent = currentTabDomain;

    const matchedSite = lockedSites.find((s) => s.domain === currentTabDomain);

    const faviconUrl = matchedSite?.faviconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(currentTabDomain)}&sz=64`;
    currentTabFavicon.src = faviconUrl;
    currentTabFavicon.onload = () => {
      currentTabFavicon.style.display = 'block';
      currentTabInitial.style.display = 'none';
    };
    currentTabFavicon.onerror = () => {
      currentTabFavicon.src = generateFallbackIcon(currentTabDomain);
      currentTabFavicon.style.display = 'block';
      currentTabInitial.style.display = 'none';
    };

    if (matchedSite) {
      quickLockBtn.style.display = 'none';
      alreadyProtectedPill.style.display = 'inline-flex';
      activeTabModePill.style.display = 'inline-flex';

      const isSeparate = matchedSite.passwordMode === 'separate';
      activeTabModePill.className = `tab-mode-pill ${isSeparate ? 'mode-separate' : 'mode-universal'}`;
      activeTabModePill.innerHTML = isSeparate ? '🔑 Separate password' : '🔐 WebLock password';
    } else {
      quickLockBtn.style.display = 'inline-flex';
      alreadyProtectedPill.style.display = 'none';
      activeTabModePill.style.display = 'none';
    }
  } else {
    activeTabCard.style.display = 'none';
  }

  // Mini Site List
  if (!lockedSites || lockedSites.length === 0) {
    miniSiteList.innerHTML = '<div class="empty-state">No websites locked yet</div>';
  } else {
    miniSiteList.innerHTML = '';
    const topSites = lockedSites.slice(0, 4);

    topSites.forEach((site) => {
      const item = document.createElement('div');
      item.className = 'mini-site-item';

      const wrap = document.createElement('div');
      wrap.className = 'site-info-wrap';

      // Favicon
      const img = document.createElement('img');
      img.className = 'site-mini-favicon';
      img.src = site.faviconUrl || generateFallbackIcon(site.domain);
      img.alt = '';
      img.onerror = () => {
        img.src = generateFallbackIcon(site.domain);
      };

      const domainSpan = document.createElement('span');
      domainSpan.className = 'site-domain-text';
      domainSpan.textContent = site.domain;

      // Mode icon tag
      const modeTag = document.createElement('span');
      modeTag.className = 'mini-mode-tag';
      const isSeparate = site.passwordMode === 'separate';
      modeTag.textContent = isSeparate ? '🔑' : '🔐';
      modeTag.title = isSeparate ? 'Protected by separate password' : 'Protected by WebLock password';

      wrap.appendChild(img);
      wrap.appendChild(domainSpan);
      wrap.appendChild(modeTag);

      // Mini switch
      const label = document.createElement('label');
      label.className = 'modern-switch';
      label.style.width = '36px';
      label.style.height = '20px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = site.enabled !== false;
      checkbox.addEventListener('change', async () => {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.TOGGLE_SITE,
          siteId: site.id,
          enabled: checkbox.checked,
        });
        showToast(checkbox.checked ? `Locked ${site.domain}` : `Paused ${site.domain}`);
        await loadState();
      });

      const slider = document.createElement('span');
      slider.className = 'switch-slider';

      label.appendChild(checkbox);
      label.appendChild(slider);

      item.appendChild(wrap);
      item.appendChild(label);
      miniSiteList.appendChild(item);
    });
  }
}

async function loadState() {
  try {
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (res && res.success) {
      currentState = res;
      renderState();
    }
  } catch (err) {
    console.error('[WebLock Popup] Failed to load state:', err);
  }
}

async function checkActiveTab() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const norm = normalizeDomain(tab.url);
        if (!norm.error && norm.domain) {
          currentTabDomain = norm.domain;
          renderState();
        }
      }
    }
  } catch (err) {
    console.warn('[WebLock Popup] Could not read active tab:', err);
  }
}

// Global toggle listener
globalToggle.addEventListener('change', async () => {
  const newEnabled = globalToggle.checked;
  if (!currentState) return;

  currentState.settings.enabled = newEnabled;
  renderState();

  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.UPDATE_SETTINGS,
    settings: { enabled: newEnabled },
  });

  showToast(newEnabled ? 'Protection enabled' : 'Protection paused');
});

// Quick lock current tab
quickLockBtn.addEventListener('click', async () => {
  if (!currentTabDomain) return;

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.ADD_SITE,
    input: currentTabDomain,
    includeSubdomains: true,
  });

  if (res && res.success) {
    showToast(`Locked ${currentTabDomain}`);
    await loadState();
  }
});

// Relock all sessions
relockAllBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_ALL_SESSIONS });
  showToast('All open tabs relocked');
});

// Navigation
openDashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  window.close();
});

openSettingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html') });
  window.close();
});

// Initialize
initIcons();
loadState();
checkActiveTab();

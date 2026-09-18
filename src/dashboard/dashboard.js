import { MESSAGE_TYPES, POPULAR_SITES, QUESTION_BANK, PASSWORD_MODES } from '../utils/constants.js';
import { getIcon } from '../utils/icons.js';
import { normalizeDomain, formatDomainName } from '../utils/domains.js';
import { resolveFavicon, generateFallbackIcon } from '../utils/favicons.js';

// Navbar Elements
const navBrandIcon = document.getElementById('navBrandIcon');
const navStatusDot = document.getElementById('navStatusDot');
const navStatusText = document.getElementById('navStatusText');
const navSettingsIcon = document.getElementById('navSettingsIcon');
const navSettingsBtn = document.getElementById('navSettingsBtn');
const navPlusIcon = document.getElementById('navPlusIcon');
const openAddModalBtn = document.getElementById('openAddModalBtn');

// Incognito Banner
const incognitoAlertBanner = document.getElementById('incognitoAlertBanner');
const alertIcon = document.getElementById('alertIcon');
const enableIncognitoBtn = document.getElementById('enableIncognitoBtn');

// Metrics
const shieldStatusIcon = document.getElementById('shieldStatusIcon');
const dashStatusDot = document.getElementById('dashStatusDot');
const dashStatusText = document.getElementById('dashStatusText');
const dashGlobalToggle = document.getElementById('dashGlobalToggle');
const dashToggleLabel = document.getElementById('dashToggleLabel');
const lockMetricIcon = document.getElementById('lockMetricIcon');
const dashLockedCount = document.getElementById('dashLockedCount');
const incognitoMetricIcon = document.getElementById('incognitoMetricIcon');
const dashIncognitoDot = document.getElementById('dashIncognitoDot');
const dashIncognitoText = document.getElementById('dashIncognitoText');
const incognitoStatusPill = document.getElementById('incognitoStatusPill');

// Search & Filters
const searchIcon = document.getElementById('searchIcon');
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const filterTabs = document.getElementById('filterTabs');
const sitesList = document.getElementById('sitesList');

// Add Modal
const addModalBackdrop = document.getElementById('addModalBackdrop');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
const modalPlusIcon = document.getElementById('modalPlusIcon');
const modalCloseIcon = document.getElementById('modalCloseIcon');
const presetChips = document.getElementById('presetChips');
const siteUrlInput = document.getElementById('siteUrlInput');
const domainPreviewCard = document.getElementById('domainPreviewCard');
const addPreviewFavicon = document.getElementById('addPreviewFavicon');
const addPreviewInitial = document.getElementById('addPreviewInitial');
const previewSiteName = document.getElementById('previewSiteName');
const previewDomainText = document.getElementById('previewDomainText');
const addSiteError = document.getElementById('addSiteError');
const includeSubdomainsCheck = document.getElementById('includeSubdomainsCheck');
const addSiteForm = document.getElementById('addSiteForm');
const addSiteSeparatePasswordFields = document.getElementById('addSiteSeparatePasswordFields');
const addSitePassword = document.getElementById('addSitePassword');
const addSiteConfirmPassword = document.getElementById('addSiteConfirmPassword');
const addSitePasswordModeRadios = document.getElementsByName('addSitePasswordMode');

// Onboarding Stepper
const onboardingModal = document.getElementById('onboardingModal');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const stepRecovery = document.getElementById('stepRecovery');
const step3 = document.getElementById('step3');
const stepIndicator1 = document.getElementById('stepIndicator1');
const stepIndicator2 = document.getElementById('stepIndicator2');
const stepIndicator3 = document.getElementById('stepIndicator3');
const stepIndicator4 = document.getElementById('stepIndicator4');
const stepLine1 = document.getElementById('stepLine1');
const stepLine2 = document.getElementById('stepLine2');
const stepLine3 = document.getElementById('stepLine3');
const heroLockIcon = document.getElementById('heroLockIcon');
const startSetupBtn = document.getElementById('startSetupBtn');
const onboardingPasswordForm = document.getElementById('onboardingPasswordForm');
const onboardingPw1 = document.getElementById('onboardingPw1');
const onboardingPw2 = document.getElementById('onboardingPw2');
const onboardingPwError = document.getElementById('onboardingPwError');
const strengthMeterWrap = document.getElementById('strengthMeterWrap');
const strengthBarFill = document.getElementById('strengthBarFill');
const strengthLabel = document.getElementById('strengthLabel');
const onboardingRecoveryForm = document.getElementById('onboardingRecoveryForm');
const onboardQ1 = document.getElementById('onboardQ1');
const onboardA1 = document.getElementById('onboardA1');
const onboardQ2 = document.getElementById('onboardQ2');
const onboardA2 = document.getElementById('onboardA2');
const onboardQ3 = document.getElementById('onboardQ3');
const onboardA3 = document.getElementById('onboardA3');
const onboardingRecoveryError = document.getElementById('onboardingRecoveryError');
const starterSitesGrid = document.getElementById('starterSitesGrid');
const finishOnboardingBtn = document.getElementById('finishOnboardingBtn');

// Site Password Settings Modal
const sitePasswordModal = document.getElementById('sitePasswordModal');
const closeSitePasswordModalBtn = document.getElementById('closeSitePasswordModalBtn');
const cancelSitePasswordModalBtn = document.getElementById('cancelSitePasswordModalBtn');
const sitePasswordModalTitle = document.getElementById('sitePasswordModalTitle');
const sitePasswordForm = document.getElementById('sitePasswordForm');
const siteCardPasswordModeRadios = document.getElementsByName('siteCardPasswordMode');
const siteCardAuthGroup = document.getElementById('siteCardAuthGroup');
const siteCardCurrentAuth = document.getElementById('siteCardCurrentAuth');
const siteCardNewPwGroup = document.getElementById('siteCardNewPwGroup');
const siteCardNewPw = document.getElementById('siteCardNewPw');
const siteCardConfirmPw = document.getElementById('siteCardConfirmPw');
const sitePasswordError = document.getElementById('sitePasswordError');

// Site Reset Modal
const dashSiteResetModal = document.getElementById('dashSiteResetModal');
const closeDashSiteResetBtn = document.getElementById('closeDashSiteResetBtn');
const cancelDashSiteResetBtn = document.getElementById('cancelDashSiteResetBtn');
const dashSiteResetTitle = document.getElementById('dashSiteResetTitle');
const dashSiteResetForm = document.getElementById('dashSiteResetForm');
const dashSiteResetMasterPw = document.getElementById('dashSiteResetMasterPw');
const dashResetChoiceRadios = document.getElementsByName('dashResetChoice');
const dashResetNewPwGroup = document.getElementById('dashResetNewPwGroup');
const dashResetNewPw = document.getElementById('dashResetNewPw');
const dashResetConfirmPw = document.getElementById('dashResetConfirmPw');
const dashSiteResetError = document.getElementById('dashSiteResetError');

// Toast Notice
const dashToast = document.getElementById('dashToast');

let currentState = null;
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'active' | 'paused'
let selectedSiteForModal = null;
let activeDropdown = null;
const selectedStarterSites = new Set(['youtube.com', 'instagram.com', 'reddit.com']);

function showToast(message) {
  dashToast.textContent = message;
  dashToast.style.display = 'block';
  setTimeout(() => {
    dashToast.style.display = 'none';
  }, 2600);
}

function initIcons() {
  navBrandIcon.innerHTML = getIcon('shield', 20);
  navSettingsIcon.innerHTML = getIcon('settings', 16);
  navPlusIcon.innerHTML = getIcon('plus', 16);
  alertIcon.innerHTML = getIcon('alertTriangle', 20);
  shieldStatusIcon.innerHTML = getIcon('shieldCheck', 20);
  lockMetricIcon.innerHTML = getIcon('lock', 20);
  incognitoMetricIcon.innerHTML = getIcon('eyeOff', 20);
  searchIcon.innerHTML = getIcon('search', 16);
  modalPlusIcon.innerHTML = getIcon('lock', 18);
  modalCloseIcon.innerHTML = getIcon('close', 18);
  heroLockIcon.innerHTML = getIcon('lock', 32);
}

// Render Dashboard
function renderDashboard() {
  if (!currentState) return;

  const { settings, lockedSites, isIncognitoAllowed } = currentState;

  // Master Protection
  dashGlobalToggle.checked = !!settings.enabled;
  if (settings.enabled) {
    dashStatusDot.classList.remove('paused');
    dashStatusText.textContent = 'Active';
    dashToggleLabel.textContent = 'Protection Enabled';
    navStatusDot.classList.remove('paused');
    navStatusText.textContent = 'Protection Active';
  } else {
    dashStatusDot.classList.add('paused');
    dashStatusText.textContent = 'Paused';
    dashToggleLabel.textContent = 'Protection Paused';
    navStatusDot.classList.add('paused');
    navStatusText.textContent = 'Protection Paused';
  }

  // Count
  const activeCount = lockedSites.filter((s) => s.enabled !== false).length;
  dashLockedCount.textContent = activeCount;

  // Incognito
  if (isIncognitoAllowed) {
    incognitoAlertBanner.style.display = 'none';
    dashIncognitoDot.classList.remove('paused');
    dashIncognitoText.textContent = 'Protected';
    incognitoStatusPill.textContent = 'Private Protected';
    incognitoStatusPill.className = 'pill-badge pill-purple';
  } else {
    incognitoAlertBanner.style.display = 'flex';
    dashIncognitoDot.classList.add('paused');
    dashIncognitoText.textContent = 'Disabled';
    incognitoStatusPill.textContent = 'Permission Required';
    incognitoStatusPill.className = 'pill-badge';
  }

  // Filtering
  let list = lockedSites;
  if (activeFilter === 'active') {
    list = list.filter((s) => s.enabled !== false);
  } else if (activeFilter === 'paused') {
    list = list.filter((s) => s.enabled === false);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (s) => s.domain.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q))
    );
  }

  renderSitesList(list);
}

// Render Sites Table / List
function renderSitesList(sites) {
  closeAllDropdowns();

  if (!sites || sites.length === 0) {
    sitesList.innerHTML = `
      <div class="empty-sites-state">
        <div class="empty-icon">${getIcon('globe', 26)}</div>
        <div class="empty-title">${searchQuery ? 'No matching websites' : 'No websites protected yet'}</div>
        <div class="empty-desc">${searchQuery ? 'Try clearing your search query' : 'Add websites to keep tabs focused and distraction-free.'}</div>
        ${!searchQuery ? '<button class="btn btn-primary btn-sm glow-btn" id="emptyAddBtn">+ Add Website</button>' : ''}
      </div>
    `;

    const emptyAddBtn = document.getElementById('emptyAddBtn');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', openAddModal);
    }
    return;
  }

  sitesList.innerHTML = '';
  sites.forEach((site) => {
    const row = document.createElement('div');
    row.className = 'site-row';

    const meta = document.createElement('div');
    meta.className = 'site-meta';

    // Dynamic favicon avatar with fallback
    const avatar = document.createElement('div');
    avatar.className = 'site-favicon-avatar';

    const img = document.createElement('img');
    const fallbackSvg = generateFallbackIcon(site.domain, 48);
    img.src = site.faviconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=64`;

    const initial = document.createElement('span');
    initial.className = 'site-initial-text';
    initial.textContent = site.domain.charAt(0).toUpperCase();
    initial.style.display = 'none';

    img.onload = () => {
      if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
        img.src = fallbackSvg;
      }
    };
    img.onerror = () => {
      img.src = fallbackSvg;
      img.onerror = () => {
        img.style.display = 'none';
        initial.style.display = 'inline';
      };
    };

    avatar.appendChild(img);
    avatar.appendChild(initial);

    const info = document.createElement('div');
    info.className = 'site-info';

    const domainLine = document.createElement('div');
    domainLine.className = 'site-domain-line';

    const domainName = document.createElement('span');
    domainName.className = 'site-domain-name';
    domainName.textContent = site.name || formatDomainName(site.domain);
    domainLine.appendChild(domainName);

    const domainHost = document.createElement('span');
    domainHost.style.color = 'var(--text-secondary)';
    domainHost.style.fontSize = '12px';
    domainHost.textContent = `(${site.domain})`;
    domainLine.appendChild(domainHost);

    if (site.includeSubdomains !== false) {
      const tag = document.createElement('span');
      tag.className = 'subdomain-tag';
      tag.textContent = `*.${site.domain}`;
      domainLine.appendChild(tag);
    }

    // Password Mode Tag (Reveal password mode only, never values)
    const isSeparate = site.passwordMode === PASSWORD_MODES.SEPARATE;
    const modeBadge = document.createElement('span');
    modeBadge.className = `site-mode-badge ${isSeparate ? 'separate' : 'universal'}`;
    modeBadge.textContent = isSeparate ? '🔑 Separate password' : '🔐 WebLock password';
    domainLine.appendChild(modeBadge);

    const dateLine = document.createElement('div');
    dateLine.className = 'site-date';
    dateLine.textContent = site.createdAt
      ? `Protected since ${new Date(site.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'Protected';

    info.appendChild(domainLine);
    info.appendChild(dateLine);
    meta.appendChild(avatar);
    meta.appendChild(info);

    // Actions Container
    const actions = document.createElement('div');
    actions.className = 'site-row-actions';

    // Protection switch
    const switchLabel = document.createElement('label');
    switchLabel.className = 'modern-switch';
    switchLabel.title = site.enabled !== false ? 'Protection ON' : 'Protection Paused';

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
      await loadDashboardState();
    });

    const slider = document.createElement('span');
    slider.className = 'switch-slider';
    switchLabel.appendChild(checkbox);
    switchLabel.appendChild(slider);
    actions.appendChild(switchLabel);

    // Context Action Menu [⋮]
    const menuWrap = document.createElement('div');
    menuWrap.className = 'menu-wrap';

    const menuBtn = document.createElement('button');
    menuBtn.className = 'action-icon-btn';
    menuBtn.title = 'Site actions';
    menuBtn.innerHTML = getIcon('moreVertical', 16);

    const dropdown = document.createElement('div');
    dropdown.className = 'action-menu-dropdown';
    dropdown.style.display = 'none';

    // 1. Change password / Switch mode
    const changePwBtn = document.createElement('button');
    changePwBtn.type = 'button';
    changePwBtn.className = 'menu-item';
    changePwBtn.innerHTML = `${getIcon('key', 14)} <span>${isSeparate ? 'Change password' : 'Set separate password'}</span>`;
    changePwBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSitePasswordModal(site);
    });
    dropdown.appendChild(changePwBtn);

    // 2. If separate, provide reset via master password
    if (isSeparate) {
      const resetSiteBtn = document.createElement('button');
      resetSiteBtn.type = 'button';
      resetSiteBtn.className = 'menu-item';
      resetSiteBtn.innerHTML = `${getIcon('refresh', 14)} <span>Reset site password</span>`;
      resetSiteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDashSiteResetModal(site);
      });
      dropdown.appendChild(resetSiteBtn);
    }

    // 3. Test protection
    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'menu-item';
    testBtn.innerHTML = `${getIcon('externalLink', 14)} <span>Test protection</span>`;
    testBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: `https://${site.domain}` });
    });
    dropdown.appendChild(testBtn);

    // 4. Copy domain
    const copyItem = document.createElement('button');
    copyItem.type = 'button';
    copyItem.className = 'menu-item';
    copyItem.innerHTML = `${getIcon('copy', 14)} <span>Copy domain</span>`;
    copyItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(site.domain);
      showToast(`Copied ${site.domain}`);
      closeAllDropdowns();
    });
    dropdown.appendChild(copyItem);

    // 5. Remove website
    const removeItem = document.createElement('button');
    removeItem.type = 'button';
    removeItem.className = 'menu-item danger';
    removeItem.innerHTML = `${getIcon('trash', 14)} <span>Remove website</span>`;
    removeItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      if (confirm(`Remove ${site.domain} from WebLock protection?`)) {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.REMOVE_SITE,
          siteId: site.id,
        });
        showToast(`Removed ${site.domain}`);
        await loadDashboardState();
      }
    });
    dropdown.appendChild(removeItem);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCurrentlyOpen = dropdown.style.display === 'flex';
      closeAllDropdowns();
      if (!isCurrentlyOpen) {
        dropdown.style.display = 'flex';
        activeDropdown = dropdown;
      }
    });

    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(dropdown);
    actions.appendChild(menuWrap);

    row.appendChild(meta);
    row.appendChild(actions);
    sitesList.appendChild(row);
  });
}

function closeAllDropdowns() {
  if (activeDropdown) {
    activeDropdown.style.display = 'none';
    activeDropdown = null;
  }
}

document.addEventListener('click', () => {
  closeAllDropdowns();
});

// Render Presets
function renderPresets() {
  presetChips.innerHTML = '';
  POPULAR_SITES.forEach((preset) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'preset-chip';

    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(preset.domain)}&sz=32`;
    img.onerror = () => { img.style.display = 'none'; };

    const nameSpan = document.createElement('span');
    nameSpan.textContent = preset.name;

    chip.appendChild(img);
    chip.appendChild(nameSpan);

    chip.addEventListener('click', () => {
      siteUrlInput.value = preset.domain;
      updateDomainPreview(preset.domain);
    });
    presetChips.appendChild(chip);
  });
}

// Render Starter Sites for Onboarding
function renderStarterSites() {
  starterSitesGrid.innerHTML = '';
  POPULAR_SITES.forEach((site) => {
    const chip = document.createElement('div');
    chip.className = 'starter-chip' + (selectedStarterSites.has(site.domain) ? ' selected' : '');

    const left = document.createElement('div');
    left.className = 'starter-chip-left';

    const img = document.createElement('img');
    img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=32`;
    img.onerror = () => { img.style.display = 'none'; };

    const name = document.createElement('span');
    name.className = 'starter-chip-name';
    name.textContent = site.name;

    left.appendChild(img);
    left.appendChild(name);

    const check = document.createElement('span');
    check.className = 'check-icon';
    check.innerHTML = selectedStarterSites.has(site.domain) ? getIcon('check', 16) : '';

    chip.appendChild(left);
    chip.appendChild(check);

    chip.addEventListener('click', () => {
      if (selectedStarterSites.has(site.domain)) {
        selectedStarterSites.delete(site.domain);
        chip.classList.remove('selected');
        check.innerHTML = '';
      } else {
        selectedStarterSites.add(site.domain);
        chip.classList.add('selected');
        check.innerHTML = getIcon('check', 16);
      }
    });

    starterSitesGrid.appendChild(chip);
  });
}

// Populate Onboarding Recovery Questions Dropdown
function initRecoveryQuestionSelects() {
  const selects = [onboardQ1, onboardQ2, onboardQ3];
  selects.forEach((select, idx) => {
    select.innerHTML = '';
    QUESTION_BANK.forEach((q, qIdx) => {
      const opt = document.createElement('option');
      opt.value = q.id;
      opt.textContent = q.question;
      if (qIdx === idx) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  });
}

// Live Domain Preview & Favicon in Add Modal
async function updateDomainPreview(value) {
  if (!value || !value.trim()) {
    domainPreviewCard.style.display = 'none';
    addSiteError.style.display = 'none';
    return;
  }

  const norm = normalizeDomain(value);
  if (!norm.error && norm.domain) {
    domainPreviewCard.style.display = 'flex';
    previewDomainText.textContent = norm.domain;
    previewSiteName.textContent = formatDomainName(norm.domain);
    addSiteError.style.display = 'none';

    // Resolve favicon preview
    const favResult = await resolveFavicon(norm.domain);
    addPreviewFavicon.src = favResult.faviconUrl;
    addPreviewFavicon.onload = () => {
      addPreviewFavicon.style.display = 'block';
      addPreviewInitial.style.display = 'none';
    };
    addPreviewFavicon.onerror = () => {
      addPreviewFavicon.src = generateFallbackIcon(norm.domain, 32);
      addPreviewFavicon.onload = () => {
        addPreviewFavicon.style.display = 'block';
        addPreviewInitial.style.display = 'none';
      };
      addPreviewFavicon.onerror = () => {
        addPreviewFavicon.style.display = 'none';
        addPreviewInitial.style.display = 'inline';
        addPreviewInitial.textContent = norm.domain.charAt(0).toUpperCase();
      };
    };
  } else {
    domainPreviewCard.style.display = 'none';
  }
}

function openAddModal() {
  addModalBackdrop.style.display = 'flex';
  siteUrlInput.value = '';
  domainPreviewCard.style.display = 'none';
  addSiteError.style.display = 'none';
  includeSubdomainsCheck.checked = true;

  // Reset password mode radios to universal
  for (const r of addSitePasswordModeRadios) {
    r.checked = r.value === 'universal';
  }
  addSiteSeparatePasswordFields.style.display = 'none';
  addSitePassword.value = '';
  addSiteConfirmPassword.value = '';

  siteUrlInput.focus();
}

function closeAddModal() {
  addModalBackdrop.style.display = 'none';
}

// Password mode radio listeners in Add Modal
for (const r of addSitePasswordModeRadios) {
  r.addEventListener('change', () => {
    if (r.value === 'separate' && r.checked) {
      addSiteSeparatePasswordFields.style.display = 'block';
    } else if (r.checked) {
      addSiteSeparatePasswordFields.style.display = 'none';
    }
  });
}

// Password Strength Meter
onboardingPw1.addEventListener('input', () => {
  const val = onboardingPw1.value;
  if (!val) {
    strengthMeterWrap.style.display = 'none';
    return;
  }

  strengthMeterWrap.style.display = 'flex';

  if (val.length < 4) {
    strengthBarFill.style.width = '20%';
    strengthBarFill.style.background = 'var(--danger)';
    strengthLabel.textContent = 'Too short';
    strengthLabel.style.color = 'var(--danger)';
  } else if (val.length < 8) {
    strengthBarFill.style.width = '55%';
    strengthBarFill.style.background = 'var(--warning)';
    strengthLabel.textContent = 'Good';
    strengthLabel.style.color = 'var(--warning)';
  } else {
    strengthBarFill.style.width = '100%';
    strengthBarFill.style.background = 'var(--success)';
    strengthLabel.textContent = 'Strong';
    strengthLabel.style.color = 'var(--success)';
  }
});

// Load state
async function loadDashboardState() {
  try {
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (res && res.success) {
      currentState = res;

      // Onboarding check
      if (!res.hasPassword) {
        onboardingModal.style.display = 'flex';
        step1.style.display = 'block';
        step2.style.display = 'none';
        stepRecovery.style.display = 'none';
        step3.style.display = 'none';
      } else if (!res.hasRecovery) {
        // Master password exists but recovery not yet configured
        onboardingModal.style.display = 'flex';
        step1.style.display = 'none';
        step2.style.display = 'none';
        stepRecovery.style.display = 'block';
        step3.style.display = 'none';
        stepIndicator1.classList.add('active');
        stepLine1.classList.add('active');
        stepIndicator2.classList.add('active');
        stepLine2.classList.add('active');
        stepIndicator3.classList.add('active');
        initRecoveryQuestionSelects();
      } else {
        onboardingModal.style.display = 'none';
      }

      renderDashboard();
    }
  } catch (err) {
    console.error('[WebLock Dashboard] Failed to load state:', err);
  }
}

// Search & Filter Listeners
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  searchClearBtn.style.display = searchQuery ? 'block' : 'none';
  renderDashboard();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClearBtn.style.display = 'none';
  renderDashboard();
  searchInput.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== siteUrlInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

filterTabs.querySelectorAll('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderDashboard();
  });
});

siteUrlInput.addEventListener('input', (e) => {
  updateDomainPreview(e.target.value);
});

// Add Site Submit
addSiteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addSiteError.style.display = 'none';

  const val = siteUrlInput.value.trim();
  if (!val) return;

  const includeSubdomains = includeSubdomainsCheck.checked;

  let mode = PASSWORD_MODES.UNIVERSAL;
  for (const r of addSitePasswordModeRadios) {
    if (r.checked && r.value === 'separate') {
      mode = PASSWORD_MODES.SEPARATE;
    }
  }

  let sitePassword = null;
  if (mode === PASSWORD_MODES.SEPARATE) {
    sitePassword = addSitePassword.value;
    const confirmPw = addSiteConfirmPassword.value;

    if (!sitePassword || sitePassword.length < 4) {
      addSiteError.textContent = 'Separate password must be at least 4 characters long.';
      addSiteError.style.display = 'block';
      return;
    }

    if (sitePassword !== confirmPw) {
      addSiteError.textContent = 'Passwords do not match.';
      addSiteError.style.display = 'block';
      return;
    }
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.ADD_SITE,
    input: val,
    includeSubdomains,
    passwordMode: mode,
    sitePassword,
  });

  if (!res || !res.success) {
    addSiteError.textContent = res?.error || 'Failed to add website.';
    addSiteError.style.display = 'block';
    return;
  }

  closeAddModal();
  showToast(`Locked ${res.site?.domain || val}`);
  await loadDashboardState();
});

// Global Protection Toggle
dashGlobalToggle.addEventListener('change', async () => {
  const newEnabled = dashGlobalToggle.checked;
  if (!currentState) return;

  currentState.settings.enabled = newEnabled;
  renderDashboard();

  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.UPDATE_SETTINGS,
    settings: { enabled: newEnabled },
  });

  showToast(newEnabled ? 'Master protection enabled' : 'Master protection paused');
});

enableIncognitoBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

openAddModalBtn.addEventListener('click', openAddModal);
closeAddModalBtn.addEventListener('click', closeAddModal);
cancelAddModalBtn.addEventListener('click', closeAddModal);
addModalBackdrop.addEventListener('click', (e) => {
  if (e.target === addModalBackdrop) closeAddModal();
});

navSettingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html') });
});

// Onboarding Step 1 -> 2
startSetupBtn.addEventListener('click', () => {
  step1.style.display = 'none';
  step2.style.display = 'block';
  stepIndicator1.classList.remove('active');
  stepLine1.classList.add('active');
  stepIndicator2.classList.add('active');
  onboardingPw1.focus();
});

// Onboarding Step 2 -> 3 (Master Password -> Recovery Setup)
onboardingPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  onboardingPwError.style.display = 'none';

  const pw1 = onboardingPw1.value;
  const pw2 = onboardingPw2.value;

  if (pw1.length < 4) {
    onboardingPwError.textContent = 'Password must be at least 4 characters long.';
    onboardingPwError.style.display = 'block';
    return;
  }

  if (pw1 !== pw2) {
    onboardingPwError.textContent = 'Passwords do not match.';
    onboardingPwError.style.display = 'block';
    return;
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SET_PASSWORD,
    password: pw1,
  });

  if (!res || !res.success) {
    onboardingPwError.textContent = res?.error || 'Failed to set password.';
    onboardingPwError.style.display = 'block';
    return;
  }

  // Move to Step 3: Security Recovery
  step2.style.display = 'none';
  stepRecovery.style.display = 'block';
  stepIndicator2.classList.remove('active');
  stepLine2.classList.add('active');
  stepIndicator3.classList.add('active');
  initRecoveryQuestionSelects();
  onboardA1.focus();
});

// Onboarding Step 3 -> 4 (Recovery Setup -> Starter Sites)
onboardingRecoveryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  onboardingRecoveryError.style.display = 'none';

  const q1 = onboardQ1.value;
  const a1 = onboardA1.value.trim();
  const q2 = onboardQ2.value;
  const a2 = onboardA2.value.trim();
  const q3 = onboardQ3.value;
  const a3 = onboardA3.value.trim();

  // Check distinct questions
  if (q1 === q2 || q1 === q3 || q2 === q3) {
    onboardingRecoveryError.textContent = 'Please choose 3 different recovery questions.';
    onboardingRecoveryError.style.display = 'block';
    return;
  }

  if (a1.length < 2 || a2.length < 2 || a3.length < 2) {
    onboardingRecoveryError.textContent = 'Each answer must be at least 2 characters long.';
    onboardingRecoveryError.style.display = 'block';
    return;
  }

  const questionsPayload = [
    { questionId: q1, question: onboardQ1.options[onboardQ1.selectedIndex].text, answer: a1 },
    { questionId: q2, question: onboardQ2.options[onboardQ2.selectedIndex].text, answer: a2 },
    { questionId: q3, question: onboardQ3.options[onboardQ3.selectedIndex].text, answer: a3 },
  ];

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETUP_RECOVERY,
    questions: questionsPayload,
  });

  if (!res || !res.success) {
    onboardingRecoveryError.textContent = res?.error || 'Failed to save recovery questions.';
    onboardingRecoveryError.style.display = 'block';
    return;
  }

  // Move to Step 4: Starter Sites
  stepRecovery.style.display = 'none';
  step3.style.display = 'block';
  stepIndicator3.classList.remove('active');
  stepLine3.classList.add('active');
  stepIndicator4.classList.add('active');
  renderStarterSites();
});

// Onboarding Finish
finishOnboardingBtn.addEventListener('click', async () => {
  finishOnboardingBtn.disabled = true;
  finishOnboardingBtn.textContent = 'Configuring rules...';

  for (const domain of selectedStarterSites) {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ADD_SITE,
      input: domain,
      includeSubdomains: true,
      passwordMode: PASSWORD_MODES.UNIVERSAL,
    });
  }

  onboardingModal.style.display = 'none';
  showToast('WebLock setup complete!');
  await loadDashboardState();
});

// Site Password Settings Modal Handlers
function openSitePasswordModal(site) {
  selectedSiteForModal = site;
  closeAllDropdowns();

  sitePasswordModalTitle.textContent = `${site.name || site.domain} Protection`;
  sitePasswordError.style.display = 'none';
  siteCardCurrentAuth.value = '';
  siteCardNewPw.value = '';
  siteCardConfirmPw.value = '';

  const isSeparate = site.passwordMode === PASSWORD_MODES.SEPARATE;
  for (const r of siteCardPasswordModeRadios) {
    r.checked = isSeparate ? r.value === 'separate' : r.value === 'universal';
  }

  siteCardNewPwGroup.style.display = isSeparate ? 'block' : 'none';
  sitePasswordModal.style.display = 'flex';
}

function closeSitePasswordModal() {
  sitePasswordModal.style.display = 'none';
  selectedSiteForModal = null;
}

closeSitePasswordModalBtn.addEventListener('click', closeSitePasswordModal);
cancelSitePasswordModalBtn.addEventListener('click', closeSitePasswordModal);

for (const r of siteCardPasswordModeRadios) {
  r.addEventListener('change', () => {
    if (r.value === 'separate' && r.checked) {
      siteCardNewPwGroup.style.display = 'block';
    } else if (r.checked) {
      siteCardNewPwGroup.style.display = 'none';
    }
  });
}

sitePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedSiteForModal) return;
  sitePasswordError.style.display = 'none';

  let targetMode = PASSWORD_MODES.UNIVERSAL;
  for (const r of siteCardPasswordModeRadios) {
    if (r.checked && r.value === 'separate') {
      targetMode = PASSWORD_MODES.SEPARATE;
    }
  }

  const currentAuth = siteCardCurrentAuth.value;
  let newPw = null;

  if (targetMode === PASSWORD_MODES.SEPARATE) {
    newPw = siteCardNewPw.value;
    const confirmPw = siteCardConfirmPw.value;
    if (newPw.length < 4) {
      sitePasswordError.textContent = 'Separate password must be at least 4 characters.';
      sitePasswordError.style.display = 'block';
      return;
    }
    if (newPw !== confirmPw) {
      sitePasswordError.textContent = 'Passwords do not match.';
      sitePasswordError.style.display = 'block';
      return;
    }
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SET_SITE_PASSWORD_MODE,
    siteId: selectedSiteForModal.id,
    passwordMode: targetMode,
    sitePassword: newPw,
    currentAuthPassword: currentAuth,
  });

  if (res && res.success) {
    closeSitePasswordModal();
    showToast(`Updated protection for ${selectedSiteForModal.domain}`);
    await loadDashboardState();
  } else {
    sitePasswordError.textContent = res?.error || 'Failed to update site password mode.';
    sitePasswordError.style.display = 'block';
  }
});

// Site Reset via Master Password Modal Handlers
function openDashSiteResetModal(site) {
  selectedSiteForModal = site;
  closeAllDropdowns();

  dashSiteResetTitle.textContent = `Reset Password for ${site.name || site.domain}`;
  dashSiteResetError.style.display = 'none';
  dashSiteResetMasterPw.value = '';
  dashResetNewPw.value = '';
  dashResetConfirmPw.value = '';

  for (const r of dashResetChoiceRadios) {
    r.checked = r.value === 'universal';
  }
  dashResetNewPwGroup.style.display = 'none';
  dashSiteResetModal.style.display = 'flex';
}

function closeDashSiteResetModal() {
  dashSiteResetModal.style.display = 'none';
  selectedSiteForModal = null;
}

closeDashSiteResetBtn.addEventListener('click', closeDashSiteResetModal);
cancelDashSiteResetBtn.addEventListener('click', closeDashSiteResetModal);

for (const r of dashResetChoiceRadios) {
  r.addEventListener('change', () => {
    if (r.value === 'separate' && r.checked) {
      dashResetNewPwGroup.style.display = 'block';
    } else if (r.checked) {
      dashResetNewPwGroup.style.display = 'none';
    }
  });
}

dashSiteResetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedSiteForModal) return;
  dashSiteResetError.style.display = 'none';

  const masterPw = dashSiteResetMasterPw.value;
  let resetToUniversal = true;
  for (const r of dashResetChoiceRadios) {
    if (r.checked && r.value === 'separate') {
      resetToUniversal = false;
    }
  }

  let newPw = null;
  if (!resetToUniversal) {
    newPw = dashResetNewPw.value;
    const confirmPw = dashResetConfirmPw.value;
    if (newPw.length < 4) {
      dashSiteResetError.textContent = 'New password must be at least 4 characters.';
      dashSiteResetError.style.display = 'block';
      return;
    }
    if (newPw !== confirmPw) {
      dashSiteResetError.textContent = 'Passwords do not match.';
      dashSiteResetError.style.display = 'block';
      return;
    }
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RESET_SITE_PASSWORD,
    siteId: selectedSiteForModal.id,
    masterPassword: masterPw,
    newPassword: newPw,
    resetToUniversal,
  });

  if (res && res.success) {
    closeDashSiteResetModal();
    showToast(`Password updated for ${selectedSiteForModal.domain}`);
    await loadDashboardState();
  } else {
    dashSiteResetError.textContent = res?.error || 'Master password authorization failed.';
    dashSiteResetError.style.display = 'block';
  }
});

// Init
initIcons();
renderPresets();
loadDashboardState();


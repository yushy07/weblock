import { MESSAGE_TYPES, PASSWORD_MODES } from '../utils/constants.js';
import { getIcon } from '../utils/icons.js';
import { generateFallbackIcon } from '../utils/favicons.js';

const params = new URLSearchParams(window.location.search);
const rawSiteParam = params.get('site');
const domain = (rawSiteParam ? rawSiteParam.trim() : 'protected website').replace(/^www\./, '').toLowerCase();
let targetUrl = params.get('target');

// Fallback if targetUrl is missing or internal
if (!targetUrl || targetUrl.startsWith('chrome-extension://')) {
  targetUrl = `https://${domain}`;
}

// Elements
const lockCard = document.getElementById('lockCard');
const siteAvatar = document.getElementById('siteAvatar');
const siteFavicon = document.getElementById('siteFavicon');
const siteInitial = document.getElementById('siteInitial');
const lockTitle = document.getElementById('lockTitle');
const lockSubtitle = document.getElementById('lockSubtitle');
const siteDomainEl = document.getElementById('siteDomain');
const domainLockIcon = document.getElementById('domainLockIcon');
const lockModeBadge = document.getElementById('lockModeBadge');
const keyIconContainer = document.getElementById('keyIconContainer');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('passwordInput');
const capsWarning = document.getElementById('capsWarning');
const errorBanner = document.getElementById('errorBanner');
const unlockButton = document.getElementById('unlockButton');
const btnLockIcon = document.getElementById('btnLockIcon');
const buttonText = unlockButton.querySelector('.button-text');
const buttonSpinner = unlockButton.querySelector('.button-spinner');
const miniShieldIcon = document.getElementById('miniShieldIcon');
const lockForm = document.getElementById('lockForm');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

// Universal Recovery Modal Elements
const recoveryModal = document.getElementById('recoveryModal');
const closeRecoveryModalBtn = document.getElementById('closeRecoveryModalBtn');
const cancelRecoveryBtn = document.getElementById('cancelRecoveryBtn');
const recoveryForm = document.getElementById('recoveryForm');
const recoveryConfiguredBody = document.getElementById('recoveryConfiguredBody');
const recoveryUnconfiguredBody = document.getElementById('recoveryUnconfiguredBody');
const recoveryQuestionSelect = document.getElementById('recoveryQuestionSelect');
const recoveryAnswerInput = document.getElementById('recoveryAnswerInput');
const newMasterPwInput = document.getElementById('newMasterPwInput');
const confirmMasterPwInput = document.getElementById('confirmMasterPwInput');
const recoveryError = document.getElementById('recoveryError');

// Site Reset Modal Elements
const siteResetModal = document.getElementById('siteResetModal');
const closeSiteResetBtn = document.getElementById('closeSiteResetBtn');
const cancelSiteResetBtn = document.getElementById('cancelSiteResetBtn');
const siteResetTitle = document.getElementById('siteResetTitle');
const siteResetForm = document.getElementById('siteResetForm');
const siteResetMasterPw = document.getElementById('siteResetMasterPw');
const newSitePwGroup = document.getElementById('newSitePwGroup');
const newSitePwInput = document.getElementById('newSitePwInput');
const confirmSitePwInput = document.getElementById('confirmSitePwInput');
const siteResetError = document.getElementById('siteResetError');

let isPasswordVisible = false;
let currentTabId = null;
let cooldownInterval = null;
let currentSite = null;

// Initialize icons and visual assets
function initVisuals() {
  domainLockIcon.innerHTML = getIcon('lock', 14);
  keyIconContainer.innerHTML = getIcon('key', 16);
  btnLockIcon.innerHTML = getIcon('lock', 16);
  miniShieldIcon.innerHTML = getIcon('shieldCheck', 14);
  updatePasswordToggleIcon();
  siteDomainEl.textContent = domain;
  document.title = `Locked: ${domain} — WebLock`;
}

function updatePasswordToggleIcon() {
  togglePasswordBtn.innerHTML = isPasswordVisible
    ? getIcon('eyeOff', 16)
    : getIcon('eye', 16);
}

// Password visibility toggle
togglePasswordBtn.addEventListener('click', () => {
  isPasswordVisible = !isPasswordVisible;
  passwordInput.type = isPasswordVisible ? 'text' : 'password';
  updatePasswordToggleIcon();
  passwordInput.focus();
});

// Caps Lock detection
function handleCapsLock(e) {
  if (e.getModifierState && e.getModifierState('CapsLock')) {
    capsWarning.style.display = 'flex';
  } else {
    capsWarning.style.display = 'none';
  }
}

passwordInput.addEventListener('keyup', handleCapsLock);
passwordInput.addEventListener('keydown', handleCapsLock);

// Resolve current tab ID
async function resolveCurrentTabId() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.getCurrent) {
      const tab = await chrome.tabs.getCurrent();
      if (tab) {
        currentTabId = tab.id;
        return;
      }
    }
  } catch (e) {}

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        currentTabId = activeTab.id;
      }
    }
  } catch (e) {}
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = 'block';

  // Trigger shake animation
  lockCard.classList.remove('shake');
  void lockCard.offsetWidth; // Force reflow
  lockCard.classList.add('shake');

  if (navigator.vibrate) {
    navigator.vibrate([40, 60, 40]);
  }
}

function hideError() {
  errorBanner.style.display = 'none';
  errorBanner.textContent = '';
}

function setSubmitting(isSubmitting) {
  unlockButton.disabled = isSubmitting;
  passwordInput.disabled = isSubmitting;
  if (isSubmitting) {
    btnLockIcon.style.display = 'none';
    buttonText.textContent = 'Verifying...';
    buttonSpinner.style.display = 'inline-block';
  } else {
    btnLockIcon.style.display = 'inline-flex';
    buttonText.textContent = 'Unlock This Tab';
    buttonSpinner.style.display = 'none';
  }
}

function startCooldownTimer(seconds) {
  if (cooldownInterval) clearInterval(cooldownInterval);
  let remaining = seconds;

  unlockButton.disabled = true;
  passwordInput.disabled = true;

  const updateCooldown = () => {
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      hideError();
      unlockButton.disabled = false;
      passwordInput.disabled = false;
      buttonText.textContent = 'Unlock This Tab';
      btnLockIcon.style.display = 'inline-flex';
      passwordInput.focus();
      return;
    }
    showError(`Too many failed attempts. Locked for ${remaining}s.`);
    buttonText.textContent = `Locked (${remaining}s)`;
    remaining--;
  };

  updateCooldown();
  cooldownInterval = setInterval(updateCooldown, 1000);
}

// Load dynamic site details (favicon, name, passwordMode)
async function loadSiteDetails() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_SITE_DETAILS,
      domain,
    });

    if (res && res.success && res.site) {
      currentSite = res.site;
      applySiteDetails(res.site);
    } else {
      // Fallback
      applyFallbackSiteDetails();
    }
  } catch (err) {
    console.warn('[WebLock Lock] Error loading site details:', err);
    applyFallbackSiteDetails();
  }
}

function applySiteDetails(site) {
  const siteDisplayName = site.name || domain;
  lockTitle.textContent = `${siteDisplayName} is locked`;
  lockSubtitle.innerHTML = `This website is protected by <strong class="brand-highlight">WebLock</strong>`;

  // Password mode
  if (site.passwordMode === PASSWORD_MODES.SEPARATE) {
    lockModeBadge.textContent = '🔑 This website uses a separate password';
    passwordInput.placeholder = `Enter password for ${siteDisplayName}`;
  } else {
    lockModeBadge.textContent = '🔐 Protected by your WebLock password';
    passwordInput.placeholder = 'Enter WebLock password';
  }

  // Favicon
  loadFaviconWithFallback(site.faviconUrl || site.faviconData, domain);
}

function applyFallbackSiteDetails() {
  lockTitle.textContent = 'Website is locked';
  lockSubtitle.innerHTML = `This website is protected by <strong class="brand-highlight">WebLock</strong>`;
  lockModeBadge.textContent = '🔐 Protected by your WebLock password';
  passwordInput.placeholder = 'Enter WebLock password';
  loadFaviconWithFallback(null, domain);
}

function loadFaviconWithFallback(iconUrl, siteDomain) {
  const fallbackSvg = generateFallbackIcon(siteDomain, 64);
  const candidate = iconUrl || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(siteDomain)}&sz=128`;

  siteFavicon.src = candidate;
  siteFavicon.onload = () => {
    if (siteFavicon.naturalWidth > 1 && siteFavicon.naturalHeight > 1) {
      siteFavicon.style.display = 'block';
      siteInitial.style.display = 'none';
    } else {
      showFallbackAvatar(fallbackSvg);
    }
  };

  siteFavicon.onerror = () => {
    showFallbackAvatar(fallbackSvg);
  };
}

function showFallbackAvatar(fallbackDataUrl) {
  siteFavicon.src = fallbackDataUrl;
  siteFavicon.onload = () => {
    siteFavicon.style.display = 'block';
    siteInitial.style.display = 'none';
  };
  siteFavicon.onerror = () => {
    siteFavicon.style.display = 'none';
    siteInitial.style.display = 'block';
    siteInitial.textContent = domain ? domain.charAt(0).toUpperCase() : '🔒';
  };
}

// Handle unlock form submission
lockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const password = passwordInput.value;
  if (!password) return;

  setSubmitting(true);

  try {
    const verifyRes = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.VERIFY_PASSWORD,
      password,
      domain,
    });

    if (!verifyRes || !verifyRes.valid) {
      setSubmitting(false);

      if (verifyRes?.rateLimited) {
        startCooldownTimer(verifyRes.cooldownSeconds || 15);
      } else {
        showError(verifyRes?.error || 'Incorrect password.');
        passwordInput.value = '';
        passwordInput.focus();
      }
      return;
    }

    // Success transition
    buttonSpinner.style.display = 'none';
    unlockButton.classList.add('success-state');
    btnLockIcon.innerHTML = getIcon('check', 18);
    btnLockIcon.style.display = 'inline-flex';
    buttonText.textContent = 'Access Granted!';

    if (!currentTabId) {
      await resolveCurrentTabId();
    }

    const unlockRes = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UNLOCK_TAB,
      tabId: currentTabId,
      domain,
    });

    if (!unlockRes || !unlockRes.success) {
      unlockButton.classList.remove('success-state');
      setSubmitting(false);
      showError(unlockRes?.error || 'Failed to authorize this tab.');
      return;
    }

    // Redirect to original target
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 280);
  } catch (err) {
    setSubmitting(false);
    console.error('[WebLock Lock Error]:', err);
    showError('An unexpected error occurred. Please try again.');
  }
});

// Forgot Password Flow
forgotPasswordBtn.addEventListener('click', async () => {
  const isSeparate = currentSite && currentSite.passwordMode === PASSWORD_MODES.SEPARATE;

  if (isSeparate) {
    // Open Site Password Reset Modal
    siteResetTitle.textContent = `Reset Password for ${currentSite.name || domain}`;
    siteResetMasterPw.value = '';
    newSitePwInput.value = '';
    confirmSitePwInput.value = '';
    siteResetError.style.display = 'none';
    siteResetModal.style.display = 'flex';
    siteResetMasterPw.focus();
  } else {
    // Open Universal Password Recovery Modal
    recoveryError.style.display = 'none';
    recoveryAnswerInput.value = '';
    newMasterPwInput.value = '';
    confirmMasterPwInput.value = '';

    // Load available recovery questions from extension state
    try {
      const state = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
      if (state && state.hasRecovery && state.recoveryQuestions?.length > 0) {
        recoveryConfiguredBody.style.display = 'flex';
        recoveryUnconfiguredBody.style.display = 'none';
        recoveryQuestionSelect.innerHTML = '';

        state.recoveryQuestions.forEach((q, idx) => {
          const opt = document.createElement('option');
          opt.value = q.questionId;
          opt.textContent = `Question ${idx + 1}: ${q.question}`;
          recoveryQuestionSelect.appendChild(opt);
        });

        document.getElementById('submitRecoveryBtn').style.display = 'inline-flex';
      } else {
        recoveryConfiguredBody.style.display = 'none';
        recoveryUnconfiguredBody.style.display = 'block';
        document.getElementById('submitRecoveryBtn').style.display = 'none';
      }
    } catch (e) {
      recoveryConfiguredBody.style.display = 'none';
      recoveryUnconfiguredBody.style.display = 'block';
    }

    recoveryModal.style.display = 'flex';
  }
});

// Close modals
function closeModals() {
  recoveryModal.style.display = 'none';
  siteResetModal.style.display = 'none';
}

closeRecoveryModalBtn.addEventListener('click', closeModals);
cancelRecoveryBtn.addEventListener('click', closeModals);
closeSiteResetBtn.addEventListener('click', closeModals);
cancelSiteResetBtn.addEventListener('click', closeModals);

// Universal Password Recovery Submit (1 of 3 questions)
recoveryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  recoveryError.style.display = 'none';

  const questionId = recoveryQuestionSelect.value;
  const answer = recoveryAnswerInput.value.trim();
  const newPw = newMasterPwInput.value;
  const confirmPw = confirmMasterPwInput.value;

  if (!answer) {
    recoveryError.textContent = 'Please enter your recovery answer.';
    recoveryError.style.display = 'block';
    return;
  }

  if (newPw.length < 4) {
    recoveryError.textContent = 'New password must be at least 4 characters.';
    recoveryError.style.display = 'block';
    return;
  }

  if (newPw !== confirmPw) {
    recoveryError.textContent = 'Passwords do not match.';
    recoveryError.style.display = 'block';
    return;
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RESET_PASSWORD_WITH_RECOVERY,
    questionId,
    answer,
    newPassword: newPw,
  });

  if (res && res.success) {
    closeModals();
    passwordInput.value = '';
    showError('WebLock password reset! Enter your new password to unlock.');
    errorBanner.style.color = 'var(--success)';
    errorBanner.style.borderColor = 'var(--success)';
    errorBanner.style.background = 'var(--success-bg)';
    passwordInput.focus();
  } else {
    recoveryError.textContent = res?.error || 'Incorrect answer. Try another recovery question.';
    recoveryError.style.display = 'block';
  }
});

// Site Reset Radio toggle
const siteResetRadios = document.getElementsByName('siteResetChoice');
for (const r of siteResetRadios) {
  r.addEventListener('change', () => {
    if (r.value === 'separate' && r.checked) {
      newSitePwGroup.style.display = 'block';
    } else if (r.checked) {
      newSitePwGroup.style.display = 'none';
    }
  });
}

// Site Reset Submit
siteResetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  siteResetError.style.display = 'none';

  const masterPw = siteResetMasterPw.value;
  let resetToUniversal = true;
  for (const r of siteResetRadios) {
    if (r.checked && r.value === 'separate') {
      resetToUniversal = false;
    }
  }

  let newSitePw = null;
  if (!resetToUniversal) {
    newSitePw = newSitePwInput.value;
    const confirmPw = confirmSitePwInput.value;
    if (newSitePw.length < 4) {
      siteResetError.textContent = 'New password must be at least 4 characters.';
      siteResetError.style.display = 'block';
      return;
    }
    if (newSitePw !== confirmPw) {
      siteResetError.textContent = 'Passwords do not match.';
      siteResetError.style.display = 'block';
      return;
    }
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RESET_SITE_PASSWORD,
    siteId: currentSite?.id || domain,
    masterPassword: masterPw,
    newPassword: newSitePw,
    resetToUniversal,
  });

  if (res && res.success) {
    closeModals();
    await loadSiteDetails();
    passwordInput.value = '';
    showError('Site password updated. Please unlock.');
    errorBanner.style.color = 'var(--success)';
    errorBanner.style.borderColor = 'var(--success)';
    errorBanner.style.background = 'var(--success-bg)';
    passwordInput.focus();
  } else {
    siteResetError.textContent = res?.error || 'Authentication failed.';
    siteResetError.style.display = 'block';
  }
});

// Initialize
initVisuals();
resolveCurrentTabId();
loadSiteDetails();


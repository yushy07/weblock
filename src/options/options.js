import { MESSAGE_TYPES, QUESTION_BANK } from '../utils/constants.js';
import { getIcon } from '../utils/icons.js';
import {
  saveSettings,
  saveLockedSites,
  saveSecurity,
  migrateStorage,
} from '../storage/storage.js';

// DOM Elements
const optBrandIcon = document.getElementById('optBrandIcon');
const dashArrowIcon = document.getElementById('dashArrowIcon');
const backToDashBtn = document.getElementById('backToDashBtn');
const securityHeaderIcon = document.getElementById('securityHeaderIcon');
const recoveryHeaderIcon = document.getElementById('recoveryHeaderIcon');
const sitePassHeaderIcon = document.getElementById('sitePassHeaderIcon');
const protectionHeaderIcon = document.getElementById('protectionHeaderIcon');
const sessionHeaderIcon = document.getElementById('sessionHeaderIcon');
const dataHeaderIcon = document.getElementById('dataHeaderIcon');

// Password Form
const changePasswordForm = document.getElementById('changePasswordForm');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const changePasswordStatus = document.getElementById('changePasswordStatus');

// Recovery Elements
const recoveryStatusBadge = document.getElementById('recoveryStatusBadge');
const recoveryStatusDesc = document.getElementById('recoveryStatusDesc');
const manageRecoveryBtn = document.getElementById('manageRecoveryBtn');
const manageRecoveryIcon = document.getElementById('manageRecoveryIcon');
const manageRecoveryBtnText = document.getElementById('manageRecoveryBtnText');

// Password & Protection Modes Stats
const universalCountText = document.getElementById('universalCountText');
const separateCountText = document.getElementById('separateCountText');
const randomChallengeCountText = document.getElementById('randomChallengeCountText');
const randomChallengeHeaderIcon = document.getElementById('randomChallengeHeaderIcon');

// Recovery Modal
const recoveryModal = document.getElementById('recoveryModal');
const closeRecoveryModalBtn = document.getElementById('closeRecoveryModalBtn');
const recoveryAuthStep = document.getElementById('recoveryAuthStep');
const recoveryAuthPassword = document.getElementById('recoveryAuthPassword');
const recoveryAuthError = document.getElementById('recoveryAuthError');
const cancelRecoveryAuthBtn = document.getElementById('cancelRecoveryAuthBtn');
const verifyRecoveryAuthBtn = document.getElementById('verifyRecoveryAuthBtn');
const recoveryEditForm = document.getElementById('recoveryEditForm');
const optQ1 = document.getElementById('optQ1');
const optA1 = document.getElementById('optA1');
const optQ2 = document.getElementById('optQ2');
const optA2 = document.getElementById('optA2');
const optQ3 = document.getElementById('optQ3');
const optA3 = document.getElementById('optA3');
const recoveryEditError = document.getElementById('recoveryEditError');
const cancelRecoveryEditBtn = document.getElementById('cancelRecoveryEditBtn');

// Protection Settings
const settingGlobalToggle = document.getElementById('settingGlobalToggle');
const optIncognitoBtn = document.getElementById('optIncognitoBtn');
const incognitoSettingDesc = document.getElementById('incognitoSettingDesc');
const authModeRadios = document.getElementsByName('authMode');

// Session Actions
const clearSessionsBtn = document.getElementById('clearSessionsBtn');
const clearSessionIcon = document.getElementById('clearSessionIcon');
const clearSessionStatus = document.getElementById('clearSessionStatus');

// Data Actions
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const resetDataBtn = document.getElementById('resetDataBtn');
const optionsToast = document.getElementById('optionsToast');

let currentState = null;
let authorizedMasterPassword = null;

function showToast(message) {
  optionsToast.textContent = message;
  optionsToast.style.display = 'block';
  setTimeout(() => {
    optionsToast.style.display = 'none';
  }, 2600);
}

function initIcons() {
  optBrandIcon.innerHTML = getIcon('shield', 20);
  dashArrowIcon.innerHTML = getIcon('arrowRight', 16);
  securityHeaderIcon.innerHTML = getIcon('key', 18);
  recoveryHeaderIcon.innerHTML = getIcon('helpCircle', 18);
  sitePassHeaderIcon.innerHTML = getIcon('shieldCheck', 18);
  if (randomChallengeHeaderIcon) randomChallengeHeaderIcon.innerHTML = getIcon('shieldCheck', 18);
  protectionHeaderIcon.innerHTML = getIcon('shieldCheck', 18);
  sessionHeaderIcon.innerHTML = getIcon('refresh', 18);
  dataHeaderIcon.innerHTML = getIcon('settings', 18);
  clearSessionIcon.innerHTML = getIcon('lock', 14);
  manageRecoveryIcon.innerHTML = getIcon('settings', 14);
}

function showStatus(element, message, isSuccess) {
  element.textContent = message;
  element.className = `status-message ${isSuccess ? 'success' : 'error'}`;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 4000);
}

async function loadSettings() {
  try {
    const res = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (res && res.success) {
      currentState = res;
      settingGlobalToggle.checked = !!res.settings.enabled;

      if (res.isIncognitoAllowed) {
        incognitoSettingDesc.textContent = 'Active: WebLock protects normal and Incognito windows.';
        optIncognitoBtn.textContent = 'Chrome Settings';
      } else {
        incognitoSettingDesc.textContent = 'Disabled: Chrome has not enabled WebLock in Incognito mode.';
        optIncognitoBtn.textContent = 'Enable in Chrome';
      }

      for (const radio of authModeRadios) {
        if (radio.value === (res.settings.authMode || 'per-tab')) {
          radio.checked = true;
        }
      }

      // Recovery status
      if (res.hasRecovery) {
        recoveryStatusBadge.className = 'status-badge-pill configured';
        recoveryStatusBadge.textContent = '● 3 Questions Configured';
        recoveryStatusDesc.textContent = 'Answer any 1 of 3 questions to reset your master password. No recovery data is ever transmitted externally.';
        manageRecoveryBtnText.textContent = 'Update Questions';
      } else {
        recoveryStatusBadge.className = 'status-badge-pill not-configured';
        recoveryStatusBadge.textContent = '⚠️ Not Configured';
        recoveryStatusDesc.textContent = 'Set up 3 recovery questions to ensure you can recover your master password if forgotten.';
        manageRecoveryBtnText.textContent = 'Configure Questions';
      }

      // Password modes stats
      const sites = res.lockedSites || [];
      const separateCount = sites.filter((s) => s.passwordMode === 'separate').length;
      const universalCount = sites.length - separateCount;
      universalCountText.textContent = universalCount;
      separateCountText.textContent = separateCount;

      // Random challenge stats
      const randomCount = sites.filter((s) => s.protectionMode === 'random').length;
      if (randomChallengeCountText) randomChallengeCountText.textContent = randomCount;
    }
  } catch (err) {
    console.error('[WebLock Settings] Failed to load settings:', err);
  }
}

// Recovery Modal Logic
function populateQuestionSelects(existingQuestions = []) {
  const selects = [optQ1, optQ2, optQ3];
  const defaultIndices = [0, 1, 2];

  selects.forEach((sel, i) => {
    sel.innerHTML = '';
    QUESTION_BANK.forEach((q) => {
      const opt = document.createElement('option');
      opt.value = q.id;
      opt.textContent = q.question;
      sel.appendChild(opt);
    });

    if (existingQuestions[i]?.questionId) {
      sel.value = existingQuestions[i].questionId;
    } else {
      sel.value = QUESTION_BANK[defaultIndices[i]]?.id || QUESTION_BANK[0].id;
    }
  });
}

function openRecoveryModal() {
  recoveryModal.style.display = 'flex';
  authorizedMasterPassword = null;
  recoveryAuthStep.style.display = 'block';
  recoveryEditForm.style.display = 'none';
  recoveryAuthPassword.value = '';
  recoveryAuthError.style.display = 'none';
  recoveryEditError.style.display = 'none';
  recoveryAuthPassword.focus();
}

function closeRecoveryModal() {
  recoveryModal.style.display = 'none';
  authorizedMasterPassword = null;
  recoveryAuthPassword.value = '';
  optA1.value = '';
  optA2.value = '';
  optA3.value = '';
}

manageRecoveryBtn.addEventListener('click', () => {
  openRecoveryModal();
});

closeRecoveryModalBtn.addEventListener('click', closeRecoveryModal);
cancelRecoveryAuthBtn.addEventListener('click', closeRecoveryModal);
cancelRecoveryEditBtn.addEventListener('click', closeRecoveryModal);

verifyRecoveryAuthBtn.addEventListener('click', async () => {
  const pw = recoveryAuthPassword.value;
  if (!pw) {
    recoveryAuthError.textContent = 'Please enter your master password.';
    recoveryAuthError.style.display = 'block';
    return;
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.VERIFY_PASSWORD,
    password: pw,
  });

  if (res && res.success) {
    authorizedMasterPassword = pw;
    recoveryAuthStep.style.display = 'none';
    recoveryEditForm.style.display = 'block';
    populateQuestionSelects(currentState?.recoveryQuestions || []);
    optA1.focus();
  } else {
    recoveryAuthError.textContent = res?.error || 'Incorrect master password.';
    recoveryAuthError.style.display = 'block';
  }
});

recoveryEditForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  recoveryEditError.style.display = 'none';

  const q1Id = optQ1.value;
  const a1 = optA1.value.trim();
  const q2Id = optQ2.value;
  const a2 = optA2.value.trim();
  const q3Id = optQ3.value;
  const a3 = optA3.value.trim();

  // Validate distinct questions
  if (q1Id === q2Id || q1Id === q3Id || q2Id === q3Id) {
    recoveryEditError.textContent = 'Please select 3 distinct questions.';
    recoveryEditError.style.display = 'block';
    return;
  }

  if (a1.length < 2 || a2.length < 2 || a3.length < 2) {
    recoveryEditError.textContent = 'All answers must be at least 2 characters long.';
    recoveryEditError.style.display = 'block';
    return;
  }

  const questions = [
    {
      questionId: q1Id,
      question: QUESTION_BANK.find((q) => q.id === q1Id)?.question || q1Id,
      answer: a1,
    },
    {
      questionId: q2Id,
      question: QUESTION_BANK.find((q) => q.id === q2Id)?.question || q2Id,
      answer: a2,
    },
    {
      questionId: q3Id,
      question: QUESTION_BANK.find((q) => q.id === q3Id)?.question || q3Id,
      answer: a3,
    },
  ];

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETUP_RECOVERY,
    masterPassword: authorizedMasterPassword,
    questions,
  });

  if (res && res.success) {
    showToast('Recovery questions saved!');
    closeRecoveryModal();
    await loadSettings();
  } else {
    recoveryEditError.textContent = res?.error || 'Failed to save recovery questions.';
    recoveryEditError.style.display = 'block';
  }
});

// Change Password Handler
changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const oldPw = currentPassword.value;
  const newPw = newPassword.value;
  const confirmPw = confirmNewPassword.value;

  if (newPw.length < 4) {
    showStatus(changePasswordStatus, 'New password must be at least 4 characters long.', false);
    return;
  }

  if (newPw !== confirmPw) {
    showStatus(changePasswordStatus, 'New passwords do not match.', false);
    return;
  }

  const res = await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.CHANGE_PASSWORD,
    oldPassword: oldPw,
    newPassword: newPw,
  });

  if (res && res.success) {
    showStatus(changePasswordStatus, 'Master password updated successfully.', true);
    showToast('Password updated');
    changePasswordForm.reset();
  } else {
    showStatus(changePasswordStatus, res?.error || 'Failed to update password.', false);
  }
});

// Global Protection Toggle
settingGlobalToggle.addEventListener('change', async () => {
  const enabled = settingGlobalToggle.checked;
  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.UPDATE_SETTINGS,
    settings: { enabled },
  });
  showToast(enabled ? 'Protection enabled' : 'Protection paused');
});

// Auth Mode Radios
for (const radio of authModeRadios) {
  radio.addEventListener('change', async () => {
    if (radio.checked) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        settings: { authMode: radio.value },
      });
      showToast(`Authentication set to ${radio.value}`);
    }
  });
}

// Incognito Button
optIncognitoBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

// Relock All Sessions
clearSessionsBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_ALL_SESSIONS });
  showStatus(clearSessionStatus, 'All open unlocked tab sessions have been cleared.', true);
  showToast('All open tabs relocked');
});

// Export Configuration
exportBtn.addEventListener('click', () => {
  if (!currentState) return;
  const exportPayload = {
    weblockVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: currentState.settings,
    lockedSites: currentState.lockedSites,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weblock-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Configuration exported');
});

// Import Configuration
importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || typeof data !== 'object') {
      throw new Error('Backup file must contain a valid JSON object.');
    }

    let restoredCount = 0;
    if (Array.isArray(data.lockedSites)) {
      // Validate and sanitize locked sites
      const validSites = data.lockedSites.filter((s) => s && typeof (s.domain || s) === 'string');
      await saveLockedSites(validSites);
      restoredCount = validSites.length;
    }

    if (data.settings && typeof data.settings === 'object') {
      await saveSettings(data.settings);
    }

    // Run idempotent migration to ensure schema v2 compliance
    await migrateStorage();

    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_SETTINGS,
      settings: data.settings || {},
    });

    showToast(`Restored ${restoredCount} locked website${restoredCount === 1 ? '' : 's'} and settings!`);
    setTimeout(() => window.location.reload(), 750);
  } catch (err) {
    alert(`Invalid backup file: ${err.message || 'Could not parse JSON'}`);
  } finally {
    importFileInput.value = '';
  }
});

// Reset All Data
resetDataBtn.addEventListener('click', async () => {
  const confirmed = confirm(
    'WARNING: This will permanently delete your master password, all locked sites, and reset settings to default. Proceed?'
  );
  if (!confirmed) return;

  await saveSettings({});
  await saveLockedSites([]);
  await saveSecurity(null);
  await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_ALL_SESSIONS });

  showToast('All data has been reset');
  setTimeout(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
    window.close();
  }, 500);
});

// Navigation
backToDashBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  window.close();
});

// 3D Card Interactive Tilt Physics
function init3DSettingsTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll('.settings-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// Initialize
initIcons();
init3DSettingsTilt();
loadSettings();

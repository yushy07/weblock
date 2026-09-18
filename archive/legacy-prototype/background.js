// This is the "security guard" script. It runs in the background all the time
// and checks every page a tab tries to open.

// Keeps track of "just unlocked this exact tab+url, let it through once"
// so we don't lock it again immediately after the user types the password.
const allowedOnce = new Map();

function keyFor(tabId, url) {
  return tabId + "|" + url;
}

async function getSettings() {
  const data = await chrome.storage.local.get(["lockedSites", "passwordHash"]);
  return {
    lockedSites: data.lockedSites || [],
    passwordHash: data.passwordHash || null
  };
}

function isLocked(url, lockedSites) {
  try {
    const u = new URL(url);
    // only handle real webpages
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return lockedSites.some((site) => {
      const s = site.toLowerCase().trim();
      if (!s) return false;
      return host === s || host.endsWith("." + s) || host.includes(s);
    });
  } catch (e) {
    return false;
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // frameId 0 = the main page in the tab (not an iframe/ad inside it)
  if (details.frameId !== 0) return;

  const { tabId, url } = details;

  // If this exact tab+url was just approved after a correct password, let it go
  // through once, and remove the pass so it locks again next time.
  const k = keyFor(tabId, url);
  if (allowedOnce.has(k)) {
    allowedOnce.delete(k);
    return;
  }

  const { lockedSites, passwordHash } = await getSettings();
  if (!passwordHash) return; // no password set up yet, nothing to lock
  if (!isLocked(url, lockedSites)) return;

  const lockUrl =
    chrome.runtime.getURL("lock.html") +
    "?target=" + encodeURIComponent(url) +
    "&tabId=" + tabId;

  chrome.tabs.update(tabId, { url: lockUrl });
});

// The lock screen sends this message once the password is correct.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "unlock") {
    const { tabId, targetUrl } = message;
    allowedOnce.set(keyFor(tabId, targetUrl), true);
    chrome.tabs.update(tabId, { url: targetUrl });
    sendResponse({ ok: true });
  }
  return true;
});

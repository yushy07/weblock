# WebLock — Chrome Web Store Listing & Review Documentation

## 1. Store Listing Metadata

- **Title**: WebLock — Website AppLock & Password Protection
- **Short Description (max 132 chars)**: Password-protect YouTube, Instagram, Reddit, and custom websites with seamless per-tab AppLock authentication.
- **Category**: Productivity / Privacy
- **Language**: English
- **Pricing**: Free

## 2. Detailed Description

WebLock brings smartphone-style AppLock functionality to your desktop browser. Built from the ground up on Chrome Manifest V3 and declarativeNetRequest (DNR), WebLock lets you lock distracting or sensitive websites behind a secure master password.

### 🌟 Key Features

- 🔒 **Per-Tab Authentication**: Unlocking YouTube in one tab allows you to watch videos and refresh freely in that tab, while any newly opened tabs or windows remain securely locked.
- ⚡ **Zero Pre-load Interception**: Uses Chrome's native declarativeNetRequest engine to intercept navigations before page scripts or DOM can load.
- 🕶️ **Incognito Window Support**: Keeps private browsing protected just like standard windows.
- 🛡️ **Military-Grade Local Cryptography**: Your master password is never stored in plain text. It is derived and verified locally using the Web Crypto API (PBKDF2-HMAC-SHA256 with 310,000 iterations and a 16-byte random salt).
- 🚫 **100% Offline & Private**: Zero external servers, zero account creation, zero tracking. All settings and rules stay strictly on your local device.
- 🌐 **Subdomain Control**: Choose whether to protect just the root domain or all subdomains (e.g. `music.youtube.com`, `studio.youtube.com`).
- 🎨 **Sleek Dark-First UI**: Minimalist aesthetic designed for focus and productivity.

---

## 3. Permissions Justifications (For Chrome Web Store Reviewers)

| Permission | Purpose & Justification |
| :--- | :--- |
| `declarativeNetRequest` | Required to perform instantaneous browser-level redirection of main-frame navigations to the internal lock screen, and to apply temporary tab-scoped session allow rules when the user enters the correct password. |
| `storage` | Required to persist the user's encrypted password hash, the user-defined list of locked domains, and extension preferences (`chrome.storage.local`), as well as ephemeral tab session states (`chrome.storage.session`). |
| `tabs` | Required to associate specific tab IDs with temporary session allow rules so that only the authenticated tab is unlocked, and to clean up rules when the tab is closed. |
| `webNavigation` | Required to observe navigation completion and synchronize per-tab session state across browser window events. |
| `<all_urls>` (Host Permission) | Required by the Chrome `declarativeNetRequest` API to allow redirecting arbitrary website domains that the user explicitly adds to their personal locked websites list. |

---

## 4. Privacy & Data Disclosures

- **Does this extension collect or transmit user data?** No.
- **Does it communicate with any remote server or third-party API?** No. All network requests are handled locally by the browser.
- **Data retention**: All data (locked sites list, hashed password) is stored in the browser's local sandbox storage (`chrome.storage.local`). Clearing browser extension data completely removes all stored information.

---

## 5. Version History

- **v1.0.0** (Initial Release):
  - Manifest V3 architecture with Background Service Worker.
  - Native `declarativeNetRequest` dynamic redirect rules.
  - Tab-scoped session rules for per-tab unlock behavior.
  - Web Crypto PBKDF2-HMAC-SHA256 password hashing.
  - Management Dashboard, Quick Popup, and Settings interfaces.
  - Real-time domain normalization and subdomain matching.
  - Incognito access verification.

const params = new URLSearchParams(window.location.search);
const targetUrl = params.get("target");
const tabId = parseInt(params.get("tabId"), 10);

document.getElementById("siteName").textContent = targetUrl || "";

const pwInput = document.getElementById("pw");
const errEl = document.getElementById("err");

async function tryUnlock() {
  const typed = pwInput.value;
  errEl.textContent = "";

  const data = await chrome.storage.local.get(["passwordHash"]);
  if (!data.passwordHash) {
    errEl.textContent = "No password set yet. Open the extension popup first.";
    return;
  }

  const typedHash = await hashPassword(typed);
  if (typedHash === data.passwordHash) {
    chrome.runtime.sendMessage(
      { type: "unlock", tabId, targetUrl },
      () => {
        // background.js will navigate this tab to the real site
      }
    );
  } else {
    errEl.textContent = "Wrong password.";
    pwInput.value = "";
    pwInput.focus();
  }
}

document.getElementById("unlockBtn").addEventListener("click", tryUnlock);
pwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlock();
});

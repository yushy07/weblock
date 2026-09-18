const pw1 = document.getElementById("pw1");
const pw2 = document.getElementById("pw2");
const pwStatus = document.getElementById("pwStatus");
const siteInput = document.getElementById("siteInput");
const siteList = document.getElementById("siteList");

document.getElementById("savePw").addEventListener("click", async () => {
  pwStatus.textContent = "";
  if (!pw1.value || pw1.value.length < 4) {
    pwStatus.style.color = "#ff8080";
    pwStatus.textContent = "Use at least 4 characters.";
    return;
  }
  if (pw1.value !== pw2.value) {
    pwStatus.style.color = "#ff8080";
    pwStatus.textContent = "Passwords don't match.";
    return;
  }
  const hash = await hashPassword(pw1.value);
  await chrome.storage.local.set({ passwordHash: hash });
  pw1.value = "";
  pw2.value = "";
  pwStatus.style.color = "#7fd97f";
  pwStatus.textContent = "Password saved.";
});

async function loadSites() {
  const data = await chrome.storage.local.get(["lockedSites"]);
  const sites = data.lockedSites || [];
  siteList.innerHTML = "";
  sites.forEach((site, idx) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = site;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      sites.splice(idx, 1);
      await chrome.storage.local.set({ lockedSites: sites });
      loadSites();
    });
    li.appendChild(span);
    li.appendChild(removeBtn);
    siteList.appendChild(li);
  });
}

document.getElementById("addSite").addEventListener("click", async () => {
  const val = siteInput.value.trim().toLowerCase();
  if (!val) return;
  const data = await chrome.storage.local.get(["lockedSites"]);
  const sites = data.lockedSites || [];
  if (!sites.includes(val)) {
    sites.push(val);
    await chrome.storage.local.set({ lockedSites: sites });
  }
  siteInput.value = "";
  loadSites();
});

siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addSite").click();
});

loadSites();

// Turns your password into a scrambled fingerprint (SHA-256).
// We only ever save this scrambled version, never the real password text.
async function hashPassword(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

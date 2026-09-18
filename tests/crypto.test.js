import { describe, it, expect } from 'vitest';
import { generateSalt, hashPassword, verifyPassword, buf2hex, hex2buf } from '../src/security/crypto.js';

describe('Web Crypto Utilities', () => {
  it('converts between buffer and hex string accurately', () => {
    const original = new Uint8Array([0, 15, 16, 255]);
    const hex = buf2hex(original);
    expect(hex).toBe('000f10ff');
    const recovered = hex2buf(hex);
    expect(Array.from(recovered)).toEqual([0, 15, 16, 255]);
  });

  it('generates random salts of correct length', () => {
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    expect(salt1.length).toBe(32); // 16 bytes = 32 hex chars
    expect(salt2.length).toBe(32);
    expect(salt1).not.toBe(salt2);
  });

  it('hashes passwords deterministically with PBKDF2', async () => {
    const salt = generateSalt(16);
    // Use smaller iteration count in test for test speed
    const iterations = 5000;
    const hash1 = await hashPassword('Secret123!', salt, iterations);
    const hash2 = await hashPassword('Secret123!', salt, iterations);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 32 bytes = 64 hex chars (256 bits)
  });

  it('verifies passwords correctly', async () => {
    const salt = generateSalt(16);
    const iterations = 5000;
    const hash = await hashPassword('MasterKey@2026', salt, iterations);

    const record = { hash, salt, iterations };

    expect(await verifyPassword('MasterKey@2026', record)).toBe(true);
    expect(await verifyPassword('WrongPassword', record)).toBe(false);
    expect(await verifyPassword('masterkey@2026', record)).toBe(false);
  });
});

import { CRYPTO_CONFIG } from '../utils/constants.js';

/**
 * Converts a Uint8Array buffer into a hexadecimal string.
 * @param {Uint8Array} buffer
 * @returns {string}
 */
export function buf2hex(buffer) {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hexadecimal string into a Uint8Array.
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function hex2buf(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random salt as a hex string.
 * @param {number} [byteLength=16]
 * @returns {string}
 */
export function generateSalt(byteLength = CRYPTO_CONFIG.saltBytes) {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return buf2hex(salt);
}

/**
 * Derives a PBKDF2-HMAC-SHA256 hash from a password and salt.
 * @param {string} password
 * @param {string} saltHex
 * @param {number} [iterations=310000]
 * @returns {Promise<string>} Hex-encoded hash
 */
export function hashPassword(password, saltHex, iterations = CRYPTO_CONFIG.iterations) {
  return new Promise(async (resolve, reject) => {
    try {
      const enc = new TextEncoder();
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const saltBuffer = hex2buf(saltHex);

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations,
          hash: 'SHA-256',
        },
        passwordKey,
        CRYPTO_CONFIG.hashBytes * 8 // 256 bits
      );

      const hashHex = buf2hex(new Uint8Array(derivedBits));
      resolve(hashHex);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Creates a complete security record containing a unique salt and PBKDF2 hash.
 * @param {string} password
 * @param {number} [iterations=310000]
 * @returns {Promise<{ algorithm: string, iterations: number, salt: string, hash: string, createdAt: number }>}
 */
export async function createSecurityRecord(password, iterations = CRYPTO_CONFIG.iterations) {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt, iterations);
  return {
    algorithm: CRYPTO_CONFIG.algorithm,
    iterations,
    salt,
    hash,
    createdAt: Date.now(),
  };
}

/**
 * Normalizes a security answer before hashing or verification.
 * - Trims leading and trailing whitespace
 * - Converts all characters to lowercase
 * - Collapses consecutive spaces into a single space
 *
 * @param {string} answer
 * @returns {string}
 */
export function normalizeAnswer(answer) {
  if (typeof answer !== 'string') return '';
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Hashes a normalized security question answer with a given salt.
 * @param {string} answer
 * @param {string} saltHex
 * @param {number} [iterations=310000]
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashSecurityAnswer(answer, saltHex, iterations = CRYPTO_CONFIG.iterations) {
  const normalized = normalizeAnswer(answer);
  return await hashPassword(normalized, saltHex, iterations);
}

/**
 * Verifies a user-provided security answer against a stored question record.
 * @param {string} answer
 * @param {{ answerHash: string, salt: string, iterations?: number }} questionRecord
 * @returns {Promise<boolean>}
 */
export async function verifySecurityAnswer(answer, questionRecord) {
  if (!questionRecord || !questionRecord.answerHash || !questionRecord.salt) {
    return false;
  }

  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;

  const iterations = questionRecord.iterations || CRYPTO_CONFIG.iterations;
  const computedHash = await hashPassword(normalized, questionRecord.salt, iterations);
  return constantTimeCompare(computedHash, questionRecord.answerHash);
}

/**
 * Verifies a plaintext password against a stored security record.
 * Uses constant-time character comparison to prevent timing attacks.
 *
 * @param {string} password
 * @param {{ hash: string, salt: string, iterations?: number }} securityRecord
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, securityRecord) {
  if (!securityRecord || !securityRecord.hash || !securityRecord.salt) {
    return false;
  }

  const iterations = securityRecord.iterations || CRYPTO_CONFIG.iterations;
  const computedHash = await hashPassword(password, securityRecord.salt, iterations);

  return constantTimeCompare(computedHash, securityRecord.hash);
}


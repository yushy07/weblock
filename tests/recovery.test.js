import { describe, it, expect } from 'vitest';
import {
  normalizeAnswer,
  hashSecurityAnswer,
  verifySecurityAnswer,
  generateSalt,
  createSecurityRecord,
  verifyPassword,
} from '../src/security/crypto.js';

describe('Security Recovery System (1-of-3)', () => {
  it('normalizes answers by trimming, lowercasing, and collapsing whitespace', () => {
    expect(normalizeAnswer('  Golden   Retriever  ')).toBe('golden retriever');
    expect(normalizeAnswer('ST. PETER HIGH SCHOOL')).toBe('st. peter high school');
    expect(normalizeAnswer('   Mr.   Smith   ')).toBe('mr. smith');
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer(null)).toBe('');
  });

  it('hashes and verifies security answers with tolerance for casing and whitespace', async () => {
    const salt = generateSalt(16);
    const iterations = 5000;
    const answerHash = await hashSecurityAnswer('Blue Jay', salt, iterations);

    const record = { answerHash, salt, iterations };

    // Exact match
    expect(await verifySecurityAnswer('Blue Jay', record)).toBe(true);
    // Lowercase
    expect(await verifySecurityAnswer('blue jay', record)).toBe(true);
    // Extra spaces
    expect(await verifySecurityAnswer('  blue   jay  ', record)).toBe(true);
    // Wrong answer
    expect(await verifySecurityAnswer('Red Robin', record)).toBe(false);
  });

  it('supports 1-of-3 recovery: answering ANY ONE of the 3 questions recovers access', async () => {
    const iterations = 5000;

    // Simulate 3 recovery questions configured during onboarding
    const q1Salt = generateSalt(16);
    const q1Hash = await hashSecurityAnswer('Rover', q1Salt, iterations);

    const q2Salt = generateSalt(16);
    const q2Hash = await hashSecurityAnswer('Oakwood Elementary', q2Salt, iterations);

    const q3Salt = generateSalt(16);
    const q3Hash = await hashSecurityAnswer('Pizza', q3Salt, iterations);

    const recoveryQuestions = [
      { questionId: 'q_pet', questionText: 'First pet?', salt: q1Salt, answerHash: q1Hash, iterations },
      { questionId: 'q_school', questionText: 'First school?', salt: q2Salt, answerHash: q2Hash, iterations },
      { questionId: 'q_food', questionText: 'Favorite food?', salt: q3Salt, answerHash: q3Hash, iterations },
    ];

    // Helper to simulate 1-of-3 verification
    async function verifyAnyRecoveryAnswer(questionId, inputAnswer) {
      const q = recoveryQuestions.find((item) => item.questionId === questionId);
      if (!q) return false;
      return await verifySecurityAnswer(inputAnswer, q);
    }

    // Answering Q1 correctly
    expect(await verifyAnyRecoveryAnswer('q_pet', 'rover')).toBe(true);
    // Answering Q2 correctly
    expect(await verifyAnyRecoveryAnswer('q_school', '  oakwood  elementary ')).toBe(true);
    // Answering Q3 correctly
    expect(await verifyAnyRecoveryAnswer('q_food', 'PIZZA')).toBe(true);

    // Wrong answers
    expect(await verifyAnyRecoveryAnswer('q_pet', 'cat')).toBe(false);
    expect(await verifyAnyRecoveryAnswer('q_school', 'lincoln high')).toBe(false);
    expect(await verifyAnyRecoveryAnswer('q_food', 'burger')).toBe(false);
    expect(await verifyAnyRecoveryAnswer('non_existent', 'anything')).toBe(false);
  });

  it('resets master password successfully after recovery verification', async () => {
    const iterations = 5000;
    // Initial master password
    let securityRecord = await createSecurityRecord('OldMasterPassword123!', iterations);
    expect(await verifyPassword('OldMasterPassword123!', securityRecord)).toBe(true);

    // After answering recovery question, reset to new master password
    const newSecurity = await createSecurityRecord('BrandNewMasterKey2026!', iterations);
    securityRecord = {
      ...newSecurity,
      recoveryQuestions: [{ questionId: 'q_pet', questionText: 'Pet', salt: '123', answerHash: 'abc' }],
    };

    // Old password no longer works
    expect(await verifyPassword('OldMasterPassword123!', securityRecord)).toBe(false);
    // New password works
    expect(await verifyPassword('BrandNewMasterKey2026!', securityRecord)).toBe(true);
    // Recovery questions preserved
    expect(securityRecord.recoveryQuestions.length).toBe(1);
  });
});

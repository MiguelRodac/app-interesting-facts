import {
  isValidEmail,
  isValidUsername,
  getPasswordStrength,
  USERNAME_ERROR_MESSAGE,
  EMAIL_ERROR_MESSAGE,
  PASSWORD_ERROR_MESSAGE,
} from '@/utils/validation';

describe('validation utils', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true);
      expect(isValidEmail('  spaced@domain.com  ')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('accepts usernames conforming to backend rules (3-30 chars, alphanumeric, _, .)', () => {
      expect(isValidUsername('rodac')).toBe(true);
      expect(isValidUsername('user_123')).toBe(true);
      expect(isValidUsername('dev.name')).toBe(true);
    });

    it('rejects usernames violating constraints', () => {
      expect(isValidUsername('ab')).toBe(false); // too short
      expect(isValidUsername('a'.repeat(31))).toBe(false); // too long
      expect(isValidUsername('user@name')).toBe(false); // invalid char
      expect(isValidUsername('user space')).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('scores password based on criteria (length>=8, lower, upper, digit, special)', () => {
      expect(getPasswordStrength('')).toBe(0);
      expect(getPasswordStrength('short')).toBe(1); // lowercase only
      expect(getPasswordStrength('short1')).toBe(2); // lower + digit
      expect(getPasswordStrength('Short1')).toBe(3); // lower + upper + digit
      expect(getPasswordStrength('LongPassword1')).toBe(4); // len>=8 + lower + upper + digit
      expect(getPasswordStrength('StrongP@ss1')).toBe(5); // all 5 criteria
    });
  });

  describe('constants', () => {
    it('exports expected error messages', () => {
      expect(USERNAME_ERROR_MESSAGE).toBeDefined();
      expect(EMAIL_ERROR_MESSAGE).toBeDefined();
      expect(PASSWORD_ERROR_MESSAGE).toBeDefined();
    });
  });
});

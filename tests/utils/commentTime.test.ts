import { canEditComment, msUntilEditExpiry, formatRelativeTime } from '@/utils/commentTime';

describe('commentTime utils', () => {
  const baseTime = 1700000000000; // fixed timestamp

  describe('canEditComment', () => {
    it('returns true when created within 1 hour', () => {
      const created = new Date(baseTime - 30 * 60 * 1000).toISOString(); // 30 mins ago
      expect(canEditComment(created, baseTime)).toBe(true);
    });

    it('returns false when older than 1 hour', () => {
      const created = new Date(baseTime - 61 * 60 * 1000).toISOString(); // 61 mins ago
      expect(canEditComment(created, baseTime)).toBe(false);
    });

    it('returns false for invalid date string', () => {
      expect(canEditComment('invalid-date', baseTime)).toBe(false);
    });
  });

  describe('msUntilEditExpiry', () => {
    it('returns 0 for invalid date string', () => {
      expect(msUntilEditExpiry('invalid-date')).toBe(0);
    });

    it('returns 0 when edit window already expired', () => {
      const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(msUntilEditExpiry(past)).toBe(0);
    });

    it('returns remaining ms when within edit window', () => {
      const recent = new Date(Date.now() - 1000).toISOString();
      const remaining = msUntilEditExpiry(recent);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3600 * 1000);
    });
  });

  describe('formatRelativeTime', () => {
    it('returns empty string for invalid date', () => {
      expect(formatRelativeTime('invalid-date', baseTime)).toBe('');
    });

    it('returns just now or translated string for < 1 min', () => {
      const created = new Date(baseTime - 30 * 1000).toISOString();
      const res = formatRelativeTime(created, baseTime);
      expect(res).toBeDefined();
      expect(res.length).toBeGreaterThan(0);
    });

    it('formats minutes, hours, days, weeks', () => {
      const fiveMins = new Date(baseTime - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMins, baseTime)).toBe('5m');

      const twoHours = new Date(baseTime - 2 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(twoHours, baseTime)).toBe('2h');

      const threeDays = new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(threeDays, baseTime)).toBe('3d');

      const twoWeeks = new Date(baseTime - 14 * 24 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(twoWeeks, baseTime)).toBe('2w');
    });
  });
});

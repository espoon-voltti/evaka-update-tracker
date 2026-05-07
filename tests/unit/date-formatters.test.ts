import { formatDate, formatTime } from '../../site/js/utils.js';

// Construct dates from local-time components so tests are stable across
// timezones — the formatters use Date methods that read local time.
const isoOf = (year: number, month0: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month0, day, hour, minute).toISOString();

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats a single-digit day and month without padding', () => {
    expect(formatDate(isoOf(2026, 2, 5))).toBe('5.3.');
  });

  it('formats a double-digit day and month', () => {
    expect(formatDate(isoOf(2026, 11, 25))).toBe('25.12.');
  });

  it('handles year boundary (Dec 31)', () => {
    expect(formatDate(isoOf(2025, 11, 31))).toBe('31.12.');
  });

  it('handles year boundary (Jan 1)', () => {
    expect(formatDate(isoOf(2026, 0, 1))).toBe('1.1.');
  });
});

describe('formatTime', () => {
  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTime(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatTime('')).toBe('');
  });

  it('formats a typical weekday afternoon time', () => {
    // 2026-03-13 was a Friday (Finnish "pe")
    expect(formatTime(isoOf(2026, 2, 13, 14, 30))).toBe('pe 13.3. klo 14.30');
  });

  it('zero-pads the time portion only', () => {
    // Day/month are not padded; hours/minutes are 2-digit.
    // The Finnish locale uses '.' as the time separator (e.g. "klo 09.07").
    // 2026-01-05 was a Monday (Finnish "ma")
    expect(formatTime(isoOf(2026, 0, 5, 9, 7))).toBe('ma 5.1. klo 09.07');
  });

  it('formats midnight as 00:00', () => {
    // 2026-03-13 Friday at 00:00 local
    expect(formatTime(isoOf(2026, 2, 13, 0, 0))).toBe('pe 13.3. klo 00.00');
  });

  it('uses 24-hour clock (no AM/PM)', () => {
    // 2026-03-13 Friday at 23:59 local
    expect(formatTime(isoOf(2026, 2, 13, 23, 59))).toBe('pe 13.3. klo 23.59');
  });
});

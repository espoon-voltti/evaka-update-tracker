import { formatFinnishDateTime } from '../../src/utils/date-format';

describe('formatFinnishDateTime', () => {
  it('formats winter time (EET, UTC+2) correctly', () => {
    // Friday 2026-03-06 07:28 UTC = 09:28 EET
    const result = formatFinnishDateTime('2026-03-06T07:28:00Z');
    expect(result).toBe('pe 6.3. klo 09.28');
  });

  it('formats summer time (EEST, UTC+3) correctly', () => {
    // Monday 2026-06-15 06:28 UTC = 09:28 EEST
    const result = formatFinnishDateTime('2026-06-15T06:28:00Z');
    expect(result).toBe('ma 15.6. klo 09.28');
  });

  it('handles midnight UTC crossing to next day in Helsinki', () => {
    // Wednesday 2026-03-04 22:30 UTC = Thursday 2026-03-05 00:30 EET
    const result = formatFinnishDateTime('2026-03-04T22:30:00Z');
    expect(result).toBe('to 5.3. klo 00.30');
  });

  it('handles DST transition day (spring forward)', () => {
    // 2026 DST starts March 29 at 03:00 EET → 04:00 EEST
    // Saturday 2026-03-28 23:30 UTC = Sunday 2026-03-29 01:30 EET (before transition)
    const result = formatFinnishDateTime('2026-03-28T23:30:00Z');
    expect(result).toBe('su 29.3. klo 01.30');
  });

  it('formats all weekday abbreviations correctly', () => {
    // 2026-03-02 is Monday
    expect(formatFinnishDateTime('2026-03-02T12:00:00Z')).toMatch(/^ma /);
    expect(formatFinnishDateTime('2026-03-03T12:00:00Z')).toMatch(/^ti /);
    expect(formatFinnishDateTime('2026-03-04T12:00:00Z')).toMatch(/^ke /);
    expect(formatFinnishDateTime('2026-03-05T12:00:00Z')).toMatch(/^to /);
    expect(formatFinnishDateTime('2026-03-06T12:00:00Z')).toMatch(/^pe /);
    expect(formatFinnishDateTime('2026-03-07T12:00:00Z')).toMatch(/^la /);
    expect(formatFinnishDateTime('2026-03-08T12:00:00Z')).toMatch(/^su /);
  });

  it('formats single-digit day and month without leading zeros', () => {
    // 2026-01-05 is Monday, 12:00 UTC = 14:00 EET
    const result = formatFinnishDateTime('2026-01-05T12:00:00Z');
    expect(result).toBe('ma 5.1. klo 14.00');
  });

  it('formats double-digit day and month', () => {
    // 2026-12-15 is Tuesday, 10:00 UTC = 12:00 EET
    const result = formatFinnishDateTime('2026-12-15T10:00:00Z');
    expect(result).toBe('ti 15.12. klo 12.00');
  });

  it('zero-pads hours and minutes', () => {
    // 2026-03-02 01:05 UTC = 03:05 EET
    const result = formatFinnishDateTime('2026-03-02T01:05:00Z');
    expect(result).toBe('ma 2.3. klo 03.05');
  });
});

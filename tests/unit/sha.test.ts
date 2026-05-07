import { toShortSha, SHORT_SHA_LENGTH } from '../../src/utils/sha';

describe('toShortSha', () => {
  it('truncates a full SHA to the first SHORT_SHA_LENGTH characters', () => {
    const fullSha = 'aabbccdd11223344556677889900aabbccddeeff';
    expect(toShortSha(fullSha)).toBe(fullSha.slice(0, SHORT_SHA_LENGTH));
  });

  it('SHORT_SHA_LENGTH matches the historical 7-char convention', () => {
    expect(SHORT_SHA_LENGTH).toBe(7);
  });

  it('returns a 7-character string for any 40-character SHA', () => {
    const fullSha = '0123456789abcdef0123456789abcdef01234567';
    expect(toShortSha(fullSha)).toBe('0123456');
    expect(toShortSha(fullSha)).toHaveLength(7);
  });

  it('returns the input unchanged when shorter than the truncation length', () => {
    expect(toShortSha('abc')).toBe('abc');
  });

  it('returns the input unchanged when exactly 7 characters', () => {
    expect(toShortSha('aabbccd')).toBe('aabbccd');
  });
});

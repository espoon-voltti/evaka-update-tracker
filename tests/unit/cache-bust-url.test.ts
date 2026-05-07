import type { MockInstance } from 'vitest';
import { cacheBustUrl } from '../../site/js/utils.js';

describe('cacheBustUrl', () => {
  let nowSpy: MockInstance;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('appends ?t=<Date.now()> to a bare path', () => {
    expect(cacheBustUrl('data/current.json')).toBe('data/current.json?t=1700000000000');
  });

  it('uses a fresh Date.now() on each call', () => {
    expect(cacheBustUrl('a')).toBe('a?t=1700000000000');
    nowSpy.mockReturnValue(1800000000000);
    expect(cacheBustUrl('a')).toBe('a?t=1800000000000');
  });

  it('returns a URL where ?t= immediately follows the input', () => {
    expect(cacheBustUrl('site-version.txt')).toMatch(/^site-version\.txt\?t=\d+$/);
  });
});

import {
  withRetry,
  RETRY_GITHUB,
  RETRY_WEBHOOK,
  RETRY_STATUS_PROBE,
} from '../../src/utils/retry';

describe('retry profiles', () => {
  it('RETRY_GITHUB matches the previously-implicit github.ts defaults', () => {
    expect(RETRY_GITHUB).toEqual({
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
    });
  });

  it('RETRY_WEBHOOK matches slack.ts inline values', () => {
    expect(RETRY_WEBHOOK).toEqual({
      maxRetries: 3,
      baseDelayMs: 1000,
    });
  });

  it('RETRY_STATUS_PROBE matches status.ts inline values', () => {
    expect(RETRY_STATUS_PROBE).toEqual({
      maxRetries: 2,
      baseDelayMs: 2000,
    });
  });
});

describe('withRetry', () => {
  // The retry helper checks process.env.NODE_ENV === 'test' to use 1ms delays
  // in tests; jest sets it but tests/setup.ts may override. Force it here.
  const originalNodeEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the result on first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, RETRY_STATUS_PROBE);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until success', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom1'))
      .mockRejectedValueOnce(new Error('boom2'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, RETRY_GITHUB);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting maxRetries (RETRY_GITHUB → 4 total attempts)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent'));
    await expect(withRetry(fn, RETRY_GITHUB)).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(RETRY_GITHUB.maxRetries + 1);
  });

  it('honors RETRY_STATUS_PROBE (3 total attempts)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('probe-fail'));
    await expect(withRetry(fn, RETRY_STATUS_PROBE)).rejects.toThrow('probe-fail');
    expect(fn).toHaveBeenCalledTimes(RETRY_STATUS_PROBE.maxRetries + 1);
  });

  it('honors RETRY_WEBHOOK (4 total attempts)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('hook-fail'));
    await expect(withRetry(fn, RETRY_WEBHOOK)).rejects.toThrow('hook-fail');
    expect(fn).toHaveBeenCalledTimes(RETRY_WEBHOOK.maxRetries + 1);
  });

  it('preserves the existing default of 4 total attempts when called without options', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('default-fail'));
    await expect(withRetry(fn)).rejects.toThrow('default-fail');
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('wraps non-Error throwables', async () => {
    const fn = jest.fn().mockRejectedValue('string-thrown');
    await expect(withRetry(fn, RETRY_STATUS_PROBE)).rejects.toThrow('string-thrown');
  });
});

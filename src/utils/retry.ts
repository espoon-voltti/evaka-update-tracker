export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/** GitHub API calls: 4 total attempts, 1s base, exponential up to 10s. */
export const RETRY_GITHUB: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/** Slack / generic webhook deliveries: 4 total attempts, 1s base. */
export const RETRY_WEBHOOK: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

/** Per-instance status endpoint probes: 3 total attempts, 2s base. */
export const RETRY_STATUS_PROBE: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 2000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === opts.maxRetries) break;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt),
        opts.maxDelayMs ?? 10000
      );
      const effectiveDelay = process.env.NODE_ENV === 'test' ? 1 : delay;
      await new Promise((resolve) => setTimeout(resolve, effectiveDelay));
    }
  }

  throw lastError;
}

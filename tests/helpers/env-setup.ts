/**
 * Wire up jest beforeEach/afterEach hooks that clear the given env vars
 * before each test and restore their original values afterwards.
 * Tests that need a specific value can `process.env.X = '...'` inline.
 */
export function setupEnvCleanup(vars: readonly string[]): void {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of vars) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of vars) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });
}

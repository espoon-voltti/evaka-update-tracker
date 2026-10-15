import {
  settingsKey,
  lambdaError,
  filesUrl,
  joinDayFiles,
  fetchFiles,
  MetricsError,
} from '../../site/js/metrics/client.js';

const from = Date.parse('2026-10-05T12:00:00Z');
const to = Date.parse('2026-10-06T12:00:00Z');

describe('lambdaError', () => {
  it('maps 401 to unauthorized', () => {
    expect(lambdaError(401).kind).toBe('unauthorized');
  });

  it('maps 5xx and other statuses to unavailable with the status in the detail', () => {
    expect(lambdaError(503)).toMatchObject({ kind: 'unavailable', detail: 'HTTP 503' });
    expect(lambdaError(400).kind).toBe('unavailable');
  });
});

describe('filesUrl', () => {
  it('appends /files with ISO from and to, without a double slash', () => {
    expect(filesUrl('https://x.lambda-url.on.aws/', from, to)).toBe(
      'https://x.lambda-url.on.aws/files?from=2026-10-05T12%3A00%3A00.000Z&to=2026-10-06T12%3A00%3A00.000Z'
    );
  });
});

describe('joinDayFiles', () => {
  it('joins slots sorted by t, trims to [from, to) and skips missing files', () => {
    const day2 = {
      series: { 'rds.cpu': { type: 'gaugeSummary' } },
      slots: [
        { t: '2026-10-06T12:00:00Z', a: 9 },
        { t: '2026-10-06T00:05:00Z', a: 2 },
      ],
    };
    const day1 = {
      series: { a: { type: 'counter' } },
      slots: [
        { t: '2026-10-05T11:55:00Z', a: 0 },
        { t: '2026-10-05T23:55:00Z', a: 1 },
      ],
    };
    const joined = joinDayFiles([day2, null, day1], from, to);
    expect(joined.slots.map((s) => s.t)).toEqual(['2026-10-05T23:55:00Z', '2026-10-06T00:05:00Z']);
    expect(Object.keys(joined.series).sort()).toEqual(['a', 'rds.cpu']);
  });
});

describe('fetchFiles', () => {
  const storage = new Map<string, string>();
  const lambdaCalls: string[] = [];
  let s3Responses: Record<string, number[]>;

  function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status });
  }

  beforeEach(() => {
    storage.clear();
    lambdaCalls.length = 0;
    storage.set(settingsKey('espoo'), JSON.stringify({ url: 'https://fn.test', token: 'secret' }));
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null });
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (url.startsWith('https://fn.test/files')) {
        lambdaCalls.push(new Headers(init?.headers).get('Authorization') || '');
        const n = lambdaCalls.length;
        return jsonResponse(200, {
          files: ['5min/2026/10/05.json', '5min/2026/10/06.json'].map((key) => ({
            key,
            url: `https://s3.test/${key}?sig=${n}`,
          })),
        });
      }
      const key = url.replace('https://s3.test/', '').split('?')[0];
      const status = s3Responses[key].shift() ?? 500;
      return status === 200 ? jsonResponse(200, { series: {}, slots: [] }) : new Response('', { status });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and treats a 404 file as missing', async () => {
    s3Responses = { '5min/2026/10/05.json': [404], '5min/2026/10/06.json': [200] };
    const files = await fetchFiles('espoo', from, to);
    expect(lambdaCalls).toEqual(['Bearer secret']);
    expect(files.get('5min/2026/10/05.json')).toBeNull();
    expect(files.get('5min/2026/10/06.json')).toEqual({ series: {}, slots: [] });
  });

  it('gets new URLs once when S3 answers 403', async () => {
    s3Responses = { '5min/2026/10/05.json': [200], '5min/2026/10/06.json': [403, 200] };
    const files = await fetchFiles('espoo', from, to);
    expect(lambdaCalls).toHaveLength(2);
    expect(files.get('5min/2026/10/06.json')).not.toBeNull();
  });

  it('fails when a file is still refused after new URLs', async () => {
    s3Responses = { '5min/2026/10/05.json': [200], '5min/2026/10/06.json': [403, 403] };
    await expect(fetchFiles('espoo', from, to)).rejects.toMatchObject({ kind: 'unavailable' });
    expect(lambdaCalls).toHaveLength(2);
  });

  it('throws unauthorized on 401 from the Lambda', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":"unauthorized"}', { status: 401 }));
    const error = await fetchFiles('espoo', from, to).catch((e) => e);
    expect(error).toBeInstanceOf(MetricsError);
    expect(error.kind).toBe('unauthorized');
  });
});

import * as fs from 'fs';
import {
  loadNameCache,
  saveNameCache,
  resolveNames,
  UserNameCache,
} from '../../src/services/name-resolver';
import { PullRequest } from '../../src/types';

jest.mock('fs');
const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockedWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;

function makePR(author: string, isBot: boolean = false): PullRequest {
  return {
    number: 1,
    title: 'Test PR',
    author,
    authorName: null,
    mergedAt: '2026-03-13T10:00:00Z',
    repository: 'espoon-voltti/evaka',
    repoType: 'core',
    isBot,
    isHidden: isBot,
    url: `https://github.com/espoon-voltti/evaka/pull/1`,
    labels: [],
  };
}

describe('loadNameCache', () => {
  it('returns parsed JSON from file', () => {
    mockedReadFileSync.mockReturnValue('{"akheron": "Petri Lehtinen"}');
    const cache = loadNameCache('/data/user-names.json');
    expect(cache).toEqual({ akheron: 'Petri Lehtinen' });
  });

  it('returns empty object when file does not exist', () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const cache = loadNameCache('/data/user-names.json');
    expect(cache).toEqual({});
  });
});

describe('saveNameCache', () => {
  it('writes cache as formatted JSON', () => {
    const cache: UserNameCache = { akheron: 'Petri Lehtinen', otheruser: null };
    saveNameCache('/data/user-names.json', cache);
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      '/data/user-names.json',
      JSON.stringify(cache, null, 2)
    );
  });
});

describe('resolveNames', () => {
  it('uses cached name when available', async () => {
    const pr = makePR('akheron');
    const cache: UserNameCache = { akheron: 'Petri Lehtinen' };
    const getUser = jest.fn();

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBe('Petri Lehtinen');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('uses cached null (no profile name) without re-fetching', async () => {
    const pr = makePR('noname-user');
    const cache: UserNameCache = { 'noname-user': null };
    const getUser = jest.fn();

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('fetches name from API for uncached author and updates cache', async () => {
    const pr = makePR('newdev');
    const cache: UserNameCache = {};
    const getUser = jest.fn().mockResolvedValue('New Developer');

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBe('New Developer');
    expect(cache['newdev']).toBe('New Developer');
    expect(getUser).toHaveBeenCalledWith('newdev');
  });

  it('caches null when API returns null (no profile name)', async () => {
    const pr = makePR('anonymous');
    const cache: UserNameCache = {};
    const getUser = jest.fn().mockResolvedValue(null);

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBeNull();
    expect(cache['anonymous']).toBeNull();
  });

  it('skips bot PRs without API call', async () => {
    const pr = makePR('dependabot[bot]', true);
    const cache: UserNameCache = {};
    const getUser = jest.fn();

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
    expect(cache).toEqual({});
  });

  it('leaves authorName null and does not cache on API failure', async () => {
    const pr = makePR('failuser');
    const cache: UserNameCache = {};
    const getUser = jest.fn().mockRejectedValue(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await resolveNames([pr], cache, getUser);

    expect(pr.authorName).toBeNull();
    expect(cache).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('resolves multiple PRs, calling API only for uncached authors', async () => {
    const prs = [
      makePR('cached-dev'),
      makePR('new-dev'),
      makePR('dependabot[bot]', true),
      makePR('new-dev'), // duplicate author
    ];
    const cache: UserNameCache = { 'cached-dev': 'Cached Developer' };
    const getUser = jest.fn().mockResolvedValue('New Dev Name');

    await resolveNames(prs, cache, getUser);

    expect(prs[0].authorName).toBe('Cached Developer');
    expect(prs[1].authorName).toBe('New Dev Name');
    expect(prs[2].authorName).toBeNull();
    expect(prs[3].authorName).toBe('New Dev Name'); // now in cache from prs[1]
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith('new-dev');
  });
});

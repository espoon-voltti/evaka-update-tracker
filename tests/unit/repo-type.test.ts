import { partitionByRepoType } from '../../src/utils/repo-type';

interface RepoTyped {
  repoType: 'core' | 'wrapper';
  id: number;
}

const item = (id: number, repoType: 'core' | 'wrapper'): RepoTyped => ({ id, repoType });

describe('partitionByRepoType', () => {
  it('returns empty arrays for empty input', () => {
    expect(partitionByRepoType([])).toEqual({ core: [], wrapper: [] });
  });

  it('routes core items into core[] and wrapper items into wrapper[]', () => {
    const items = [item(1, 'core'), item(2, 'wrapper'), item(3, 'core')];
    const { core, wrapper } = partitionByRepoType(items);
    expect(core.map((i) => i.id)).toEqual([1, 3]);
    expect(wrapper.map((i) => i.id)).toEqual([2]);
  });

  it('preserves the original input order within each bucket', () => {
    const items = [
      item(10, 'wrapper'),
      item(20, 'core'),
      item(30, 'wrapper'),
      item(40, 'core'),
    ];
    const { core, wrapper } = partitionByRepoType(items);
    expect(wrapper.map((i) => i.id)).toEqual([10, 30]);
    expect(core.map((i) => i.id)).toEqual([20, 40]);
  });

  it('returns one empty bucket when all items share a single repoType', () => {
    const allCore = [item(1, 'core'), item(2, 'core')];
    const { core, wrapper } = partitionByRepoType(allCore);
    expect(core).toHaveLength(2);
    expect(wrapper).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const items = [item(1, 'core'), item(2, 'wrapper')];
    const snapshot = [...items];
    partitionByRepoType(items);
    expect(items).toEqual(snapshot);
  });

  it('returns references to the same item objects (no copying)', () => {
    const a = item(1, 'core');
    const b = item(2, 'wrapper');
    const { core, wrapper } = partitionByRepoType([a, b]);
    expect(core[0]).toBe(a);
    expect(wrapper[0]).toBe(b);
  });
});

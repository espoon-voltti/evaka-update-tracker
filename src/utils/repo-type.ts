/**
 * Partition an array of repoType-tagged objects into separate `core` and
 * `wrapper` buckets in a single pass. Order within each bucket matches the
 * input. Items with unrecognized `repoType` values are dropped.
 */
export function partitionByRepoType<T extends { repoType: 'core' | 'wrapper' }>(
  items: ReadonlyArray<T>
): { core: T[]; wrapper: T[] } {
  const core: T[] = [];
  const wrapper: T[] = [];
  for (const item of items) {
    if (item.repoType === 'core') {
      core.push(item);
    } else if (item.repoType === 'wrapper') {
      wrapper.push(item);
    }
  }
  return { core, wrapper };
}
